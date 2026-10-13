import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tokens, useTheme } from '../lib/theme';
import { classifyWasteWithGemini } from '../lib/aiVision';

/* ── Helpers ──────────────────────────────────────────────────── */

const HARM_CONFIG = {
  None:   { emoji: '✅', color: '#10b981', label: 'No Harm' },
  Low:    { emoji: '🟡', color: '#f59e0b', label: 'Low Risk' },
  Medium: { emoji: '🟠', color: '#f97316', label: 'Medium Risk' },
  High:   { emoji: '🔴', color: '#ef4444', label: 'High Risk' },
};

const BIN_EMOJI = {
  '🔵 Blue Bin':  { bg: '#dbeafe', border: '#3b82f6', darkBg: 'rgba(59,130,246,0.15)', darkBorder: '#3b82f6', icon: '🔵' },
  '🟢 Green Bin': { bg: '#d1fae5', border: '#10b981', darkBg: 'rgba(16,185,129,0.15)', darkBorder: '#10b981', icon: '🟢' },
  '🔴 Red Bin':   { bg: '#fee2e2', border: '#ef4444', darkBg: 'rgba(239,68,68,0.15)',  darkBorder: '#ef4444', icon: '🔴' },
  '⚫ Black Bin':  { bg: '#f3f4f6', border: '#6b7280', darkBg: 'rgba(107,114,128,0.15)', darkBorder: '#6b7280', icon: '⚫' },
};

function getBinStyle(dustbinColor, isDark) {
  for (const [key, val] of Object.entries(BIN_EMOJI)) {
    if (dustbinColor && dustbinColor.includes(key.replace(/^.{2}/, '').trim().split(' ')[0])) {
      return isDark
        ? { backgroundColor: val.darkBg, borderColor: val.darkBorder }
        : { backgroundColor: val.bg, borderColor: val.border };
    }
  }
  // Direct match
  if (dustbinColor && BIN_EMOJI[dustbinColor]) {
    const val = BIN_EMOJI[dustbinColor];
    return isDark
      ? { backgroundColor: val.darkBg, borderColor: val.darkBorder }
      : { backgroundColor: val.bg, borderColor: val.border };
  }
  return isDark
    ? { backgroundColor: 'rgba(107,114,128,0.15)', borderColor: '#6b7280' }
    : { backgroundColor: '#f3f4f6', borderColor: '#6b7280' };
}

/* ── Component ────────────────────────────────────────────────── */

