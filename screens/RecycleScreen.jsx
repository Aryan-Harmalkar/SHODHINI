import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function RecycleScreen({ user, onBackToHome, onOpenSidebar }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [address, setAddress] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [note, setNote] = useState('');

  const RECYCLE_ITEMS = [
    { id: 'ewaste', label: 'E-Waste (Phones, Laptops, Cables)', pts: 50 },
    { id: 'metal', label: 'Metal Scrap', pts: 30 },
    { id: 'paper', label: 'Paper & Cardboard', pts: 20 },
    { id: 'plastic', label: 'Hard Plastics', pts: 20 },
    { id: 'glass', label: 'Glass Bottles', pts: 15 },
  ];

  const toggleItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const calculateEstimatedPoints = () => {
    return selectedItems.reduce((total, itemId) => {
      const item = RECYCLE_ITEMS.find((i) => i.id === itemId);
      return total + (item ? item.pts : 0);
    }, 0);
  };

  const handleBookRecycle = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Select Items', 'Please select at least one type of material to recycle.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your pickup address.');
      return;
    }

    const pts = calculateEstimatedPoints();
    Alert.alert(
      'Recycle Pickup Scheduled! ♻️',
      `Our recycling partner will contact you soon. You can earn up to ${pts} Eco Points for this contribution!`,
      [{ text: 'Great!', onPress: () => onBackToHome() }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Recycle Scrap</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBanner}>
          <View style={styles.ecoBadge}>
            <Text style={styles.ecoBadgeText}>EARN ECO POINTS</Text>
          </View>
          <Text style={styles.heroTitle}>Turn Scrap into Rewards</Text>
          <Text style={styles.heroDesc}>
            Don't throw away valuable recyclables. Schedule a free pickup and earn Eco Points for contributing to a circular economy.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>What are you recycling?</Text>
          <Text style={styles.formSubtitle}>Select all that apply.</Text>

          <View style={styles.itemsList}>
            {RECYCLE_ITEMS.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, isSelected && styles.activeItemRow]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.ptsBadge}>
                    <Text style={styles.ptsBadgeText}>+{item.pts} pts</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.estPointsBox}>
            <Text style={styles.estPointsLabel}>Estimated Reward:</Text>
            <Text style={styles.estPointsValue}>+{calculateEstimatedPoints()} Eco Points</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 302, Green Valley Apts"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Approximate Quantity/Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="e.g. 2 old laptops and a bag of plastic bottles..."
              placeholderTextColor={colors.muted}
              multiline
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleBookRecycle} activeOpacity={0.7}>
            <Text style={styles.submitBtnText}>Schedule Free Pickup ♻️</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    backgroundColor: colors.card,
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
    gap: tokens.spacing.sm,
  },
  themeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 16,
  },
  menuBtn: {
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
  screenTitle: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  backHomeBtn: {
    backgroundColor: colors.surface,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  backHomeText: {
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
  },
  heroBanner: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 2,
    borderColor: colors.accent + '30',
    ...tokens.shadow.sm,
  },
  ecoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    marginBottom: tokens.spacing.sm,
  },
  ecoBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.extrabold,
    color: colors.accent,
  },
  heroTitle: {
    fontSize: tokens.typography.size.lg,
    fontFamily: tokens.typography.family.extrabold,
    color: colors.text,
    marginBottom: tokens.spacing.xs,
  },
  heroDesc: {
    fontSize: tokens.typography.size.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...tokens.shadow.sm,
  },
  formTitle: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  formSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    marginBottom: tokens.spacing.md,
  },
  itemsList: {
    marginBottom: tokens.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  activeItemRow: {
    backgroundColor: colors.accent + (isDark ? '20' : '10'),
    borderColor: colors.accent,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: tokens.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: isDark ? '#000' : '#fff',
    fontSize: 14,
    fontFamily: tokens.typography.family.extrabold,
  },
  itemLabel: {
    fontSize: tokens.typography.size.sm,
    color: colors.text,
    flexShrink: 1,
    marginRight: tokens.spacing.sm,
    fontFamily: tokens.typography.family.semibold,
  },
  itemLabelActive: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  ptsBadge: {
    backgroundColor: colors.accent + '20',
    paddingVertical: 2,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  ptsBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.extrabold,
    color: colors.accent,
  },
  estPointsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  estPointsLabel: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  estPointsValue: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.extrabold,
    color: colors.accent,
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  inputLabel: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.semibold,
    color: colors.text,
    marginBottom: tokens.spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.sm,
    color: colors.text,
    minHeight: 48,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    marginTop: tokens.spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtnText: {
    color: isDark ? '#000' : '#fff',
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
  },
});
