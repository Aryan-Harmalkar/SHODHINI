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

export default function WastePickupScreen({ user, onBackToHome, onOpenSidebar }) {
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [address, setAddress] = useState('');
  const [wasteType, setWasteType] = useState('household');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [note, setNote] = useState('');

  const handleBookPickup = () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your pickup address to proceed.');
      return;
    }
    Alert.alert(
      'Pickup Requested ✅',
      'A collection worker will be assigned to your address shortly. You can pay them directly via UPI/Cash.',
      [{ text: 'OK', onPress: () => onBackToHome() }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Waste Pickup</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroBanner}>
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>PAID SERVICE</Text>
          </View>
          <Text style={styles.heroTitle}>Doorstep Waste Collection</Text>
          <Text style={styles.heroDesc}>
            No dustbin nearby? Too much waste? Request an immediate pickup directly from your doorstep.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Select Volume Plan</Text>
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'standard' && styles.activePlanCard]}
            onPress={() => setSelectedPlan('standard')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Standard</Text>
              <Text style={styles.planPrice}>₹40</Text>
            </View>
            <Text style={styles.planDetails}>Up to 2 bags of regular household daily waste.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'bulk' && styles.activePlanCard]}
            onPress={() => setSelectedPlan('bulk')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Bulk / Garden</Text>
              <Text style={styles.planPrice}>₹120</Text>
            </View>
            <Text style={styles.planDetails}>Heavy yard waste, furniture, renovation scraps.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Pickup Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address / Flat No. & Landmark</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 302, Green Valley Apts, Main Road"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Waste Category</Text>
            <View style={styles.pillRow}>
              {[
                { id: 'household', label: 'Household (Dry/Wet)' },
                { id: 'bulk', label: 'Bulk & Furniture' },
                { id: 'garden', label: 'Garden & Leaves' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pill, wasteType === item.id && styles.activePill]}
                  onPress={() => setWasteType(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, wasteType === item.id && styles.activePillText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Pickup Time</Text>
            <View style={styles.pillRow}>
              {[
                { id: 'morning', label: 'Morning (8am - 11am)' },
                { id: 'afternoon', label: 'Afternoon (1pm - 4pm)' },
                { id: 'evening', label: 'Evening (5pm - 8pm)' },
              ].map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.pill, timeSlot === slot.id && styles.activePill]}
                  onPress={() => setTimeSlot(slot.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, timeSlot === slot.id && styles.activePillText]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70 }]}
              placeholder="Any specific instructions for the collection worker..."
              multiline
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              💳 Payment of {selectedPlan === 'standard' ? '₹40' : '₹120'} can be made directly to the collection partner via Cash or UPI upon pickup.
            </Text>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleBookPickup} activeOpacity={0.7}>
            <Text style={styles.submitBtnText}>Request Doorstep Pickup 🚚</Text>
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
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
  },
  paidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffb300',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    marginBottom: tokens.spacing.sm,
  },
  paidBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#212121',
  },
  heroTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.background,
    marginBottom: tokens.spacing.xs,
  },
  heroDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.background,
    opacity: 0.9,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  planCard: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    borderWidth: 2,
    borderColor: tokens.colors.border,
  },
  activePlanCard: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accent + '10',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  planName: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  planPrice: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  planDetails: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    lineHeight: 18,
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
    marginBottom: tokens.spacing.md,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  pill: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: tokens.colors.accent,
  },
  pillText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.semibold,
  },
  activePillText: {
    color: tokens.colors.background,
  },
  noticeBox: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  noticeText: {
    fontSize: tokens.typography.size.xs,
    color: '#795548',
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
});
