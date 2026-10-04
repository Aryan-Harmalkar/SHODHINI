import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { fileComplaint, getAreas, getCurrentUser } from '../db/database';
import { tokens } from '../lib/theme';

const CATEGORIES = [
  'Roadside waste',
  'Overflowing bin',
  'Dead animal',
  'Construction debris',
  'Other',
];

export default function FileComplaintScreen({ user, onBackToHome, onOpenSidebar }) {
  const [currentUser, setCurrentUser] = useState(user || null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  // GPS coordinates
  const [locationCoords, setLocationCoords] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Form states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    async function init() {
      let activeUser = currentUser;
      if (!activeUser) {
        activeUser = await getCurrentUser();
        setCurrentUser(activeUser);
      }

      const list = await getAreas();
      setAreas(list);

      if (activeUser?.area_id) {
        const found = list.find((a) => a.id === activeUser.area_id);
        setSelectedAreaId(activeUser.area_id);
        setSelectedAreaName(found?.name || `Ward ${activeUser.area_id}`);
      } else if (list.length > 0) {
        setSelectedAreaId(list[0].id);
        setSelectedAreaName(list[0].name);
      }
    }

    init();
  }, []);

  const handleGetLocation = async () => {
    setLocationStatus('');
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Location permission denied.');
        setFetchingLocation(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (position?.coords) {
        setLocationCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('GPS Coordinates captured!');
      }
    } catch (e) {
      console.warn('GPS location capture warning:', e);
      setLocationStatus('Could not retrieve GPS coordinates.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!description.trim()) {
      setErrorMessage('Please describe the waste problem or issue.');
      return;
    }

    if (!selectedAreaId) {
      setErrorMessage('Please select the ward or area where the waste is located.');
      return;
    }

    const citizenId = currentUser?.id;
    if (!citizenId) {
      setErrorMessage('User session expired. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      await fileComplaint({
        citizenId,
        areaId: selectedAreaId,
        category,
        description: description.trim(),
        latitude: locationCoords?.latitude || null,
        longitude: locationCoords?.longitude || null,
      });

      setSuccess(true);
      setTimeout(() => {
        onBackToHome();
      }, 1600);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>File a Complaint</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.homeBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Complaint Submitted!</Text>
            <Text style={styles.successDesc}>
              Your report has been dispatched to collectors in {selectedAreaName}. You will earn 15 Eco Points once resolved!
            </Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formHeader}>Report Waste / Sanitation Issue</Text>
            <Text style={styles.formSubtitle}>
              Help keep your community clean. Sanitation workers assigned to your ward will be notified immediately.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Select Waste Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Area / Ward Location</Text>
              <TouchableOpacity
                style={styles.areaSelectBtn}
                onPress={() => setAreaModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.areaSelectBtnText}>
                  📍 {selectedAreaName || 'Select Ward'}
                </Text>
                <Text style={styles.areaSelectBtnArrow}>Change ▼</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>Defaults to your home area, but you can select any ward.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textArea, focusedInput === 'desc' && styles.inputFocused]}
                placeholder="Describe the issue, landmarks, volume of waste, or urgent details..."
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocusedInput('desc')}
                onBlur={() => setFocusedInput(null)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.locationSection}>
              <Text style={styles.fieldLabel}>GPS Coordinates (Optional)</Text>
              <View style={styles.locationRow}>
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={handleGetLocation}
                  disabled={fetchingLocation}
                  activeOpacity={0.7}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color={tokens.colors.accent} />
                  ) : (
                    <Text style={styles.gpsBtnText}>
                      {locationCoords ? '📍 Update GPS Location' : '📍 Add GPS Location'}
                    </Text>
                  )}
                </TouchableOpacity>

                {locationCoords && (
                  <TouchableOpacity
                    style={styles.clearGpsBtn}
                    onPress={() => {
                      setLocationCoords(null);
                      setLocationStatus('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearGpsText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {locationCoords && (
                <Text style={styles.coordDisplay}>
                  Latitude: {locationCoords.latitude.toFixed(5)}, Longitude: {locationCoords.longitude.toFixed(5)}
                </Text>
              )}

              {locationStatus ? (
                <Text style={[styles.locationStatusText, locationCoords ? styles.statusSuccess : styles.statusNotice]}>
                  {locationStatus}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={tokens.colors.background} />
              ) : (
                <Text style={styles.submitBtnText}>Submit Complaint 🚀</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={areaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ward / Area</Text>
              <TouchableOpacity
                onPress={() => setAreaModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {areas.map((a) => {
                const isSelected = a.id === selectedAreaId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.areaOption, isSelected && styles.areaOptionSelected]}
                    onPress={() => {
                      setSelectedAreaId(a.id);
                      setSelectedAreaName(a.name);
                      setAreaModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.areaOptionText, isSelected && styles.areaOptionTextSelected]}>
                      📍 {a.name}
                    </Text>
                    {isSelected && <Text style={styles.areaCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: tokens.spacing.xs,
    marginRight: tokens.spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.bold,
  },
  title: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  homeBtn: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  homeBtnText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  formHeader: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  formSubtitle: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    lineHeight: 20,
    marginBottom: tokens.spacing.lg,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.size.sm,
  },
  fieldLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  categoryPill: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  categoryPillText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
  },
  categoryPillTextActive: {
    color: tokens.colors.background,
  },
  inputGroup: {
    marginBottom: tokens.spacing.lg,
  },
  areaSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    minHeight: 48,
  },
  areaSelectBtnText: {
    fontSize: tokens.typography.size.base,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.medium,
  },
  areaSelectBtnArrow: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.bold,
  },
  fieldHint: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: tokens.spacing.xs,
  },
  textArea: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.base,
    color: tokens.colors.text,
    minHeight: 120,
  },
  inputFocused: {
    borderColor: tokens.colors.borderFocus,
    borderWidth: 2,
  },
  locationSection: {
    marginBottom: tokens.spacing.lg,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  gpsBtn: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  gpsBtnText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
    fontSize: tokens.typography.size.sm,
  },
  clearGpsBtn: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  clearGpsText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
  },
  coordDisplay: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
    marginTop: tokens.spacing.sm,
  },
  locationStatusText: {
    fontSize: tokens.typography.size.xs,
    marginTop: tokens.spacing.xs,
  },
  statusSuccess: {
    color: tokens.colors.accent,
  },
  statusNotice: {
    color: tokens.colors.muted,
  },
  submitBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    ...tokens.shadow.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
  },
  successCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    ...tokens.shadow.md,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: tokens.spacing.md,
  },
  successTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
    marginBottom: tokens.spacing.sm,
  },
  successDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '60%',
    padding: tokens.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  modalTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  modalCloseBtn: {
    padding: tokens.spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.muted,
  },
  modalList: {
    marginBottom: tokens.spacing.sm,
  },
  areaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    backgroundColor: tokens.colors.surface,
    minHeight: 48,
  },
  areaOptionSelected: {
    backgroundColor: tokens.colors.background,
    borderColor: tokens.colors.accent,
    borderWidth: 1,
  },
  areaOptionText: {
    fontSize: tokens.typography.size.base,
    color: tokens.colors.text,
  },
  areaOptionTextSelected: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  areaCheck: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.base,
  },
});
