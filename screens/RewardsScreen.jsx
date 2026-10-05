import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function RewardsScreen({
  user,
  ecoPoints = 0,
  initialTab = 'redeem',
  onBackToHome,
  onOpenSidebar,
  onNavigatePickup,
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    setActiveTab('history');
  }, [initialTab]);

  // Redemption and coupons removed for now

  const pointsHistory = [
    {
      id: 'h1',
      title: 'Complaint Resolved: Overflowing Dustbin',
      date: 'Today, 2:30 PM',
      points: '+15',
      type: 'credit',
      icon: '✅',
    },
    {
      id: 'h2',
      title: 'Scrap Recycled: 12kg Old Newspaper',
      date: 'Yesterday',
      points: '+25',
      type: 'credit',
      icon: '♻️',
    },
    {
      id: 'h3',
      title: 'Redeemed Free Doorstep Waste Pickup',
      date: '01 Oct 2026',
      points: '-40',
      type: 'debit',
      icon: '🎟️',
    },
    {
      id: 'h4',
      title: 'Complaint Resolved: Illegal Dumping Spot',
      date: '28 Sep 2026',
      points: '+15',
      type: 'credit',
      icon: '✅',
    },
  ];

  // Handlers for redemption removed

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🎁 Rewards</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sleek Balance Banner */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceVal}>🌱 {ecoPoints} pts</Text>
          </View>
          <TouchableOpacity
            style={styles.earnMoreBtn}
            onPress={onBackToHome}
            activeOpacity={0.7}
          >
            <Text style={styles.earnMoreText}>+ Earn More</Text>
          </TouchableOpacity>
        </View>

        {/* POINTS HISTORY */}
        <Text style={{
          fontSize: tokens.typography.size.sm,
          fontFamily: tokens.typography.family.bold,
          color: colors.text,
          marginBottom: tokens.spacing.md,
        }}>Points History</Text>
        <View style={styles.historyCard}>
            {pointsHistory.map((h) => {
              const isCredit = h.type === 'credit';
              return (
                <View key={h.id} style={styles.historyRow}>
                  <Text style={styles.historyIcon}>{h.icon}</Text>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{h.title}</Text>
                    <Text style={styles.historyDate}>{h.date}</Text>
                  </View>
                  <Text style={[styles.historyPoints, { color: isCredit ? colors.accent : colors.danger }]}>
                    {h.points}
                  </Text>
                </View>
              );
            })}
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
    paddingVertical: tokens.spacing.sm,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    minHeight: 40,
    minWidth: 40,
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
    fontFamily: tokens.typography.family.extrabold,
    color: colors.accent,
  },
  backHomeBtn: {
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backHomeText: {
    color: colors.text,
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.semibold,
  },
  scrollContent: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxl,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
  },
  balanceVal: {
    fontSize: tokens.typography.size.xl,
    fontFamily: tokens.typography.family.extrabold,
    color: colors.accent,
    marginTop: 2,
  },
  earnMoreBtn: {
    backgroundColor: colors.accent + '20',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
  },
  earnMoreText: {
    color: colors.accent,
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.xl,
    padding: 3,
    marginBottom: tokens.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
  },
  activeTabBtn: {
    backgroundColor: colors.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...tokens.shadow.sm,
  },
  tabBtnText: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.semibold,
    color: colors.muted,
  },
  activeTabBtnText: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  listContainer: {
    gap: tokens.spacing.sm,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rewardIcon: {
    fontSize: 24,
    marginRight: tokens.spacing.sm,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  rewardCost: {
    fontSize: tokens.typography.size.xs,
    color: colors.accent,
    fontFamily: tokens.typography.family.semibold,
    marginTop: 2,
  },
  redeemBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  redeemBtnDisabled: {
    backgroundColor: colors.muted + '40',
  },
  redeemBtnText: {
    color: isDark ? '#000' : '#fff',
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  couponIcon: {
    fontSize: 24,
    marginRight: tokens.spacing.sm,
  },
  couponInfo: {
    flex: 1,
  },
  couponTitle: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  couponCode: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
  },
  copyBtnText: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
    color: colors.accent,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIcon: {
    fontSize: 18,
    marginRight: tokens.spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.semibold,
    color: colors.text,
  },
  historyDate: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  historyPoints: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.extrabold,
  },
});
