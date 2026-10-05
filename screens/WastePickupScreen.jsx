import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';
import { getUserEcoPoints, updateUserEcoPoints } from '../db/database';

export default function WastePickupScreen({
  user,
  onBackToHome,
  onOpenSidebar,
  ecoPoints = 0,
  onPointsUpdated,
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [address, setAddress] = useState('');
  const [wasteType, setWasteType] = useState('household');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [note, setNote] = useState('');
  const [userPoints, setUserPoints] = useState(ecoPoints);
  const [submitting, setSubmitting] = useState(false);

  // Sync points from props or fetch freshly from database
  useEffect(() => {
    setUserPoints(ecoPoints);
  }, [ecoPoints]);

  useEffect(() => {
    if (user?.id) {
      getUserEcoPoints(user.id).then((pts) => {
        if (typeof pts === 'number') {
          setUserPoints(pts);
          if (onPointsUpdated) onPointsUpdated(pts);
        }
      });
    }
  }, [user?.id]);

  const costMoney = selectedPlan === 'standard' ? 40 : 120;
  const costPoints = selectedPlan === 'standard' ? 40 : 120;
  const hasEnoughPoints = userPoints >= costPoints;

  // Selected payment method: 'points' or 'money'
  const [paymentChoice, setPaymentChoice] = useState(hasEnoughPoints ? 'points' : 'money');

  // Handle plan switch
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    const required = plan === 'standard' ? 40 : 120;
    if (paymentChoice === 'points' && userPoints < required) {
      setPaymentChoice('money');
    }
  };

  const handleBookPickup = async () => {
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter your pickup address / landmark to proceed.');
      return;
    }

    if (paymentChoice === 'points') {
      if (userPoints < costPoints) {
        Alert.alert(
          'Insufficient Eco Points',
          `You need ${costPoints} Eco Points for this pickup, but currently have ${userPoints} points. Please select 'Pay with Money (₹${costMoney})'.`
        );
        return;
      }

      setSubmitting(true);
      try {
        if (user?.id) {
          const updated = await updateUserEcoPoints(user.id, -costPoints);
          setUserPoints(updated);
          if (onPointsUpdated) onPointsUpdated(updated);
        }

        Alert.alert(
          'Pickup Booked with Eco Points! 🌱',
          `Successfully redeemed ${costPoints} Eco Points for your ${selectedPlan === 'standard' ? 'Standard' : 'Bulk'} doorstep pickup. A sanitation worker will arrive at your address. No cash payment needed!`,
          [{ text: 'OK', onPress: () => onBackToHome() }]
        );
      } catch (err) {
        Alert.alert('Error', err.message || 'Could not process points redemption.');
      } finally {
        setSubmitting(false);
      }
    } else {
      Alert.alert(
        'Pickup Requested ✅',
        `A collection partner will be assigned to your address for ${timeSlot} pickup. Please pay ₹${costMoney} directly via Cash or UPI upon arrival.`,
        [{ text: 'OK', onPress: () => onBackToHome() }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Doorstep Pickup</Text>
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
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>🌱 FREE WITH POINTS OR CASH</Text>
          </View>
          <Text style={styles.heroTitle}>Doorstep Waste Collection</Text>
          <Text style={styles.heroDesc}>
            Request an immediate waste collection partner directly to your doorstep in Assagao.
          </Text>
        </View>

        {/* Volume Plans */}
        <Text style={styles.sectionLabel}>Select Volume Plan</Text>
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'standard' && styles.activePlanCard]}
            onPress={() => handleSelectPlan('standard')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Standard</Text>
              <Text style={styles.planPrice}>₹40 / 40 pts</Text>
            </View>
            <Text style={styles.planDetails}>Up to 2 bags of daily household or segregated waste.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'bulk' && styles.activePlanCard]}
            onPress={() => handleSelectPlan('bulk')}
            activeOpacity={0.7}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Bulk / Garden</Text>
              <Text style={styles.planPrice}>₹120 / 120 pts</Text>
            </View>
            <Text style={styles.planDetails}>Heavy yard clippings, old furniture, renovation scraps.</Text>
          </TouchableOpacity>
        </View>

        {/* Payment & Points Redemption Section */}
        <Text style={styles.sectionLabel}>Payment & Eco Points Redemption</Text>

        {/* User Balance Header Strip */}
        <View style={styles.balanceStrip}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceIcon}>🌱</Text>
            <View>
              <Text style={styles.balanceTitle}>Your Eco Points Balance</Text>
              <Text style={styles.balancePoints}>{userPoints} Points</Text>
            </View>
          </View>
          {hasEnoughPoints ? (
            <View style={styles.eligibleBadge}>
              <Text style={styles.eligibleBadgeText}>FREE PICKUP ELIGIBLE</Text>
            </View>
          ) : (
            <View style={styles.needMoreBadge}>
              <Text style={styles.needMoreBadgeText}>Need {costPoints - userPoints} more pts</Text>
            </View>
          )}
        </View>

        {/* Payment Method Option Cards */}
        <View style={styles.paymentMethodsRow}>
          {/* OPTION 1: REDEEM ECO POINTS */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentChoice === 'points' && styles.paymentCardActive,
              !hasEnoughPoints && styles.paymentCardDisabled,
            ]}
            onPress={() => {
              if (hasEnoughPoints) {
                setPaymentChoice('points');
              } else {
                Alert.alert(
                  'Insufficient Points',
                  `You have ${userPoints} points, but this pickup requires ${costPoints} points. You can select 'Pay with Money (₹${costMoney})' instead!`
                );
              }
            }}
            activeOpacity={hasEnoughPoints ? 0.7 : 0.9}
          >
            <View style={styles.paymentCardTop}>
              <Text style={styles.paymentMethodTitle}>🌱 Use Eco Points</Text>
              {paymentChoice === 'points' && <Text style={styles.checkedCircle}>✓</Text>}
            </View>
            <Text style={styles.paymentCostText}>
              {costPoints} Points{' '}
              <Text style={hasEnoughPoints ? styles.freeHighlight : styles.disabledHighlight}>
                {hasEnoughPoints ? '(100% Free)' : '(Locked)'}
              </Text>
            </Text>
            <Text style={styles.paymentDescText}>
              {hasEnoughPoints
                ? `Remaining after booking: ${userPoints - costPoints} pts.`
                : `You need ${costPoints - userPoints} more points to redeem.`}
            </Text>
          </TouchableOpacity>

          {/* OPTION 2: PAY WITH MONEY */}
          <TouchableOpacity
            style={[
              styles.paymentCard,
              paymentChoice === 'money' && styles.paymentCardActive,
            ]}
            onPress={() => setPaymentChoice('money')}
            activeOpacity={0.7}
          >
            <View style={styles.paymentCardTop}>
              <Text style={styles.paymentMethodTitle}>💵 Pay with Money</Text>
              {paymentChoice === 'money' && <Text style={styles.checkedCircle}>✓</Text>}
            </View>
            <Text style={styles.paymentCostText}>₹{costMoney}</Text>
            <Text style={styles.paymentDescText}>
              Pay the sanitation worker directly via UPI or Cash upon pickup.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Inputs */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Pickup Location & Schedule</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address / House No. & Landmark</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. House No. 42, Near Munang Chapel, Assagao"
              placeholderTextColor={colors.muted}
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
            <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 65 }]}
              placeholder="e.g. Leave bags near gate, call on arrival..."
              placeholderTextColor={colors.muted}
              multiline
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
            />
          </View>

          {/* Dynamic Notice Banner */}
          <View
            style={[
              styles.noticeBox,
              paymentChoice === 'points' ? styles.noticeBoxPoints : styles.noticeBoxMoney,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                paymentChoice === 'points' ? styles.noticeTextPoints : styles.noticeTextMoney,
              ]}
            >
              {paymentChoice === 'points'
                ? `🌱 100% Free Pickup! ${costPoints} Eco Points will be deducted from your balance upon confirmation.`
                : `💵 Payment of ₹${costMoney} can be made directly to the collection partner via Cash or UPI upon pickup.`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleBookPickup}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {paymentChoice === 'points'
                  ? `Redeem ${costPoints} pts & Book Free Pickup 🚚`
                  : `Book Pickup for ₹${costMoney} 🚚`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
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
      fontWeight: tokens.typography.weight.bold,
    },
    screenTitle: {
      fontSize: tokens.typography.size.base,
      fontWeight: tokens.typography.weight.bold,
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
      fontWeight: tokens.typography.weight.bold,
    },
    scrollContent: {
      padding: tokens.spacing.md,
      paddingBottom: tokens.spacing.xxl,
    },
    heroBanner: {
      backgroundColor: colors.accent,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
    },
    paidBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#fef08a',
      paddingVertical: 3,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      marginBottom: tokens.spacing.sm,
    },
    paidBadgeText: {
      fontSize: 10,
      fontWeight: tokens.typography.weight.extrabold,
      color: '#854d0e',
      letterSpacing: 0.5,
    },
    heroTitle: {
      fontSize: tokens.typography.size.lg,
      fontWeight: tokens.typography.weight.extrabold,
      color: '#ffffff',
      marginBottom: tokens.spacing.xs,
    },
    heroDesc: {
      fontSize: tokens.typography.size.xs,
      color: 'rgba(255,255,255,0.92)',
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
      marginBottom: tokens.spacing.sm,
      marginTop: tokens.spacing.xs,
    },
    plansContainer: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.md,
    },
    planCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
    },
    activePlanCard: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
    },
    planHeader: {
      marginBottom: 4,
    },
    planName: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
    },
    planPrice: {
      fontSize: tokens.typography.size.base,
      fontWeight: tokens.typography.weight.extrabold,
      color: colors.accent,
      marginTop: 2,
    },
    planDetails: {
      fontSize: 11,
      color: colors.muted,
      lineHeight: 16,
      marginTop: 2,
    },
    balanceStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: tokens.spacing.sm,
    },
    balanceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.sm,
    },
    balanceIcon: {
      fontSize: 24,
    },
    balanceTitle: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: tokens.typography.weight.medium,
    },
    balancePoints: {
      fontSize: tokens.typography.size.base,
      fontWeight: tokens.typography.weight.extrabold,
      color: isDark ? '#4ade80' : '#15803d',
    },
    eligibleBadge: {
      backgroundColor: isDark ? 'rgba(34,197,94,0.2)' : '#dcfce7',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: '#86efac',
    },
    eligibleBadgeText: {
      fontSize: 10,
      fontWeight: tokens.typography.weight.extrabold,
      color: isDark ? '#4ade80' : '#166534',
    },
    needMoreBadge: {
      backgroundColor: isDark ? 'rgba(234,179,8,0.15)' : '#fef9c3',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: '#fde047',
    },
    needMoreBadgeText: {
      fontSize: 10,
      fontWeight: tokens.typography.weight.bold,
      color: isDark ? '#facc15' : '#854d0e',
    },
    paymentMethodsRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.md,
    },
    paymentCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      borderWidth: 2,
      borderColor: colors.border,
    },
    paymentCardActive: {
      borderColor: colors.accent,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
    },
    paymentCardDisabled: {
      opacity: 0.65,
      backgroundColor: isDark ? 'rgba(148,163,184,0.06)' : '#f8fafc',
    },
    paymentCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    paymentMethodTitle: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
    },
    checkedCircle: {
      fontSize: 14,
      fontWeight: tokens.typography.weight.bold,
      color: colors.accent,
    },
    paymentCostText: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.extrabold,
      color: colors.text,
      marginTop: 2,
    },
    freeHighlight: {
      color: '#22c55e',
      fontWeight: tokens.typography.weight.extrabold,
    },
    disabledHighlight: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: tokens.typography.weight.medium,
    },
    paymentDescText: {
      fontSize: 10,
      color: colors.muted,
      lineHeight: 14,
      marginTop: 4,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    formTitle: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
      marginBottom: tokens.spacing.md,
    },
    inputGroup: {
      marginBottom: tokens.spacing.md,
    },
    inputLabel: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.semibold,
      color: colors.text,
      marginBottom: tokens.spacing.xs,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      minHeight: 44,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.xs,
    },
    pill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      justifyContent: 'center',
    },
    activePill: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      fontSize: 11,
      color: colors.text,
      fontWeight: tokens.typography.weight.semibold,
    },
    activePillText: {
      color: '#ffffff',
    },
    noticeBox: {
      borderRadius: tokens.radius.md,
      padding: tokens.spacing.sm,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
    },
    noticeBoxPoints: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
      borderColor: isDark ? 'rgba(34, 197, 94, 0.35)' : '#bbf7d0',
    },
    noticeBoxMoney: {
      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.12)' : '#fffbeb',
      borderColor: isDark ? 'rgba(234, 179, 8, 0.35)' : '#fef08a',
    },
    noticeText: {
      fontSize: 11,
      lineHeight: 18,
    },
    noticeTextPoints: {
      color: isDark ? '#86efac' : '#166534',
    },
    noticeTextMoney: {
      color: isDark ? '#fde047' : '#854d0e',
    },
    submitBtn: {
      backgroundColor: colors.accent,
      paddingVertical: tokens.spacing.md,
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    submitBtnText: {
      color: '#ffffff',
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
    },
  });