export default function ClassificationScreen({ onBackToHome, onOpenSidebar }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [imageUri, setImageUri] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setBase64Data(res.assets[0].base64);
      setResult(null);
      setExpandedItems({});
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload photos.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setBase64Data(res.assets[0].base64);
      setResult(null);
      setExpandedItems({});
    }
  };

  const classifyImage = async () => {
    if (!base64Data) return;
    setLoading(true);
    setResult(null);
    setExpandedItems({});

    try {
      const data = await classifyWasteWithGemini({ base64: base64Data });
      setResult(data);
      // Auto-expand all waste items
      if (data?.items) {
        const expanded = {};
        data.items.forEach((item, idx) => {
          if (item.isWaste) expanded[idx] = true;
        });
        setExpandedItems(expanded);
      }
    } catch (err) {
      Alert.alert('Classification Error', err.message || 'Failed to classify image.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (idx) => {
    setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const resetAll = () => {
    setImageUri(null);
    setBase64Data(null);
    setResult(null);
    setExpandedItems({});
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Classification</Text>
        </View>
        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🔍 Identify & Classify</Text>
        <Text style={styles.subtitle}>
          Upload any photo — AI will detect every item, classify waste vs non-waste, and tell you exactly how to dispose of each one.
        </Text>

        {/* Photo Capture Area */}
        {!imageUri ? (
          <View style={styles.actionBox}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconLarge}>🤖</Text>
            </View>
            <Text style={styles.actionHint}>Take a photo or pick from gallery</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Text style={styles.btnIcon}>📷</Text>
                <Text style={styles.btnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage} activeOpacity={0.8}>
                <Text style={styles.btnIcon}>🖼️</Text>
                <Text style={styles.btnTextSecondary}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.imagePreviewBox}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <TouchableOpacity style={styles.retakeBtn} onPress={resetAll}>
              <Text style={styles.retakeBtnText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analyze Button */}
        {imageUri && !result && !loading && (
          <TouchableOpacity style={styles.classifyBtn} onPress={classifyImage} activeOpacity={0.8}>
            <Text style={styles.classifyBtnText}>🔍 Scan & Classify Everything</Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>AI is scanning every item in the image...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds for detailed analysis</Text>
          </View>
        )}

        {/* ── Results ───────────────────────────────────────── */}
        {result && (
          <View style={styles.resultsContainer}>
            {/* Scene Overview Card */}
            <View style={styles.sceneCard}>
              <Text style={styles.sceneCardTitle}>📸 Scene Overview</Text>
              <Text style={styles.sceneDescription}>{result.sceneDescription}</Text>

              <View style={styles.statsRow}>
                <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#dbeafe' }]}>
                  <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{result.totalItemsDetected || 0}</Text>
                  <Text style={[styles.statLabel, { color: '#3b82f6' }]}>Total</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }]}>
                  <Text style={[styles.statNumber, { color: '#ef4444' }]}>{result.wasteItemsCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: '#ef4444' }]}>Waste</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#d1fae5' }]}>
                  <Text style={[styles.statNumber, { color: '#10b981' }]}>{result.nonWasteItemsCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: '#10b981' }]}>Non-Waste</Text>
                </View>
              </View>

              {result.overallRecommendation ? (
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
                  <Text style={styles.recommendationText}>{result.overallRecommendation}</Text>
                </View>
              ) : null}
            </View>

            {/* Item Cards */}
            {result.items && result.items.length > 0 && (
              <Text style={styles.sectionTitle}>
                {result.items.length} Item{result.items.length !== 1 ? 's' : ''} Detected
              </Text>
            )}

            {result.items && result.items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.itemCard,
                  item.isWaste
                    ? styles.wasteItemCard
                    : styles.nonWasteItemCard,
                ]}
                onPress={() => toggleExpand(idx)}
                activeOpacity={0.85}
              >
                {/* Item Header Row */}
                <View style={styles.itemHeaderRow}>
                  <View style={styles.itemHeaderLeft}>
                    <Text style={styles.itemEmoji}>{item.isWaste ? '🗑️' : '✅'}</Text>
                    <View style={styles.itemNameCol}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.itemBadgeRow}>
                        <View style={[styles.wasteBadge, item.isWaste ? styles.wasteBadgeYes : styles.wasteBadgeNo]}>
                          <Text style={[styles.wasteBadgeText, item.isWaste ? styles.wasteBadgeTextYes : styles.wasteBadgeTextNo]}>
                            {item.isWaste ? 'WASTE' : 'NOT WASTE'}
                          </Text>
                        </View>
                        {item.isWaste && item.wasteType && (
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{item.wasteType}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.expandIcon}>{expandedItems[idx] ? '▲' : '▼'}</Text>
                </View>

                {/* Expanded Details */}
                {expandedItems[idx] && item.isWaste && (
                  <View style={styles.itemDetails}>
                    {/* Material */}
                    {item.material && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>🧪 Material</Text>
                        <Text style={styles.detailValue}>{item.material}</Text>
                      </View>
                    )}

                    {/* Dustbin Color */}
                    {item.dustbinColor && (
                      <View style={[styles.binCard, getBinStyle(item.dustbinColor, isDark)]}>
                        <Text style={styles.binCardTitle}>🪣 Dispose In</Text>
                        <Text style={styles.binCardValue}>{item.dustbinColor}</Text>
                      </View>
                    )}

                    {/* Recyclable */}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>♻️ Recyclable</Text>
                      <Text style={[styles.detailValue, { color: item.isRecyclable ? '#10b981' : '#ef4444' }]}>
                        {item.isRecyclable ? 'Yes ✅' : 'No ❌'}
                      </Text>
                    </View>

                    {/* Recycling Tip */}
                    {item.recyclingTip && (
                      <View style={styles.tipBox}>
                        <Text style={styles.tipTitle}>♻️ Recycling Tip</Text>
                        <Text style={styles.tipText}>{item.recyclingTip}</Text>
                      </View>
                    )}

                    {/* Disposal Steps */}
                    {item.disposalSteps && item.disposalSteps.length > 0 && (
                      <View style={styles.stepsBox}>
                        <Text style={styles.stepsTitle}>📋 How to Dispose</Text>
                        {item.disposalSteps.map((step, sIdx) => (
                          <View key={sIdx} style={styles.stepRow}>
                            <View style={styles.stepNumber}>
                              <Text style={styles.stepNumberText}>{sIdx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Environmental Impact */}
                    {item.harmLevel && item.harmLevel !== 'None' && (
                      <View style={[styles.harmBox, { borderColor: HARM_CONFIG[item.harmLevel]?.color || '#6b7280' }]}>
                        <View style={styles.harmHeader}>
                          <Text style={styles.harmEmoji}>{HARM_CONFIG[item.harmLevel]?.emoji || '⚠️'}</Text>
                          <Text style={[styles.harmTitle, { color: HARM_CONFIG[item.harmLevel]?.color || '#6b7280' }]}>
                            {HARM_CONFIG[item.harmLevel]?.label || 'Unknown'} — Environmental Impact
                          </Text>
                        </View>
                        {item.harmDetails && (
                          <Text style={styles.harmText}>{item.harmDetails}</Text>
                        )}
                      </View>
                    )}
                    {item.harmLevel === 'None' && (
                      <View style={[styles.harmBox, { borderColor: '#10b981' }]}>
                        <View style={styles.harmHeader}>
                          <Text style={styles.harmEmoji}>✅</Text>
                          <Text style={[styles.harmTitle, { color: '#10b981' }]}>
                            No Environmental Harm
                          </Text>
                        </View>
                        {item.harmDetails && (
                          <Text style={styles.harmText}>{item.harmDetails}</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Non-waste expanded */}
                {expandedItems[idx] && !item.isWaste && (
                  <View style={styles.itemDetails}>
                    <View style={styles.nonWasteInfo}>
                      <Text style={styles.nonWasteEmoji}>✅</Text>
                      <Text style={styles.nonWasteText}>
                        This is a normal, usable item — not waste. No disposal needed.
                      </Text>
                    </View>
                    {item.material && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Material</Text>
                        <Text style={styles.detailValue}>{item.material}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Scan Again */}
            <TouchableOpacity style={styles.scanAgainBtn} onPress={resetAll} activeOpacity={0.8}>
              <Text style={styles.scanAgainText}>📸 Scan Another Image</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────── */

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm,
    backgroundColor: colors.headerBg || colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: tokens.spacing.xs, marginRight: tokens.spacing.sm },
  menuIcon: { fontSize: tokens.typography.size.lg, color: colors.text, fontFamily: tokens.typography.family.bold },
  headerTitle: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.extrabold, color: colors.accent },
  backHomeBtn: { paddingVertical: 6, paddingHorizontal: tokens.spacing.sm, borderRadius: tokens.radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  backHomeText: { color: colors.text, fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.family.semibold },
  scrollContent: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xxl + 40 },

  title: { fontSize: tokens.typography.size.xl, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginBottom: tokens.spacing.xs },
  subtitle: { fontSize: tokens.typography.size.sm, color: colors.muted, fontFamily: tokens.typography.family.medium, marginBottom: tokens.spacing.xl, lineHeight: 20 },

  /* Action Box */
  actionBox: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  iconLarge: { fontSize: 40 },
  actionHint: { color: colors.muted, fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, marginBottom: tokens.spacing.lg },
  btnRow: { flexDirection: 'row', gap: tokens.spacing.md, width: '100%', justifyContent: 'center' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  btnIcon: { fontSize: 16 },
  btnText: { color: colors.background, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  btnTextSecondary: { color: colors.text, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm },

  /* Image Preview */
  imagePreviewBox: {
    width: '100%', height: 280,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: tokens.spacing.md,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  retakeBtn: {
    position: 'absolute', top: tokens.spacing.sm, right: tokens.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: tokens.radius.full,
  },
  retakeBtnText: { color: '#fff', fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.family.bold },

  /* Classify Button */
  classifyBtn: {
    backgroundColor: colors.accent, padding: tokens.spacing.md,
    borderRadius: tokens.radius.xl, alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  classifyBtnText: { color: colors.background, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.base },

  /* Loading */
  loadingBox: { alignItems: 'center', marginVertical: tokens.spacing.xl },
  loadingText: { marginTop: tokens.spacing.sm, color: colors.text, fontFamily: tokens.typography.family.semibold, fontSize: tokens.typography.size.sm },
  loadingSubtext: { marginTop: 4, color: colors.muted, fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.xs },

  /* Results Container */
  resultsContainer: { marginTop: tokens.spacing.md },

  /* Scene Card */
  sceneCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: tokens.spacing.md,
  },
  sceneCardTitle: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginBottom: tokens.spacing.xs },
  sceneDescription: { fontSize: tokens.typography.size.sm, color: colors.textSecondary || colors.muted, fontFamily: tokens.typography.family.medium, lineHeight: 20, marginBottom: tokens.spacing.md },

  statsRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
  statBadge: {
    flex: 1, alignItems: 'center', paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
  },
  statNumber: { fontSize: tokens.typography.size.xl, fontFamily: tokens.typography.family.extrabold },
  statLabel: { fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.family.semibold, marginTop: 2 },

  recommendationBox: {
    padding: tokens.spacing.sm,
    backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a',
  },
  recommendationTitle: { fontFamily: tokens.typography.family.bold, color: isDark ? '#fbbf24' : '#92400e', fontSize: tokens.typography.size.sm, marginBottom: 4 },
  recommendationText: { fontFamily: tokens.typography.family.medium, color: isDark ? '#fde68a' : '#78350f', fontSize: tokens.typography.size.sm, lineHeight: 19 },

  /* Section Title */
  sectionTitle: {
    fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.extrabold,
    color: colors.text, marginBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },

  /* Item Card */
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1.5,
  },
  wasteItemCard: {
    borderColor: isDark ? 'rgba(239,68,68,0.4)' : '#fca5a5',
  },
  nonWasteItemCard: {
    borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#6ee7b7',
  },

  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: tokens.spacing.sm },
  itemEmoji: { fontSize: 24, marginTop: 2 },
  itemNameCol: { flex: 1 },
  itemName: { fontSize: tokens.typography.size.sm, fontFamily: tokens.typography.family.bold, color: colors.text, marginBottom: 6 },
  itemBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  wasteBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radius.full,
  },
  wasteBadgeYes: { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2' },
  wasteBadgeNo: { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5' },
  wasteBadgeText: { fontSize: 10, fontFamily: tokens.typography.family.extrabold, letterSpacing: 0.5 },
  wasteBadgeTextYes: { color: isDark ? '#f87171' : '#dc2626' },
  wasteBadgeTextNo: { color: isDark ? '#34d399' : '#059669' },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: tokens.radius.full,
    backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff',
  },
  typeBadgeText: { fontSize: 10, fontFamily: tokens.typography.family.bold, color: isDark ? '#a5b4fc' : '#4338ca' },
  expandIcon: { fontSize: 12, color: colors.muted, marginLeft: 8, marginTop: 4 },

  /* Item Details */
  itemDetails: { marginTop: tokens.spacing.md, paddingTop: tokens.spacing.md, borderTopWidth: 1, borderTopColor: colors.border },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.muted, fontFamily: tokens.typography.family.semibold, fontSize: tokens.typography.size.sm },
  detailValue: { color: colors.text, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm, maxWidth: '60%', textAlign: 'right' },

  /* Bin Card */
  binCard: {
    padding: tokens.spacing.sm, borderRadius: tokens.radius.lg,
    borderWidth: 1.5, marginVertical: tokens.spacing.xs, alignItems: 'center',
  },
  binCardTitle: { fontFamily: tokens.typography.family.semibold, color: colors.muted, fontSize: tokens.typography.size.xs, marginBottom: 4 },
  binCardValue: { fontFamily: tokens.typography.family.extrabold, color: colors.text, fontSize: tokens.typography.size.base },

  /* Tip Box */
  tipBox: {
    marginTop: tokens.spacing.sm, padding: tokens.spacing.sm,
    backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
    borderRadius: tokens.radius.lg, borderWidth: 1,
    borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#a7f3d0',
  },
  tipTitle: { fontFamily: tokens.typography.family.bold, color: isDark ? '#34d399' : '#065f46', marginBottom: 4, fontSize: tokens.typography.size.sm },
  tipText: { color: isDark ? '#6ee7b7' : '#064e3b', fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 19 },

  /* Steps Box */
  stepsBox: {
    marginTop: tokens.spacing.sm, padding: tokens.spacing.sm,
    backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
    borderRadius: tokens.radius.lg,
  },
  stepsTitle: { fontFamily: tokens.typography.family.bold, color: isDark ? '#93c5fd' : '#1e40af', marginBottom: tokens.spacing.xs, fontSize: tokens.typography.size.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  stepNumber: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 11, fontFamily: tokens.typography.family.extrabold, color: isDark ? '#93c5fd' : '#1e40af' },
  stepText: { flex: 1, color: isDark ? '#bfdbfe' : '#1e3a5f', fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 19 },

  /* Harm Box */
  harmBox: {
    marginTop: tokens.spacing.sm, padding: tokens.spacing.sm,
    borderRadius: tokens.radius.lg, borderWidth: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
  },
  harmHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  harmEmoji: { fontSize: 16 },
  harmTitle: { fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm },
  harmText: { color: colors.textSecondary || colors.muted, fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 19, marginTop: 2 },

  /* Non-waste Info */
  nonWasteInfo: {
    flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.xs,
  },
  nonWasteEmoji: { fontSize: 24 },
  nonWasteText: { flex: 1, color: isDark ? '#6ee7b7' : '#065f46', fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 19 },

  /* Scan Again */
  scanAgainBtn: {
    backgroundColor: colors.card, padding: tokens.spacing.md,
    borderRadius: tokens.radius.xl, alignItems: 'center',
    marginTop: tokens.spacing.md, borderWidth: 1, borderColor: colors.accent,
  },
  scanAgainText: { color: colors.accent, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.base },
});
