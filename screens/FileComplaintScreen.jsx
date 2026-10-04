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
  Image,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { fileComplaint, getAreas, getCurrentUser } from '../db/database';
import { tokens } from '../lib/theme';
import { analyzeWasteImageWithGemini } from '../lib/aiVision';

export default function FileComplaintScreen({ user, onBackToHome, onOpenSidebar }) {
  const [currentUser, setCurrentUser] = useState(user || null);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  // Live Photo & Live Geotag States
  const [photoUri, setPhotoUri] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [locationError, setLocationError] = useState('');

  // AI Analysis States
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Form States (Description is strictly optional)
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState(null);
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

  /**
   * Captures Live Photo using device camera and acquires live GPS geotag
   */
  const handleTakeLivePhoto = async () => {
    setErrorMessage('');
    setLocationError('');
    setCapturingPhoto(true);

    try {
      // 1. Acquire Live GPS Coordinates
      let coords = null;
      try {
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (pos?.coords) {
            coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setLocationCoords(coords);
          }
        } else {
          setLocationError('GPS permission denied. Geotag will record selected Ward.');
        }
      } catch (locErr) {
        console.warn('GPS location capture warning:', locErr);
        setLocationError('Could not fetch precise GPS. Defaulting to Ward location.');
      }

      // 2. Request Camera Permission & Launch Device Camera
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== 'granted') {
        Alert.alert(
          'Live Camera Permission',
          'Camera access is required to capture live geotagged waste photos.',
          [{ text: 'OK' }]
        );
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // 3. Immediately trigger Gemini AI Vision Analysis
        await runGeminiAnalysis(asset.base64, asset.uri);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setErrorMessage('Could not open camera. Please ensure camera permissions are allowed.');
    } finally {
      setCapturingPhoto(false);
    }
  };

  /**
   * Run Gemini Vision AI Analysis on captured photo
   */
  const runGeminiAnalysis = async (base64Data, uri) => {
    setAnalyzingAi(true);
    setErrorMessage('');

    try {
      const analysis = await analyzeWasteImageWithGemini({
        base64: base64Data,
        imageUri: uri,
      });
      setAiResult(analysis);
    } catch (err) {
      console.warn('Gemini AI Analysis warning:', err);
      setErrorMessage(err.message || 'AI analysis could not complete. Please retry.');
    } finally {
      setAnalyzingAi(false);
    }
  };

  /**
   * Submit Complaint to Garbage Collector or Admin Verification
   */
  const handleSubmit = async () => {
    setErrorMessage('');

    if (!photoUri) {
      setErrorMessage('Please capture a live photo of the waste site.');
      return;
    }

    if (!aiResult) {
      setErrorMessage('Please wait for the AI analysis to complete.');
      return;
    }

    // Reject non-waste items (living animals, humans, clean areas)
    if (!aiResult.isWaste) {
      setErrorMessage(
        aiResult.rejectionReason || 'Non-waste item detected. Complaints can only be filed for garbage or deceased animal carcasses.'
      );
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
      const isLowConfidence = aiResult.confidence < 20;

      await fileComplaint({
        citizenId,
        areaId: selectedAreaId,
        category: aiResult.category,
        description: description.trim(), // Strictly optional!
        latitude: locationCoords?.latitude || null,
        longitude: locationCoords?.longitude || null,
        aiAnalysis: aiResult,
        imageUrl: photoUri,
        requiresAdminVerification: isLowConfidence,
      });

      setSuccessData({
        isLowConfidence,
        confidence: aiResult.confidence,
        classification: aiResult.classification,
        areaName: selectedAreaName,
      });

      setTimeout(() => {
        onBackToHome();
      }, 2600);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>File Complaint</Text>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.homeBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* SUCCESS CARD */}
        {successData ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>
              {successData.isLowConfidence ? '🛡️' : '🚀'}
            </Text>
            <Text style={styles.successTitle}>
              {successData.isLowConfidence
                ? 'Submitted for Admin Verification'
                : 'Complaint Dispatched to Collector!'}
            </Text>
            <Text style={styles.successDesc}>
              {successData.isLowConfidence
                ? `AI confidence was under 20% (${successData.confidence}%). Your report has been routed to the Municipal Admin for cross-verification before dispatching to ${successData.areaName} collectors.`
                : `AI verified (${successData.confidence}% sureness). Dispatched directly to sanitation workers in ${successData.areaName}. You will earn 15 Eco Points once resolved!`}
            </Text>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>
                {successData.isLowConfidence ? '⏳ Status: Admin Review' : '✅ Status: Dispatched'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formHeader}>Live Camera & AI Waste Analysis</Text>
            <Text style={styles.formSubtitle}>
              Take a live geotagged photo. The AI automatically inspects the image, verifies waste vs. non-waste, calculates contamination, suggests tools for the collector, and predicts clean time.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* STEP 1: LIVE PHOTO WITH GEOTAG (CAMERA ONLY) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>1</Text>
                <Text style={styles.sectionTitle}>Live Photo with Geotag</Text>
              </View>

              {!photoUri ? (
                <View style={styles.cameraPlaceholderBox}>
                  <Text style={styles.cameraIcon}>📸</Text>
                  <Text style={styles.cameraPromptTitle}>Live Camera Required</Text>
                  <Text style={styles.cameraPromptDesc}>
                    Live GPS geotag and real-time camera capture prevent duplicate or fake reports.
                  </Text>
                  <TouchableOpacity
                    style={styles.captureBtn}
                    onPress={handleTakeLivePhoto}
                    disabled={capturingPhoto}
                    activeOpacity={0.8}
                  >
                    {capturingPhoto ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.captureBtnText}>📷 Open Live Camera & Geotag</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />

                  {/* Geotag Watermark Badge Overlaid on Live Photo */}
                  <View style={styles.geotagBadge}>
                    <View style={styles.geotagHeader}>
                      <Text style={styles.geotagLiveDot}>● LIVE GEOTAG</Text>
                      <Text style={styles.geotagTime}>{photoTimestamp || 'Just now'}</Text>
                    </View>
                    <Text style={styles.geotagCoord}>
                      📍 {locationCoords ? `${locationCoords.latitude.toFixed(4)}° N, ${locationCoords.longitude.toFixed(4)}° E` : 'GPS Acquired'}
                    </Text>
                    <Text style={styles.geotagWard}>🏛️ {selectedAreaName || 'Ward 1'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleTakeLivePhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retakeBtnText}>🔄 Retake Live Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {locationError ? (
                <Text style={styles.locationNotice}>{locationError}</Text>
              ) : null}
            </View>

            {/* STEP 2: AI VISION ANALYSIS */}
            {photoUri && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionNumber}>2</Text>
                  <Text style={styles.sectionTitle}>AI Waste Analysis</Text>
                </View>

                {analyzingAi ? (
                  <View style={styles.aiScanningBox}>
                    <ActivityIndicator size="large" color={tokens.colors.accent} />
                    <Text style={styles.aiScanningTitle}>AI Vision Analyzing...</Text>
                    <Text style={styles.aiScanningSubtitle}>
                      Classifying waste type, estimating contamination rating, and predicting cleanup time...
                    </Text>
                  </View>
                ) : aiResult ? (
                  <View style={styles.aiResultBox}>
                    {/* Status / Category Card */}
                    <View
                      style={[
                        styles.aiClassificationCard,
                        !aiResult.isWaste
                          ? styles.aiRejectCard
                          : aiResult.confidence < 20
                          ? styles.aiLowCard
                          : styles.aiVerifiedCard,
                      ]}
                    >
                      <View style={styles.aiCardTop}>
                        <View style={styles.aiClassificationInfo}>
                          <Text style={styles.aiTagLabel}>
                            {!aiResult.isWaste
                              ? '🚫 NON-WASTE DETECTED'
                              : aiResult.confidence < 20
                              ? '⚠️ LOW SURENESS (<20%)'
                              : '✅ AI VERIFIED WASTE'}
                          </Text>
                          <Text style={styles.aiClassificationTitle}>
                            {aiResult.classification}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.confidencePill,
                            !aiResult.isWaste
                              ? styles.confidencePillRed
                              : aiResult.confidence < 20
                              ? styles.confidencePillAmber
                              : styles.confidencePillGreen,
                          ]}
                        >
                          <Text style={styles.confidencePillText}>
                            {aiResult.confidence}% Sureness
                          </Text>
                        </View>
                      </View>

                      {/* Non-Waste Rejection Notice */}
                      {!aiResult.isWaste && (
                        <View style={styles.rejectionNoticeBox}>
                          <Text style={styles.rejectionNoticeText}>
                            {aiResult.rejectionReason}
                          </Text>
                        </View>
                      )}

                      {/* Low Confidence Admin Notice */}
                      {aiResult.isWaste && aiResult.confidence < 20 && (
                        <View style={styles.adminReviewNoticeBox}>
                          <Text style={styles.adminReviewNoticeTitle}>
                            🛡️ Municipal Admin Cross-Verification Required
                          </Text>
                          <Text style={styles.adminReviewNoticeText}>
                            AI certainty is below 20%. This complaint will be held for Municipal Admin cross-verification before dispatching to the garbage collector.
                          </Text>
                        </View>
                      )}

                      {/* Hazard & Contamination Rating */}
                      {aiResult.isWaste && (
                        <View style={styles.aiSpecsGrid}>
                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Contamination</Text>
                            <Text
                              style={[
                                styles.specValue,
                                aiResult.contaminationRating === 'Biohazard'
                                  ? styles.specBiohazard
                                  : aiResult.contaminationRating.includes('High')
                                  ? styles.specHazard
                                  : null,
                              ]}
                            >
                              {aiResult.contaminationRating}
                            </Text>
                          </View>

                          <View style={styles.specItem}>
                            <Text style={styles.specLabel}>Est. Clean Time</Text>
                            <Text style={styles.specValue}>
                              ⏱️ {aiResult.predictedCleanTimeFormatted}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Warning Notice if any */}
                      {aiResult.hazardWarning && (
                        <View style={styles.warningStrip}>
                          <Text style={styles.warningStripText}>{aiResult.hazardWarning}</Text>
                        </View>
                      )}

                      {/* Suggested Tools Required */}
                      {aiResult.suggestedTools?.length > 0 && (
                        <View style={styles.toolsContainer}>
                          <Text style={styles.toolsTitle}>🛠️ Suggested Tools for Collector:</Text>
                          <View style={styles.toolsChipsRow}>
                            {aiResult.suggestedTools.map((tool, idx) => (
                              <View key={idx} style={styles.toolChip}>
                                <Text style={styles.toolChipText}>{tool}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* STEP 3: AREA / WARD LOCATION */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>3</Text>
                <Text style={styles.sectionTitle}>Area / Ward Location</Text>
              </View>
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
            </View>

            {/* STEP 4: DESCRIPTION (STRICTLY OPTIONAL) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>4</Text>
                <Text style={styles.sectionTitle}>Description (Optional)</Text>
              </View>
              <TextInput
                style={[styles.textArea, focusedInput === 'desc' && styles.inputFocused]}
                placeholder="Optional: Add nearby landmarks, specific gate numbers, or leave blank to use AI summary..."
                value={description}
                onChangeText={setDescription}
                onFocus={() => setFocusedInput('desc')}
                onBlur={() => setFocusedInput(null)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.fieldHint}>
                💡 If left blank, the AI will automatically summarize the waste classification.
              </Text>
            </View>

            {/* STEP 5: SMART SUBMIT BUTTON */}
            {aiResult && !aiResult.isWaste ? (
              <View style={styles.blockedSubmitBox}>
                <Text style={styles.blockedSubmitTitle}>🚫 Submission Disabled</Text>
                <Text style={styles.blockedSubmitText}>
                  Image classified as a living animal, person, or non-waste object. Please capture a live photo of waste or deceased animal removal.
                </Text>
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={handleTakeLivePhoto}
                  activeOpacity={0.8}
                >
                  <Text style={styles.captureBtnText}>📷 Retake Live Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  aiResult?.confidence < 20 && styles.submitBtnAdmin,
                  loading && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading || !photoUri}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : aiResult?.confidence < 20 ? (
                  <Text style={styles.submitBtnText}>
                    🛡️ Submit for Admin Cross-Verification (&lt;20% Sureness)
                  </Text>
                ) : (
                  <Text style={styles.submitBtnText}>
                    🚀 Submit Complaint to Garbage Collector
                  </Text>
                )}
              </TouchableOpacity>
            )}
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
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    lineHeight: 18,
    marginBottom: tokens.spacing.md,
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
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
  },
  sectionCard: {
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  sectionNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: tokens.colors.accent,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontWeight: tokens.typography.weight.bold,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  cameraPlaceholderBox: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 36,
    marginBottom: tokens.spacing.xs,
  },
  cameraPromptTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: 4,
  },
  cameraPromptDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: tokens.spacing.md,
    maxWidth: 320,
  },
  captureBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  geotagBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    padding: 10,
  },
  geotagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  geotagLiveDot: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: '#10b981',
    letterSpacing: 0.5,
  },
  geotagTime: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  geotagCoord: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: tokens.typography.weight.semibold,
  },
  geotagWard: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  retakeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
  },
  retakeBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: tokens.typography.weight.semibold,
  },
  locationNotice: {
    fontSize: 11,
    color: '#d97706',
    marginTop: 6,
  },
  aiScanningBox: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    alignItems: 'center',
  },
  aiScanningTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginTop: tokens.spacing.sm,
  },
  aiScanningSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  aiResultBox: {
    width: '100%',
  },
  aiClassificationCard: {
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1.5,
    marginBottom: tokens.spacing.sm,
  },
  aiVerifiedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  aiLowCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  aiRejectCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  aiCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  aiClassificationInfo: {
    flex: 1,
    marginRight: 8,
  },
  aiTagLabel: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    letterSpacing: 0.5,
    color: tokens.colors.muted,
    marginBottom: 2,
  },
  aiClassificationTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  confidencePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.full,
  },
  confidencePillGreen: {
    backgroundColor: '#dcfce7',
  },
  confidencePillAmber: {
    backgroundColor: '#fef3c7',
  },
  confidencePillRed: {
    backgroundColor: '#fee2e2',
  },
  confidencePillText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  rejectionNoticeBox: {
    backgroundColor: '#fee2e2',
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  rejectionNoticeText: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 16,
  },
  adminReviewNoticeBox: {
    backgroundColor: '#fef3c7',
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  adminReviewNoticeTitle: {
    fontSize: 11,
    fontWeight: tokens.typography.weight.bold,
    color: '#92400e',
    marginBottom: 2,
  },
  adminReviewNoticeText: {
    fontSize: 10,
    color: '#78350f',
    lineHeight: 15,
  },
  aiSpecsGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  specItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: tokens.radius.sm,
    padding: 6,
  },
  specLabel: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginBottom: 1,
  },
  specValue: {
    fontSize: 11,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  specBiohazard: {
    color: '#b91c1c',
  },
  specHazard: {
    color: '#c2410c',
  },
  warningStrip: {
    backgroundColor: '#fff7ed',
    borderRadius: tokens.radius.sm,
    padding: 6,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  warningStripText: {
    fontSize: 10,
    color: '#9a3412',
    lineHeight: 14,
  },
  toolsContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  toolsTitle: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.muted,
    marginBottom: 4,
  },
  toolsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  toolChip: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.full,
  },
  toolChipText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.colors.text,
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
    paddingVertical: 10,
    minHeight: 44,
  },
  areaSelectBtnText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.medium,
  },
  areaSelectBtnArrow: {
    fontSize: 10,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.bold,
  },
  textArea: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    minHeight: 80,
  },
  inputFocused: {
    borderColor: tokens.colors.borderFocus,
    borderWidth: 2,
  },
  fieldHint: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 4,
  },
  blockedSubmitBox: {
    backgroundColor: '#fef2f2',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  blockedSubmitTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: '#b91c1c',
    marginBottom: 4,
  },
  blockedSubmitText: {
    fontSize: tokens.typography.size.xs,
    color: '#7f1d1d',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: tokens.spacing.md,
  },
  submitBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    ...tokens.shadow.sm,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: tokens.spacing.xs,
  },
  submitBtnAdmin: {
    backgroundColor: '#d97706',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.sm,
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
    fontSize: 44,
    marginBottom: tokens.spacing.sm,
  },
  successTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: tokens.spacing.md,
  },
  successBadge: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
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
