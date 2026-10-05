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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tokens, useTheme } from '../lib/theme';
import { verifyCleanupWithGemini } from '../lib/aiVision';
import { getComplaintDetails } from '../db/database';

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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

export default function CleanupVerifyModal({
  visible,
  complaint,
  onClose,
  onConfirmDone,
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [citizenDetails, setCitizenDetails] = useState(null);
  const [beforeImageBase64, setBeforeImageBase64] = useState(null);
  const [afterImageUri, setAfterImageUri] = useState(null);
  const [afterImageBase64, setAfterImageBase64] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [locMessage, setLocMessage] = useState('');
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [afterCapturedAt, setAfterCapturedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setBeforeImageBase64(null);
    setAfterImageUri(null);
    setAfterImageBase64(null);
    setVerificationResult(null);
    setLocMessage('');
    setCitizenDetails(null);
    setAfterCapturedAt(null);
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
        if (details?.citizen_image_base64) {
          setBeforeImageBase64(details.citizen_image_base64);
        } else {
          Alert.alert('Notice', 'No before image available for this complaint. Proceed with capture anyway.');
        }
      })
      .catch((err) => {
        console.warn('Could not fetch before image', err);
      })
      .finally(() => {
        if (isMounted) setIsFetchingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, complaint]);

  if (!visible || !complaint) return null;

  const handleTakeAfterPhoto = async () => {
    try {
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== 'granted') {
        throw new Error('Camera permission is required to take photo.');
      }

      setLocMessage('');

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAfterImageUri(asset.uri);
        setAfterImageBase64(asset.base64);
        setAfterCapturedAt(new Date().toISOString());

        if (asset.base64) {
          setIsVerifying(true);
          setVerificationResult(null);
          setLocMessage('Verifying cleanup with AI Vision (<2s)...');
          try {
            const res = await verifyCleanupWithGemini({
              beforeBase64: beforeImageBase64,
              afterBase64: asset.base64,
            });
            setVerificationResult(res);
          } catch (err) {
            console.warn('AI verification error:', err);
            setVerificationResult({
              isCleaned: false,
              isSameLocation: false,
              rejectionReason:
                err?.message ||
                'Could not complete AI verification. Please tap "Retake Photo" to try again, or use "Attest & Pass" to confirm on-site.',
            });
          } finally {
            setIsVerifying(false);
            setLocMessage('');
          }
        }
      } else {
        setLocMessage('');
      }
    } catch (err) {
      setLocMessage('');
      Alert.alert('Verification Error', err.message);
    }
  };

  const executeConfirm = async () => {
    setSubmitting(true);
    try {
      const resolvedAt = afterCapturedAt || new Date().toISOString();
      await onConfirmDone({
        complaintId: complaint.id,
        afterImageBase64,
        resolvedAt,
      });
      handleClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not complete verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (
      verificationResult &&
      (!verificationResult.isCleaned || !verificationResult.isSameLocation) &&
      !verificationResult.attested
    ) {
      Alert.alert(
        'Verification Notice',
        verificationResult.rejectionReason || 'AI could not fully verify from this camera angle.',
        [
          { text: 'Retake Photo', onPress: handleTakeAfterPhoto },
          {
            text: 'Attest Clean & Complete',
            onPress: () => {
              setVerificationResult({ isCleaned: true, isSameLocation: true, attested: true });
              executeConfirm();
            },
          },
        ]
      );
      return;
    }

    await executeConfirm();
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Verify Cleanup</Text>
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
              <Text style={{ marginTop: 10, color: colors.muted }}>Loading report details...</Text>
            </View>
          ) : (
            <>
              {/* Citizen report details */}
              <View style={styles.reportPanel}>
                <Text style={styles.reportPanelTitle}>📋 Citizen Report</Text>
                <Text style={styles.reportRow}>
                  📍 {citizenDetails?.location || complaint?.location || 'Unknown address'}
                </Text>
                <Text style={styles.reportRow}>
                  🛰️ GPS:{' '}
                  {citizenDetails?.latitude != null && citizenDetails?.longitude != null
                    ? `${Number(citizenDetails.latitude).toFixed(5)}, ${Number(citizenDetails.longitude).toFixed(5)}`
                    : 'Not available'}
                </Text>
                <Text style={styles.reportRow}>
                  🕒 Reported: {formatTimestamp(citizenDetails?.created_at || complaint?.created_at)}
                </Text>
                {!!citizenDetails?.description && (
                  <Text style={styles.reportRow}>📝 {citizenDetails.description}</Text>
                )}
                {citizenDetails?.latitude != null && citizenDetails?.longitude != null && (
                  <TouchableOpacity
                    style={styles.reportNavBtn}
                    onPress={() => handleOpenMaps(citizenDetails.latitude, citizenDetails.longitude, citizenDetails.location)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reportNavText}>Navigate to Spot 🗺️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>Before</Text>
                  {beforeImageBase64 ? (
                    <Image
                      source={{ uri: `data:image/jpeg;base64,${beforeImageBase64}` }}
                      style={styles.compareImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.compareImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }]}>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>No Image</Text>
                    </View>
                  )}
                </View>

                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>After</Text>
                  {afterImageUri ? (
                    <Image
                      source={{ uri: afterImageUri }}
                      style={styles.compareImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <TouchableOpacity style={styles.captureBtn} onPress={handleTakeAfterPhoto} activeOpacity={0.8}>
                      <Text style={styles.captureBtnText}>📷 Take Cleaned Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {locMessage !== '' && (
                <Text style={{ textAlign: 'center', marginTop: 10, color: colors.muted, fontSize: 12 }}>
                  {locMessage}
                </Text>
              )}

              {afterImageUri && (
                <View style={{ marginTop: 20 }}>
                  {isVerifying ? (
                    <View style={styles.verifyingBox}>
                      <ActivityIndicator size="small" color="#0ea5e9" />
                      <Text style={styles.verifyingText}>AI is verifying the cleanup (fast)...</Text>
                    </View>
                  ) : verificationResult ? (
                    verificationResult.isCleaned && verificationResult.isSameLocation ? (
                      <View style={styles.successBox}>
                        <Text style={styles.successBoxText}>
                          {verificationResult.attested
                            ? '⚡ Cleaned & Attested by Collector'
                            : '✅ Cleanup Verified by AI!'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorBoxText}>⚠️ AI Verification Notice</Text>
                        <Text style={styles.errorReasonText}>
                          {verificationResult.rejectionReason || 'AI could not fully verify from this camera angle.'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                          <TouchableOpacity
                            style={[styles.retryBtn, { flex: 1 }]}
                            onPress={handleTakeAfterPhoto}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.retryBtnText}>📸 Retake Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.retryBtn,
                              { flex: 1, backgroundColor: '#22c55e', borderColor: '#22c55e' },
                            ]}
                            onPress={() =>
                              setVerificationResult({ isCleaned: true, isSameLocation: true, attested: true })
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.retryBtnText, { color: '#ffffff' }]}>⚡ Attest & Pass</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.confirmDoneBtn,
                      (!afterImageUri || isVerifying || submitting) && {
                        opacity: 0.5,
                      },
                    ]}
                    disabled={!afterImageUri || isVerifying || submitting}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.confirmDoneBtnText}>Submit & Complete Job</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      zIndex: 9999,
      elevation: 9999,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      width: '100%',
      maxHeight: '92%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
      elevation: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalCloseText: {
      fontSize: tokens.typography.size.lg,
      color: colors.muted,
      fontWeight: 'bold',
    },
    modalScroll: {
      flex: 1,
      width: '100%',
    },
    modalScrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    reportPanel: {
      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#f0f9ff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : '#bae6fd',
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    reportPanelTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: isDark ? '#38bdf8' : '#0369a1',
      marginBottom: 6,
    },
    reportRow: {
      fontSize: 12,
      color: colors.text,
      marginBottom: 3,
    },
    reportNavBtn: {
      marginTop: 8,
      backgroundColor: isDark ? '#0284c7' : '#0284c7',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.lg,
      alignSelf: 'flex-start',
    },
    reportNavText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    compareRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    compareCol: {
      flex: 1,
    },
    compareLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 4,
      color: colors.text,
      textAlign: 'center',
    },
    compareImage: {
      width: '100%',
      height: 120,
      borderRadius: tokens.radius.xl,
      backgroundColor: colors.surface,
    },
    captureBtn: {
      width: '100%',
      height: 120,
      borderRadius: tokens.radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureBtnText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: 'bold',
    },
    gpsBox: {
      marginTop: 12,
      padding: 10,
      borderRadius: tokens.radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    gpsBoxOk: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
      borderColor: isDark ? 'rgba(34, 197, 94, 0.4)' : '#bbf7d0',
    },
    gpsBoxBad: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#fecaca',
    },
    gpsTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text,
    },
    gpsSub: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    verifyingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e0f2fe',
      borderRadius: tokens.radius.xl,
    },
    verifyingText: {
      marginLeft: 8,
      color: isDark ? '#38bdf8' : '#0284c7',
      fontWeight: 'bold',
    },
    successBox: {
      padding: 12,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
      borderRadius: tokens.radius.xl,
      alignItems: 'center',
    },
    successBoxText: {
      color: isDark ? '#4ade80' : '#166534',
      fontWeight: 'bold',
    },
    errorBox: {
      padding: 12,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
      borderRadius: tokens.radius.xl,
      alignItems: 'center',
    },
    errorBoxText: {
      color: isDark ? '#f87171' : '#991b1b',
      fontWeight: 'bold',
    },
    errorReasonText: {
      color: isDark ? '#fca5a5' : '#991b1b',
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: '#b91c1c',
      borderRadius: tokens.radius.lg,
    },
    retryBtnText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    confirmDoneBtn: {
      marginTop: 16,
      backgroundColor: colors.accent,
      padding: 14,
      borderRadius: tokens.radius.xl,
      alignItems: 'center',
    },
    confirmDoneBtnText: {
      color: isDark ? '#000000' : '#ffffff',
      fontWeight: 'bold',
      fontSize: tokens.typography.size.sm,
    },
  });
