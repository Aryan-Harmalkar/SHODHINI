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

  useEffect(() => {
    async function init() {
      // Resolve user if not passed
      let activeUser = currentUser;
      if (!activeUser) {
        activeUser = await getCurrentUser();
        setCurrentUser(activeUser);
      }

      // Fetch areas
      const list = await getAreas();
      setAreas(list);

      // Default area to citizen profile area, fallback to first area
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
        setLocationStatus('Location permission denied. You can still submit with the selected Ward.');
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
        setLocationStatus('GPS Coordinates captured successfully!');
      }
    } catch (e) {
      console.warn('GPS location capture warning:', e);
      setLocationStatus('Could not retrieve GPS coordinates. Defaulting to selected Ward.');
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
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={onOpenSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>File a Complaint</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={onBackToHome}>
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

            {/* Category Selection */}
            <Text style={styles.fieldLabel}>Select Waste Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Area / Ward Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Area / Ward Location</Text>
              <TouchableOpacity
                style={styles.areaSelectBtn}
                onPress={() => setAreaModalVisible(true)}
              >
                <Text style={styles.areaSelectBtnText}>
                  📍 {selectedAreaName || 'Select Ward'}
                </Text>
                <Text style={styles.areaSelectBtnArrow}>Change ▼</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>
                Defaults to your home area, but you can select any ward.
              </Text>
            </View>

            {/* Description Textarea */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the issue, landmarks, volume of waste, or urgent details..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* GPS Location (Optional) */}
            <View style={styles.locationSection}>
              <Text style={styles.fieldLabel}>GPS Coordinates (Optional)</Text>
              <View style={styles.locationRow}>
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={handleGetLocation}
                  disabled={fetchingLocation}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#2e7d32" />
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
                  >
                    <Text style={styles.clearGpsText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {locationCoords && (
                <Text style={styles.coordDisplay}>
                  Latitude: {locationCoords.latitude.toFixed(5)}, Longitude:{' '}
                  {locationCoords.longitude.toFixed(5)}
                </Text>
              )}

              {locationStatus ? (
                <Text
                  style={[
                    styles.locationStatusText,
                    locationCoords ? styles.statusSuccess : styles.statusNotice,
                  ]}
                >
                  {locationStatus}
                </Text>
              ) : null}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Complaint 🚀</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Ward Selection Modal */}
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
                  >
                    <Text
                      style={[
                        styles.areaOptionText,
                        isSelected && styles.areaOptionTextSelected,
                      ]}
                    >
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
    backgroundColor: '#f4f6f8',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 6,
    marginRight: 8,
  },
  menuIcon: {
    fontSize: 22,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
  },
  homeBtn: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  homeBtnText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  formHeader: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  categoryPillActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  categoryPillText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  areaSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  areaSelectBtnText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  areaSelectBtnArrow: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    minHeight: 90,
  },
  locationSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gpsBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  gpsBtnText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 13,
  },
  clearGpsBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearGpsText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
  },
  coordDisplay: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
    marginTop: 6,
  },
  locationStatusText: {
    fontSize: 12,
    marginTop: 4,
  },
  statusSuccess: {
    color: '#2e7d32',
  },
  statusNotice: {
    color: '#666',
  },
  submitBtn: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalList: {
    marginBottom: 10,
  },
  areaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  areaOptionSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  areaOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  areaOptionTextSelected: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  areaCheck: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
