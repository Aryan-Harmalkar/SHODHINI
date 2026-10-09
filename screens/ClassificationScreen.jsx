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

export default function ClassificationScreen({ onBackToHome, onOpenSidebar }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [imageUri, setImageUri] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setBase64Data(res.assets[0].base64);
      setResult(null);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required to upload photos.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
      setBase64Data(res.assets[0].base64);
      setResult(null);
    }
  };

  const classifyImage = async () => {
    if (!base64Data) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await classifyWasteWithGemini({ base64: base64Data });
      setResult(data);
    } catch (err) {
      Alert.alert('Classification Error', err.message || 'Failed to classify image.');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>What type of waste is this?</Text>
        <Text style={styles.subtitle}>
          Upload a photo and AI will tell you how to dispose or recycle it properly.
        </Text>

        {!imageUri ? (
          <View style={styles.actionBox}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconLarge}>🤖</Text>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Text style={styles.btnIcon}>📷</Text>
                <Text style={styles.btnText}>Take Photo</Text>
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
            <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImageUri(null); setBase64Data(null); setResult(null); }}>
              <Text style={styles.retakeBtnText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {imageUri && !result && !loading && (
          <TouchableOpacity style={styles.classifyBtn} onPress={classifyImage} activeOpacity={0.8}>
            <Text style={styles.classifyBtnText}>🔍 Analyze Waste</Text>
          </TouchableOpacity>
        )}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>AI is analyzing your image...</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>✅</Text>
              <Text style={styles.resultTitle}>{result.item || 'Item Recognized'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{result.category}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dustbin Type:</Text>
              <Text style={styles.detailValue}>{result.dustbinColor}</Text>
            </View>
            
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>How to Dispose:</Text>
              <Text style={styles.instructionsText}>{result.instructions}</Text>
            </View>

            {result.isRecyclable && (
              <View style={styles.recycleBox}>
                <Text style={styles.recycleTitle}>♻️ Recyclable</Text>
                <Text style={styles.recycleText}>{result.recyclingDetails}</Text>
              </View>
            )}
            {!result.isRecyclable && (
              <View style={styles.notRecycleBox}>
                <Text style={styles.notRecycleText}>🚫 Not Recyclable</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

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
  scrollContent: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xxl },
  
  title: { fontSize: tokens.typography.size.xl, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginBottom: tokens.spacing.xs },
  subtitle: { fontSize: tokens.typography.size.sm, color: colors.muted, fontFamily: tokens.typography.family.medium, marginBottom: tokens.spacing.xl },
  
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
    marginBottom: tokens.spacing.lg,
  },
  iconLarge: { fontSize: 40 },
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
  
  imagePreviewBox: {
    width: '100%', height: 300,
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
  
  classifyBtn: {
    backgroundColor: colors.accent, padding: tokens.spacing.md,
    borderRadius: tokens.radius.xl, alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  classifyBtnText: { color: colors.background, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.base },

  loadingBox: { alignItems: 'center', marginVertical: tokens.spacing.xl },
  loadingText: { marginTop: tokens.spacing.sm, color: colors.muted, fontFamily: tokens.typography.family.medium },

  resultCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs, marginBottom: tokens.spacing.md },
  resultIcon: { fontSize: 24 },
  resultTitle: { fontSize: tokens.typography.size.lg, fontFamily: tokens.typography.family.extrabold, color: colors.text },
  
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm },
  detailValue: { color: colors.text, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm, maxWidth: '70%', textAlign: 'right' },
  
  instructionsBox: { marginTop: tokens.spacing.md, padding: tokens.spacing.sm, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: tokens.radius.lg },
  instructionsTitle: { fontFamily: tokens.typography.family.bold, color: colors.text, marginBottom: 4, fontSize: tokens.typography.size.sm },
  instructionsText: { color: colors.textSecondary, fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 20 },
  
  recycleBox: { marginTop: tokens.spacing.md, padding: tokens.spacing.sm, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: isDark ? '#10b981' : '#34d399' },
  recycleTitle: { fontFamily: tokens.typography.family.bold, color: isDark ? '#34d399' : '#065f46', marginBottom: 4, fontSize: tokens.typography.size.sm },
  recycleText: { color: isDark ? '#6ee7b7' : '#064e3b', fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, lineHeight: 20 },
  
  notRecycleBox: { marginTop: tokens.spacing.md, padding: tokens.spacing.sm, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2', borderRadius: tokens.radius.lg, alignItems: 'center' },
  notRecycleText: { color: isDark ? '#f87171' : '#991b1b', fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm },
});
