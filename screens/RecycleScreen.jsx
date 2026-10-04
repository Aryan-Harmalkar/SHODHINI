import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { tokens } from '../lib/theme';

export default function RecycleScreen({ user, onBackToHome, onOpenSidebar }) {
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

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
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
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Approximate Quantity/Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="e.g. 2 old laptops and a bag of plastic bottles..."
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
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.bold,
  },
  screenTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  backHomeBtn: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backHomeText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  heroBanner: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 2,
    borderColor: tokens.colors.accent + '30',
    ...tokens.shadow.sm,
  },
  ecoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    marginBottom: tokens.spacing.sm,
  },
  ecoBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  heroTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  heroDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  formTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  formSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
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
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    minHeight: 48,
  },
  activeItemRow: {
    backgroundColor: tokens.colors.accent + '10',
    borderColor: tokens.colors.accent,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: tokens.colors.borderFocus,
    marginRight: tokens.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  checkMark: {
    color: tokens.colors.background,
    fontSize: 14,
    fontWeight: tokens.typography.weight.extrabold,
  },
  itemLabel: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.semibold,
  },
  itemLabelActive: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  ptsBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: 2,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  ptsBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  estPointsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderWidth: 2,
    borderColor: tokens.colors.borderFocus,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  estPointsLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  estPointsValue: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  inputLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  input: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    minHeight: 48,
  },
  submitBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    marginTop: tokens.spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
});
