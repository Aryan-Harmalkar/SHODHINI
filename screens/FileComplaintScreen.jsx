import React, { useState, useEffect, useRef } from 'react';
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
import { fileComplaint, getAreas, getCurrentUser } from '../db/database';
import { tokens } from '../lib/theme';
import { analyzeWasteImageWithGemini } from '../lib/aiVision';
import {
  IS_WEB,
  LOCATION_ERROR,
  REQUIRED_ACCURACY_M,
  ensureForegroundPermission,
  geocodeAddress,
  getReadableAddress,
  hasForegroundPermission,
  watchPreciseLocation,
} from '../lib/locationHelper';
import LocationPinMap from '../components/LocationPinMap';

export default function FileComplaintScreen({ user, onBackToHome, onOpenSidebar }) {
  const [currentUser, setCurrentUser] = useState(user || null);
  const [areas, setAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  // Live Photo States
  const [photoUri, setPhotoUri] = useState(null);
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
  const watchRef = useRef(null);
  const reverseTimerRef = useRef(null);
  const locationCoords = pinCoords;

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

      // Only start GPS automatically if permission was already granted;
      // otherwise explain why we need it before showing the OS prompt.
      if (await hasForegroundPermission()) {
        startPreciseLocation();
      } else {
        setLocStatus('explain');
      }
    }

    init();

    return () => {
      watchRef.current?.cancel();
      clearTimeout(reverseTimerRef.current);
    };
  }, []);

  const updateAddressFor = (coord, delayMs = 0) => {
    clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      const addr = await getReadableAddress(coord);
      if (addr) setReadableAddress(addr);
    }, delayMs);
  };

  /**
   * Watches GPS for up to ~15 s and keeps the most accurate reading.
   * Native accepts only fixes with accuracy <= 30 m. Web returns its best
   * (approximate) estimate and the user must confirm/adjust the pin.
   */
  const startPreciseLocation = async () => {
    watchRef.current?.cancel();
    setLocStatus('searching');
    setLocMessage('');
    setLiveAccuracy(null);
    setPinConfirmed(false);

    const ctl = watchPreciseLocation({
      onUpdate: (best) => {
        if (watchRef.current === ctl) setLiveAccuracy(best.accuracy);
      },
    });
    watchRef.current = ctl;

    try {
      const fix = await ctl.promise;
      if (watchRef.current !== ctl) return;
      const coord = { latitude: fix.latitude, longitude: fix.longitude };
      setGpsFix({ accuracy: fix.accuracy, source: IS_WEB ? 'web' : 'gps', approximate: fix.approximate });
      setLiveAccuracy(fix.accuracy);
      setPinCoords(coord);
      setLocStatus('ready');
      updateAddressFor(coord);
    } catch (err) {
      if (watchRef.current !== ctl) return;
      if (err.code === LOCATION_ERROR.PERMISSION_DENIED) {
        setLocStatus('denied');
      } else {
        setLocStatus('imprecise');
        if (err.best) setLiveAccuracy(err.best.accuracy);
      }
      setLocMessage(err.message || 'Location not precise enough, move outdoors and retry.');
    }
  };

  /** User tapped "Allow location" after reading the explanation. */
  const handleAllowLocation = async () => {
    try {
      const { granted, canAskAgain } = await ensureForegroundPermission();
      if (granted) {
        setPermBlocked(false);
        startPreciseLocation();
      } else {
        setPermBlocked(!canAskAgain);
        setLocStatus('denied');
      }
    } catch (err) {
      setLocStatus('denied');
      setLocMessage(err.message || 'Could not request location permission.');
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
   * Strictly requires internal GPS fix - throws an error if GPS is unavailable!
   */
  const handleTakeLivePhoto = async () => {
    setErrorMessage('');
    setCapturingPhoto(true);

    try {
      // 1. Make sure a precise GPS fix is being acquired in parallel
      if (!pinCoords && (locStatus === 'imprecise' || locStatus === 'checking')) {
        startPreciseLocation();
      }

      // 2. Request Camera Permission & Launch Device Camera
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPerm.status !== 'granted') {
        throw new Error('Camera permission denied. Camera access is required to capture live geotagged waste photos.');
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
        setPhotoTimestamp(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );

        // 3. Immediately trigger Gemini AI Vision Analysis
        await runGeminiAnalysis(asset.base64, asset.uri);
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setErrorMessage(err.message);
      Alert.alert('Camera Error', err.message, [{ text: 'OK' }]);
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

    const usingTypedAddressOnly = !pinCoords && locStatus === 'denied' && manualAddress.trim().length > 0;

    if (!usingTypedAddressOnly) {
      if (!pinCoords) {
        setErrorMessage('A precise location is required. Tap "Refresh location" (move outdoors if needed) or type the address.');
        return;
      }
      if (!pinConfirmed) {
        setErrorMessage('Please check the pin on the map and tap "Confirm this location" before submitting.');
        return;
      }
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

      // Include reverse-geocoded address into notes if available
      const fullNotes = [
        description.trim(),
        manualAddress.trim() && gpsFix?.source !== 'gps' ? `Typed address: ${manualAddress.trim()}` : null,
        readableAddress?.shortAddress ? `Location: ${readableAddress.shortAddress}` : null,
        gpsFix?.accuracy ? `GPS accuracy: ${gpsFix.accuracy} m (${gpsFix.source})` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      await fileComplaint({
        citizenId,
        areaId: selectedAreaId,
        category: aiResult.category,
        description: fullNotes,
        latitude: pinCoords?.latitude ?? null,
        longitude: pinCoords?.longitude ?? null,
        aiAnalysis: aiResult,
        imageUrl: photoUri,
        requiresAdminVerification: isLowConfidence,
      });

      setSuccessData({
        isLowConfidence,
        confidence: aiResult.confidence,
        classification: aiResult.classification,
        areaName: selectedAreaName,
        address: readableAddress?.shortAddress || '',
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
            {successData.address ? (
              <Text style={styles.successAddressText}>📍 {successData.address}</Text>
            ) : null}
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

                    {/* Human-readable street address */}
                    <Text style={styles.geotagAddress} numberOfLines={1}>
                      📍 {readableAddress?.shortAddress || (locationCoords ? `${locationCoords.latitude.toFixed(4)}° N, ${locationCoords.longitude.toFixed(4)}° E` : 'GPS Acquired')}
                    </Text>

                    <View style={styles.geotagMetaRow}>
                      <Text style={styles.geotagWard}>🏛️ {selectedAreaName || 'Ward 1'}</Text>
                      <Text style={styles.geotagAccuracy}>
                        {gpsFix?.accuracy ? `🎯 ±${gpsFix.accuracy}m` : pinCoords ? '📌 Pinned' : '⏳ Locating…'}
                      </Text>
                    </View>
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

              {/* PRECISE LOCATION + PIN CONFIRMATION */}
              <View style={styles.locCard}>
                <View style={styles.locHeaderRow}>
                  <Text style={styles.locTitle}>📍 Exact Waste Location</Text>
                  {(locStatus === 'searching' || gpsFix?.accuracy || liveAccuracy) && gpsFix?.source !== 'address' ? (
                    <View
                      style={[
                        styles.accuracyPill,
                        (gpsFix?.accuracy ?? liveAccuracy ?? 9999) <= REQUIRED_ACCURACY_M
                          ? styles.accuracyPillGood
                          : styles.accuracyPillBad,
                      ]}
                    >
                      <Text style={styles.accuracyPillText}>
                        Accuracy: {locStatus === 'ready' && gpsFix?.accuracy ? gpsFix.accuracy : liveAccuracy ?? '—'} m
                      </Text>
                    </View>
                  ) : null}
                </View>

                {IS_WEB && (
                  <View style={styles.coarseNoticeBox}>
                    <Text style={styles.coarseNoticeText}>
                      ⚠️ Location on web is approximate. Use the mobile app for precise location.
                    </Text>
                  </View>
                )}

                {locStatus === 'checking' && (
                  <ActivityIndicator size="small" color={tokens.colors.accent} />
                )}

                {locStatus === 'explain' && (
                  <View>
                    <Text style={styles.locBodyText}>
                      SHODHINI needs your location to tag the exact spot of the waste, so the garbage collector of your area can find and clean it. Location is used only while you file this complaint.
                    </Text>
                    <TouchableOpacity
                      nativeID="allow-location-btn"
                      style={styles.captureBtn}
                      onPress={handleAllowLocation}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.captureBtnText}>📍 Allow Location Access</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {locStatus === 'searching' && (
                  <View style={styles.locSearchingRow}>
                    <ActivityIndicator size="small" color={tokens.colors.accent} />
                    <Text style={styles.locBodyText}>
                      {'  '}Getting a precise GPS fix (need ≤ {REQUIRED_ACCURACY_M} m)…
                    </Text>
                  </View>
                )}

                {locStatus === 'imprecise' && locMessage ? (
                  <Text style={styles.locationNotice}>⚠️ {locMessage}</Text>
                ) : null}

                {locStatus === 'denied' && (
                  <View>
                    <Text style={styles.locationNotice}>
                      🚫 Location permission is off.{' '}
                      {IS_WEB
                        ? 'Click the lock icon next to the address bar, set Location to "Allow", then reload the page.'
                        : 'Open Settings → Apps → SHODHINI → Permissions → Location and choose "Allow while using the app" (and turn on "Use precise location").'}
                    </Text>
                    {!IS_WEB && (
                      <TouchableOpacity
                        nativeID="open-settings-btn"
                        style={styles.recalibrateBtn}
                        onPress={() => Linking.openSettings()}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.recalibrateBtnText}>⚙️ Open Settings</Text>
                      </TouchableOpacity>
                    )}
                    {!permBlocked && (
                      <TouchableOpacity
                        nativeID="retry-permission-btn"
                        style={[styles.recalibrateBtn, { marginTop: 8 }]}
                        onPress={handleAllowLocation}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.recalibrateBtnText}>🔁 Ask for permission again</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[styles.locBodyText, { marginTop: 12 }]}>Or type the address instead:</Text>
                    <TextInput
                      nativeID="manual-address-input"
                      style={[styles.textArea, { minHeight: 48 }, focusedInput === 'addr' && styles.inputFocused]}
                      placeholder="e.g. Near Shivaji Park gate 2, Dadar West, Mumbai"
                      value={manualAddress}
                      onChangeText={setManualAddress}
                      onFocus={() => setFocusedInput('addr')}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <TouchableOpacity
                      nativeID="use-address-btn"
                      style={[styles.recalibrateBtn, { marginTop: 8 }]}
                      onPress={handleUseManualAddress}
                      disabled={geocodingAddress}
                      activeOpacity={0.7}
                    >
                      {geocodingAddress ? (
                        <ActivityIndicator size="small" color={tokens.colors.accent} />
                      ) : (
                        <Text style={styles.recalibrateBtnText}>🔎 Find this address on map</Text>
                      )}
                    </TouchableOpacity>
                    {locMessage ? <Text style={styles.fieldHint}>{locMessage}</Text> : null}
                  </View>
                )}

                {pinCoords && (
                  <View style={{ marginTop: 10 }}>
                    <LocationPinMap
                      coordinate={pinCoords}
                      accuracy={gpsFix?.accuracy ?? undefined}
                      onChange={handlePinChange}
                    />
                    <Text style={styles.fieldHint}>
                      {IS_WEB
                        ? 'Check the pin. Use the arrows to move it to the exact spot of the waste.'
                        : 'Check the pin. Drag it (or tap the map) to the exact spot of the waste.'}
                    </Text>
                    <Text style={styles.locCoordsText}>
                      {pinCoords.latitude.toFixed(6)}, {pinCoords.longitude.toFixed(6)}
                      {readableAddress?.shortAddress ? `  •  ${readableAddress.shortAddress}` : ''}
                    </Text>
                    {pinConfirmed ? (
                      <View style={styles.pinConfirmedBadge}>
                        <Text style={styles.pinConfirmedText}>✅ Location confirmed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        nativeID="confirm-pin-btn"
                        style={styles.captureBtn}
                        onPress={handleConfirmPin}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.captureBtnText}>📌 Confirm this location</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {(locStatus === 'ready' || locStatus === 'imprecise' || locStatus === 'searching') && (
                  <TouchableOpacity
                    nativeID="refresh-location-btn"
                    style={[styles.recalibrateBtn, { marginTop: 10 }]}
                    onPress={startPreciseLocation}
                    disabled={locStatus === 'searching'}
                    activeOpacity={0.7}
                  >
                    {locStatus === 'searching' ? (
                      <ActivityIndicator size="small" color={tokens.colors.accent} />
                    ) : (
                      <Text style={styles.recalibrateBtnText}>🔄 Refresh location</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
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
              {readableAddress?.shortAddress ? (
                <Text style={styles.fieldHint}>
                  Detected nearby: {readableAddress.shortAddress}
                </Text>
              ) : null}
            </View>

            {/* STEP 4: DESCRIPTION (STRICTLY OPTIONAL) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionNumber}>4</Text>
                <Text style={styles.sectionTitle}>Description (Optional)</Text>
              </View>
              <TextInput
                style={[styles.textArea, focusedInput === 'desc' && styles.inputFocused]}
                placeholder="Optional: Add landmarks, gate numbers, or leave blank to use AI summary..."
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
    fontWeight: tokens.typography.weight.bold,
    color: '#10b981',
    letterSpacing: 0.5,
  },
  geotagTime: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  geotagAddress: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: tokens.typography.weight.bold,
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
    fontWeight: tokens.typography.weight.semibold,
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
  locCard: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
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
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  accuracyPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.full,
  },
  accuracyPillGood: {
    backgroundColor: '#dcfce7',
  },
  accuracyPillBad: {
    backgroundColor: '#fef3c7',
  },
  accuracyPillText: {
    fontSize: 12,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  locBodyText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    lineHeight: 18,
  },
  locSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  locCoordsText: {
    fontSize: 11,
    color: tokens.colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  pinConfirmedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
  },
  pinConfirmedText: {
    fontSize: 12,
    fontWeight: tokens.typography.weight.bold,
    color: '#15803d',
  },
  recalibrateBtn: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  recalibrateBtnText: {
    fontSize: 12,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
  },
  coarseNoticeBox: {
    backgroundColor: '#fffbeb',
    borderRadius: tokens.radius.sm,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  coarseNoticeText: {
    fontSize: 12,
    color: '#92400e',
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
  successAddressText: {
    fontSize: 11,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
    marginBottom: tokens.spacing.sm,
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
