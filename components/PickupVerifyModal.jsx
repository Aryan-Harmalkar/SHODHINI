import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { tokens, useTheme } from '../lib/theme';
import { getComplaintDetails } from '../db/database';

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

// Haversine great-circle distance in metres
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function handleOpenMaps(lat, lng, address) {
  if (lat && lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Map Error', 'Could not open map navigation.');
    });
  } else {
    const query = encodeURIComponent(`${address || 'Assagao'}, Goa`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Map Error', 'Could not open map navigation.');
    });
  }
}

export default function PickupVerifyModal({
  visible,
  complaint,
  onClose,
  onConfirmDone,
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [citizenDetails, setCitizenDetails] = useState(null);
  const [garbageImageUri, setGarbageImageUri] = useState(null);
  const [garbageImageBase64, setGarbageImageBase64] = useState(null);
  const [locMessage, setLocMessage] = useState('');
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isVerifyingLoc, setIsVerifyingLoc] = useState(false);
  const [locationValid, setLocationValid] = useState(false);
  const [capturedAt, setCapturedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setGarbageImageUri(null);
    setGarbageImageBase64(null);
    setLocMessage('');
    setCitizenDetails(null);
    setCapturedAt(null);
    setLocationValid(false);
    setSubmitting(false);
    onClose();
  };

  useEffect(() => {
    if (!visible || !complaint?.id) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setIsFetchingDetails(true);
    });

    getComplaintDetails(complaint.id)
      .then((details) => {
        if (!isMounted) return;
        setCitizenDetails(details || complaint);
      })
      .catch((err) => {
        console.warn('Could not fetch complaint details', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, complaint]);

  if (!visible || !complaint) return null;

  const handleTakePhotoAndVerifyLocation = async () => {
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== 'granted') {
        throw new Error('Camera permission is required to take photo.');
      }

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        throw new Error('Location permission is required to verify pickup.');
      }

      setLocMessage('');
      setIsVerifyingLoc(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setGarbageImageUri(asset.uri);
        setGarbageImageBase64(asset.base64);
        setCapturedAt(new Date().toISOString());

        setLocMessage('Verifying your location against pickup address...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const cLat = location.coords.latitude;
        const cLon = location.coords.longitude;
        const targetLat = citizenDetails?.latitude || complaint?.latitude;
        const targetLon = citizenDetails?.longitude || complaint?.longitude;

        if (targetLat && targetLon) {
          const dist = getDistanceMeters(cLat, cLon, targetLat, targetLon);
          if (dist <= 150) { // allow 150m radius
            setLocationValid(true);
            setLocMessage(`Location verified! You are ${Math.round(dist)}m away.`);
          } else {
            setLocationValid(false);
            setLocMessage(`Location mismatch: You are ${Math.round(dist)}m away. Expected < 150m.`);
          }
        } else {
          // If the doorstep pickup didn't have GPS coordinates (legacy data), just bypass
          setLocationValid(true);
          setLocMessage('Location verified (no target coordinates on record).');
        }
      }
    } catch (err) {
      setLocMessage('');
      Alert.alert('Verification Error', err.message);
    } finally {
      setIsVerifyingLoc(false);
    }
  };

  const executeConfirm = async () => {
    setSubmitting(true);
    try {
      const resolvedAt = capturedAt || new Date().toISOString();
      await onConfirmDone({
        complaintId: complaint.id,
        afterImageBase64: garbageImageBase64,
        resolvedAt,
      });
      handleClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not complete pickup.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!locationValid) {
      Alert.alert(
        'Location Mismatch',
        locMessage || 'Your location could not be verified against the pickup spot.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Override & Complete',
            onPress: executeConfirm,
          },
        ]
      );
      return;
    }

    await executeConfirm();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Doorstep Pickup</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {isFetchingDetails ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
                <Text style={{ marginTop: 10, color: colors.muted }}>Loading pickup details...</Text>
              </View>
            ) : (
              <>
                <View style={styles.reportPanel}>
                  <Text style={styles.reportPanelTitle}>📋 Pickup Details</Text>
                  <Text style={styles.reportRow}>
                    📍 {citizenDetails?.location || complaint?.location || 'Unknown address'}
                  </Text>
                  <Text style={styles.reportRow}>
                    👤 {citizenDetails?.citizen_name || complaint?.citizenName || 'Citizen'}
                  </Text>
                  {!!citizenDetails?.description && (
                    <Text style={styles.reportRow}>📝 {citizenDetails.description}</Text>
                  )}
                  {citizenDetails?.latitude != null && citizenDetails?.longitude != null && (
                    <TouchableOpacity
                      style={styles.reportNavBtn}
                      onPress={() =>
                        handleOpenMaps(
                          citizenDetails.latitude,
                          citizenDetails.longitude,
                          citizenDetails.location
                        )
                      }
                    >
                      <Text style={styles.reportNavBtnText}>🗺️ Open in Maps</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.captureSection}>
                  <Text style={styles.captureTitle}>Garbage & Location Verification</Text>
                  <Text style={styles.captureSub}>
                    Take a clear photo of the collected scrap/waste. We will automatically verify your GPS coordinates to confirm pickup.
                  </Text>

                  {!garbageImageUri ? (
                    <TouchableOpacity
                      style={styles.captureBtn}
                      onPress={handleTakePhotoAndVerifyLocation}
                      disabled={isVerifyingLoc}
                    >
                      {isVerifyingLoc ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.captureBtnText}>📸 Capture Garbage & Verify</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: garbageImageUri }} style={styles.previewImg} />
                      <View style={styles.previewActions}>
                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={handleTakePhotoAndVerifyLocation}
                          disabled={submitting || isVerifyingLoc}
                        >
                          <Text style={styles.retakeBtnText}>↺ Retake</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {!!locMessage && (
                    <View style={[styles.aiResultBox, locationValid ? styles.aiResultPass : styles.aiResultFail]}>
                      <Text style={[styles.aiResultTitle, { color: locationValid ? '#15803d' : '#991b1b' }]}>
                        {locationValid ? '✅ LOCATION MATCHED' : '⚠️ LOCATION MISMATCH'}
                      </Text>
                      <Text style={styles.aiResultText}>{locMessage}</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!garbageImageUri || submitting) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!garbageImageUri || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Submit Pickup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: tokens.radius.xl,
      borderTopRightRadius: tokens.radius.xl,
      height: '85%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: tokens.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: tokens.typography.size.lg,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalCloseText: {
      fontSize: 20,
      color: colors.muted,
      fontFamily: tokens.typography.family.bold,
    },
    modalScroll: {
      flex: 1,
    },
    modalScrollContent: {
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xxl,
    },
    reportPanel: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
      padding: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      marginBottom: tokens.spacing.xl,
    },
    reportPanelTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 8,
    },
    reportRow: {
      fontSize: tokens.typography.size.sm,
      color: colors.textSecondary,
      marginBottom: 6,
      lineHeight: 20,
    },
    reportNavBtn: {
      marginTop: 8,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: isDark ? '#334155' : '#e2e8f0',
      borderRadius: tokens.radius.sm,
    },
    reportNavBtnText: {
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      fontFamily: tokens.typography.family.bold,
    },
    captureSection: {
      marginBottom: tokens.spacing.xl,
    },
    captureTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 6,
    },
    captureSub: {
      fontSize: tokens.typography.size.xs,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 18,
    },
    captureBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
    },
    captureBtnText: {
      color: colors.background,
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
    },
    previewContainer: {
      position: 'relative',
      borderRadius: tokens.radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      aspectRatio: 4 / 3,
    },
    previewImg: {
      width: '100%',
      height: '100%',
    },
    previewActions: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      gap: 8,
    },
    retakeBtn: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.sm,
    },
    retakeBtnText: {
      color: '#fff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    aiResultBox: {
      marginTop: tokens.spacing.md,
      padding: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
    },
    aiResultPass: {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
    },
    aiResultFail: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
    },
    aiResultTitle: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      marginBottom: 6,
    },
    aiResultText: {
      fontSize: tokens.typography.size.xs,
      color: '#333',
      lineHeight: 18,
    },
    modalFooter: {
      padding: tokens.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    confirmBtn: {
      backgroundColor: '#16a34a',
      paddingVertical: 14,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
    },
    confirmBtnDisabled: {
      backgroundColor: isDark ? '#334155' : '#cbd5e1',
    },
    confirmBtnText: {
      color: '#ffffff',
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
    },
  });
