import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fileComplaint, getAreas, getCurrentUser, updateUserEcoPoints } from '../db/database';
import { tokens, useTheme } from '../lib/theme';
import { analyzeWasteImageWithGemini } from '../lib/aiVision';
import {
  IS_WEB,
  geocodeAddress,
  getReadableAddress,
} from '../lib/locationHelper';
import { captureGeotag, checkGeotagPermission } from '../lib/geotag';
import LocationPinMap from '../components/LocationPinMap';

export default function FileComplaintScreen({ user, onBackToHome, onOpenSidebar }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [currentUser, setCurrentUser] = useState(user || null);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  // Live Photo States
  const [photoUri, setPhotoUri] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [readableAddress, setReadableAddress] = useState(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

  // Precise Location States
  // locStatus: 'checking' | 'explain' | 'searching' | 'ready' | 'imprecise' | 'denied'
  const [locStatus, setLocStatus] = useState('checking');
  const [liveAccuracy, setLiveAccuracy] = useState(null); // best accuracy while searching
  const [gpsFix, setGpsFix] = useState(null); // { accuracy, source: 'gps' | 'web' | 'address' }
  const [pinCoords, setPinCoords] = useState(null); // final coordinates the user confirms
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [locMessage, setLocMessage] = useState('');
  const [permBlocked, setPermBlocked] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const reverseTimerRef = useRef(null);
  const [geotag, setGeotag] = useState(null); // { latitude, longitude, accuracy_m, captured_at, source }
  const locationCoords = pinCoords || (geotag ? { latitude: geotag.latitude, longitude: geotag.longitude } : null);

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

  useEffect(() => {
    // Check initial permission status if we want to show warning, but don't prompt yet
    const checkPerm = async () => {
      const state = await checkGeotagPermission();
      if (state === 'denied') setLocStatus('denied');
    };
    checkPerm();
    return () => clearTimeout(reverseTimerRef.current);
  }, []);

  const updateAddressFor = (coord, delayMs = 0) => {
    clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      const addr = await getReadableAddress(coord);
      if (addr) setReadableAddress(addr);
    }, delayMs);
  };

  const handleAllowLocation = async () => {
    const state = await checkGeotagPermission();
    if (state === 'denied') {
      if (IS_WEB) {
        setLocMessage('Location is blocked for this site. Tap the lock icon in the address bar > Permissions > Location > Allow, then tap Retry.');
      } else {
        setLocMessage('Location permission denied in device settings.');
      }
    } else {
      setLocMessage('');
      setLocStatus('checking');
    }
  };

  /** User dragged the pin / tapped the map / nudged the pin. */
  const handlePinChange = (coord) => {
    if (!coord) return;
    setPinCoords({ latitude: coord.latitude, longitude: coord.longitude });
    setPinConfirmed(false);
    updateAddressFor(coord, 900);
  };

  const handleConfirmPin = () => {
    if (!pinCoords) return;
    setPinConfirmed(true);
    setErrorMessage('');
    if (__DEV__) {
      console.log('[location] user confirmed pin', {
        latitude: pinCoords.latitude,
        longitude: pinCoords.longitude,
        gpsAccuracy: gpsFix?.accuracy,
        source: gpsFix?.source,
      });
    }
  };

  /** Permission denied fallback: convert typed address to a pin. */
  const handleUseManualAddress = async () => {
    const text = manualAddress.trim();
    if (!text) {
      setLocMessage('Please type the address where the waste is located.');
      return;
    }
    setGeocodingAddress(true);
    setLocMessage('');
    try {
      const coord = await geocodeAddress(text);
      if (coord) {
        setPinCoords(coord);
        setGpsFix({ accuracy: null, source: 'address' });
        setPinConfirmed(false);
        updateAddressFor(coord);
      } else {
        setLocMessage('Could not find that address on the map. It will be sent to the collector as text.');
      }
    } finally {
      setGeocodingAddress(false);
    }
  };

  /**
   * Captures Live Photo using device camera and acquires fresh live GPS geotag.
   */
  const handleTakeLivePhoto = async () => {
    setErrorMessage('');
    setCapturingPhoto(true);
    setLocMessage('');
    setLocStatus('searching');

    try {
      const permState = await checkGeotagPermission();
      if (permState === 'denied') {
        if (IS_WEB) {
           setLocMessage('Location is blocked for this site. Tap the lock icon in the address bar > Permissions > Location > Allow, then tap Retry.');
        }
        setLocStatus('denied');
        throw new Error('Location permission is denied.');
      }

      // 1. Request Camera Permission & Launch Device Camera
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== 'granted') {
        throw new Error('Camera permission denied. Camera access is required to capture live geotagged waste photos.');
      }

      // 2. Start Geotag capture concurrently
      let geotagPromise = captureGeotag({
        targetAccuracyM: 30,
        timeoutMs: 15000,
        onUpdate: (acc) => setLiveAccuracy(Math.round(acc))
      }).catch(err => {
        if (err.message === 'denied') setLocStatus('denied');
        return null; // Resolve to null if failed
      });

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoBase64(asset.base64);
        setPhotoTimestamp(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );

        // 3. Immediately trigger Gemini AI Vision Analysis
        runGeminiAnalysis(asset.base64, asset.uri);

        // 4. Wait for geotag
        const tag = await geotagPromise;
        if (tag) {
          setGeotag(tag);
          setLocStatus('ready');
        } else {
          setLocStatus('imprecise'); // fallback to manual pin
        }
      } else {
        setLocStatus('checking');
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setErrorMessage(err.message);
      //Alert.alert('Error', err.message, [{ text: 'OK' }]);
      setLocStatus('checking');
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
      
      if (analysis && !analysis.isWaste && !analysis.isTooSmall && currentUser?.id) {
        await updateUserEcoPoints(currentUser.id, -5);
        // Optional: refresh local state
      }
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

    // Reject waste that is too small or minor (can be cleaned by the user directly)
    if (aiResult.isTooSmall) {
      setErrorMessage(
        aiResult.rejectionReason || 'This waste is too small or minor (e.g. 1 bottle or straw) and can easily be cleaned up by you directly! Please reserve municipal complaints for larger waste piles or overflowing bins.'
      );
      return;
    }



    const citizenId = currentUser?.id;
    if (!citizenId) {
      setErrorMessage('User session expired. Please log in again.');
      return;
    }

    if (!locationCoords) {
      setErrorMessage('Please acquire a location or confirm a manual pin on the map.');
      return;
    }

    if (!geotag && !pinConfirmed && !manualAddress.trim()) {
      setErrorMessage('Please confirm the location pin on the map before submitting.');
      return;
    }

    setLoading(true);
    try {
      const fullNotes = [
        description.trim(),
        manualAddress.trim() ? `Address: ${manualAddress.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      await fileComplaint({
        citizenId,
        areaId: selectedAreaId,
        category: 'Roadside waste',
        description: fullNotes || `Waste report in ${selectedAreaName || 'Assagao'}`,
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        geoAccuracyM: geotag?.accuracy_m ?? gpsFix?.accuracy ?? null,
        geoCapturedAt: geotag?.captured_at ?? new Date().toISOString(),
        geoSource: geotag?.source ?? (pinConfirmed ? 'manual' : (gpsFix?.source ?? 'unknown')),
        aiAnalysis: aiResult,
        imageBase64: photoBase64,
      });

      setSuccessData({
        areaName: selectedAreaName,
        address: selectedAreaName || '',
      });

      setTimeout(() => {
        onBackToHome();
      }, 1500);
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

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Day/Dark Theme"
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* SUCCESS CARD */}
        {successData ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🚀</Text>
            <Text style={styles.successTitle}>
              Complaint Dispatched to Collector!
            </Text>
            <Text style={styles.successDesc}>
              AI verified waste. Dispatched directly to sanitation workers in {successData.areaName}. You will earn 15 Eco Points once resolved!
            </Text>
            {successData.address ? (
              <Text style={styles.successAddressText}>📍 {successData.address}</Text>
            ) : null}
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>
                ✅ Status: Dispatched
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.submitBtn, { marginTop: 24, paddingHorizontal: 32 }]} 
              onPress={onBackToHome}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>Return to Home Menu</Text>
            </TouchableOpacity>
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
                      <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                    ) : (
                      <Text style={styles.captureBtnText}>📷 Open Live Camera & Geotag</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />

                  <View style={styles.geotagBadge}>
                    <View style={styles.geotagHeader}>
                      <Text style={styles.geotagLiveDot}>● LIVE VERIFIED PHOTO</Text>
                      <Text style={styles.geotagTime}>{photoTimestamp || 'Just now'}</Text>
                    </View>


                    
                    <View style={[styles.geotagMetaRow, { marginTop: 4 }]}>
                      <Text style={styles.geotagWard}>
                        📍 Accuracy: {geotag?.accuracy_m ? `${Math.round(geotag.accuracy_m)} m` : (locStatus === 'searching' ? `Getting precise location... ${liveAccuracy ? `(${liveAccuracy}m)` : ''}` : 'Manual Pin')}
                      </Text>
                    </View>
                    {geotag?.accuracy_m > 50 && (
                      <View style={{ backgroundColor: '#fef3c7', padding: 4, borderRadius: 4, marginTop: 4 }}>
                        <Text style={{ color: '#d97706', fontSize: 12, fontWeight: 'bold' }}>⚠️ Location is approximate.</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={handleTakeLivePhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retakeBtnText}>🔄 Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
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
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.aiScanningTitle}>AI Vision Analyzing...</Text>
                    <Text style={styles.aiScanningSubtitle}>
                      Classifying waste type, estimating contamination rating, and predicting cleanup time...
                    </Text>
                  </View>
                ) : aiResult ? (
                  <View style={styles.aiResultBox}>
                    <View
                      style={[
                        styles.aiClassificationCard,
                        !aiResult.isWaste
                          ? styles.aiRejectCard
                          : aiResult.isTooSmall
                          ? styles.aiLowCard
                          : styles.aiVerifiedCard,
                      ]}
                    >
                      <View style={styles.aiCardTop}>
                        <View style={styles.aiClassificationInfo}>
                          <Text style={styles.aiTagLabel}>
                            {!aiResult.isWaste
                              ? '🚫 NON-WASTE DETECTED'
                              : aiResult.isTooSmall
                              ? '⚠️ WASTE TOO MINOR / CAN SELF-CLEAN'
                              : '✅ AI VERIFIED WASTE'}
                          </Text>
                        </View>
                      </View>

                      {!aiResult.isWaste && (
                        <View style={styles.rejectionNoticeBox}>
                          <Text style={styles.rejectionNoticeText}>
                            {aiResult.rejectionReason}
                          </Text>
                          <Text style={[styles.rejectionNoticeText, { marginTop: 8, fontWeight: 'bold' }]}>
                            Penalty: 5 Eco Points deducted for uploading a non-waste image.
                          </Text>
                        </View>
                      )}

                      {aiResult.isWaste && aiResult.isTooSmall && (
                        <View style={styles.adminReviewNoticeBox}>
                          <Text style={styles.adminReviewNoticeTitle}>
                            🧹 Waste Too Small for Municipal Dispatch
                          </Text>
                          <Text style={styles.adminReviewNoticeText}>
                            {aiResult.rejectionReason ||
                              'This waste (e.g. 1 bottle or straw) is too small to dispatch a municipal worker. Please pick it up and dispose of it yourself!'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* STEP 3: DESCRIPTION (STRICTLY OPTIONAL) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>3</Text>
                <Text style={styles.sectionTitle}>Description (Optional)</Text>
              </View>
              <TextInput
                style={[styles.textArea, focusedInput === 'desc' && styles.inputFocused]}
                placeholder="Optional: Add landmarks, gate numbers, or leave blank to use AI summary..."
                placeholderTextColor={colors.muted}
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

            {/* STEP 4: SMART SUBMIT BUTTON */}
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
            ) : aiResult && aiResult.isTooSmall ? (
              <View
                style={[
                  styles.blockedSubmitBox,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fde68a',
                  },
                ]}
              >
                <Text style={[styles.blockedSubmitTitle, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                  ⚠️ Waste Too Minor / Self-Cleanable
                </Text>
                <Text style={[styles.blockedSubmitText, { color: isDark ? '#fde68a' : '#78350f' }]}>
                  {aiResult.rejectionReason ||
                    'This garbage is too small (e.g. 1 bottle or straw) and can be cleaned up by you directly. Municipal collection is reserved for larger waste piles and overflowing bins.'}
                </Text>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: '#d97706', marginTop: 10 }]}
                  onPress={handleTakeLivePhoto}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.captureBtnText, { color: isDark ? '#000' : '#fff' }]}>📷 Retake Photo of Larger Waste</Text>
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
                  <ActivityIndicator color={isDark ? '#000' : '#fff'} />
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


    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.md,
      backgroundColor: colors.headerBg || colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    topRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
    },
    themeToggleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleIcon: {
      fontSize: 16,
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
      color: colors.text,
      fontFamily: tokens.typography.family.bold,
    },
    title: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    homeBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.sm,
      minHeight: 44,
      justifyContent: 'center',
    },
    homeBtnText: {
      color: colors.accent,
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
    },
    scrollContent: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
      padding: tokens.spacing.md,
      paddingBottom: tokens.spacing.xxl,
      alignItems: 'center',
    },
  formCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...tokens.shadow.sm,
  },
  formHeader: {
    fontSize: tokens.typography.size.lg,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: tokens.spacing.md,
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.semibold,
  },
  sectionCard: {
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.accent,
    color: isDark ? '#000' : '#fff',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontFamily: tokens.typography.family.bold,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  cameraPlaceholderBox: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 36,
    marginBottom: tokens.spacing.xs,
  },
  cameraPromptTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
    marginBottom: 4,
  },
  cameraPromptDesc: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: tokens.spacing.md,
    maxWidth: 320,
  },
  captureBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnText: {
    color: isDark ? '#000' : '#fff',
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
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
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
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
    fontFamily: tokens.typography.family.bold,
    color: '#10b981',
    letterSpacing: 0.5,
  },
  geotagTime: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  geotagAddress: {
    fontSize: 11,
    color: isDark ? '#000' : '#fff',
    fontFamily: tokens.typography.family.bold,
    marginVertical: 1,
  },
  geotagMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  geotagWard: {
    fontSize: 10,
    color: '#94a3b8',
  },
  geotagAccuracy: {
    fontSize: 10,
    color: '#34d399',
    fontFamily: tokens.typography.family.semibold,
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
    color: isDark ? '#000' : '#fff',
    fontSize: 11,
    fontFamily: tokens.typography.family.semibold,
  },
  locCard: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  locHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  locTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  accuracyPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.full,
  },
  accuracyPillGood: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
  },
  accuracyPillBad: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
  },
  accuracyPillText: {
    fontSize: 12,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  locBodyText: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    lineHeight: 18,
  },
  locSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  locCoordsText: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  pinConfirmedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
  },
  pinConfirmedText: {
    fontSize: 12,
    fontFamily: tokens.typography.family.bold,
    color: colors.accent,
  },
  recalibrateBtn: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recalibrateBtnText: {
    fontSize: 12,
    color: colors.accent,
    fontFamily: tokens.typography.family.semibold,
  },
  coarseNoticeBox: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
    borderRadius: tokens.radius.sm,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  coarseNoticeText: {
    fontSize: 12,
    color: isDark ? '#fcd34d' : '#92400e',
    lineHeight: 16,
  },
  locationNotice: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 6,
  },
  aiScanningBox: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  aiScanningTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
    marginTop: tokens.spacing.sm,
  },
  aiScanningSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
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
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
    borderColor: colors.accent,
  },
  aiLowCard: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
    borderColor: isDark ? '#fbbf24' : '#f59e0b',
  },
  aiRejectCard: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderColor: colors.danger,
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
    fontFamily: tokens.typography.family.bold,
    letterSpacing: 0.5,
    color: colors.muted,
    marginBottom: 2,
  },
  aiClassificationTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  confidencePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.full,
  },
  confidencePillGreen: {
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
  },
  confidencePillAmber: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
  },
  confidencePillRed: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
  },
  confidencePillText: {
    fontSize: 10,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  rejectionNoticeBox: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  rejectionNoticeText: {
    fontSize: 11,
    color: colors.danger,
    lineHeight: 16,
  },
  adminReviewNoticeBox: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
    borderRadius: tokens.radius.sm,
    padding: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  adminReviewNoticeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: isDark ? '#fcd34d' : '#92400e',
    marginBottom: 2,
  },
  adminReviewNoticeText: {
    fontSize: 10,
    color: isDark ? '#fde68a' : '#78350f',
    lineHeight: 15,
  },
  aiSpecsGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
    paddingTop: tokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  specItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.sm,
    padding: 6,
  },
  specLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 1,
  },
  specValue: {
    fontSize: 11,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  specBiohazard: {
    color: colors.danger,
  },
  specHazard: {
    color: isDark ? '#fb923c' : '#c2410c',
  },
  warningStrip: {
    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed',
    borderRadius: tokens.radius.sm,
    padding: 6,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  warningStripText: {
    fontSize: 10,
    color: isDark ? '#fdba74' : '#9a3412',
    lineHeight: 14,
  },
  toolsContainer: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolsTitle: {
    fontSize: 10,
    fontFamily: tokens.typography.family.bold,
    color: colors.muted,
    marginBottom: 4,
  },
  toolsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  toolChip: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.full,
  },
  toolChipText: {
    fontSize: 10,
    fontFamily: tokens.typography.family.medium,
    color: colors.text,
  },
  areaSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
    minHeight: 44,
  },
  areaSelectBtnText: {
    fontSize: tokens.typography.size.sm,
    color: colors.text,
    fontFamily: tokens.typography.family.medium,
  },
  areaSelectBtnArrow: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: tokens.typography.family.bold,
  },
  textArea: {
    backgroundColor: colors.inputBg || colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.sm,
    color: colors.text,
    minHeight: 80,
  },
  inputFocused: {
    borderColor: colors.borderFocus || colors.accent,
    borderWidth: 2,
  },
  fieldHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
  blockedSubmitBox: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#ef4444' : '#fca5a5',
  },
  blockedSubmitTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: isDark ? '#f87171' : '#b91c1c',
    marginBottom: 4,
  },
  blockedSubmitText: {
    fontSize: tokens.typography.size.xs,
    color: isDark ? '#fca5a5' : '#7f1d1d',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: tokens.spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: tokens.radius.lg,
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
    color: isDark ? '#000' : '#fff',
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
  },
  successCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...tokens.shadow.md,
  },
  successIcon: {
    fontSize: 44,
    marginBottom: tokens.spacing.sm,
  },
  successTitle: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
    marginBottom: tokens.spacing.xs,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: tokens.spacing.md,
  },
  successAddressText: {
    fontSize: 11,
    color: colors.accent,
    fontFamily: tokens.typography.family.semibold,
    marginBottom: tokens.spacing.sm,
  },
  successBadge: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
  },
  successBadgeText: {
    fontSize: 11,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '60%',
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
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
    color: colors.muted,
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
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.xs,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  areaOptionSelected: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  areaOptionText: {
    fontSize: tokens.typography.size.base,
    color: colors.text,
  },
  areaOptionTextSelected: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  areaCheck: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.base,
  },
});
