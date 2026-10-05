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

  const [activeTab, setActiveTab] = useState(initialTab || 'redeem');

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'coupons') setActiveTab('coupons');
      else if (initialTab === 'history') setActiveTab('history');
      else setActiveTab('redeem');
    }
  }, [initialTab]);

  const redeemOptions = [
    {
      id: 'r1',
      title: '₹50 Municipal Tax Discount',
      cost: 50,
      icon: '🏛️',
      category: 'Municipal Utility',
    },
    {
      id: 'r2',
      title: 'Free Tree Sapling & Planter',
      cost: 30,
      icon: '🪴',
      category: 'Environment',
    },
    {
      id: 'r3',
      title: 'Free Doorstep Bulky Waste Pickup',
      cost: 40,
      icon: '🚚',
      category: 'Sanitation Service',
    },
    {
      id: 'r4',
      title: '₹100 Eco-Grocery Voucher',
      cost: 100,
      icon: '🥬',
      category: 'Retail Discount',
    },
  ];

  const earnedCoupons = [
    {
      id: 'c1',
      code: 'GREENMUNI50',
      title: '₹50 Property/Water Tax Rebate',
      validTill: '31 Dec 2026',
      icon: '🏛️',
    },
    {
      id: 'c2',
      code: 'FREEPICKUP26',
      title: '1x Free Bulky Waste Pickup',
      validTill: '15 Nov 2026',
      icon: '🚚',
    },
    {
      id: 'c3',
      code: 'ECOSCRAP10',
      title: '10% Extra Bonus on Scrap Sale',
      validTill: '30 Oct 2026',
      icon: '♻️',
    },
  ];

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

  const handleRedeem = (item) => {
    if (ecoPoints < item.cost) {
      Alert.alert(
        'Insufficient Points',
        `You need ${item.cost} points for this reward. You currently have ${ecoPoints} points.`
      );
      return;
    }
    Alert.alert(
      'Confirm Redemption',
      `Redeem "${item.title}" for ${item.cost} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: () => {
            Alert.alert(
              'Reward Redeemed 🎉',
              `Coupon for ${item.title} has been generated in "My Coupons"!`
            );
            setActiveTab('coupons');
          },
        },
      ]
    );
  };

  const handleCopyCode = (code) => {
    Alert.alert('Code Copied', `Coupon code "${code}" is ready to use!`);
  };

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

        {/* Minimal Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'redeem' && styles.activeTabBtn]}
            onPress={() => setActiveTab('redeem')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'redeem' && styles.activeTabBtnText]}>
              Redeem
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'coupons' && styles.activeTabBtn]}
            onPress={() => setActiveTab('coupons')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'coupons' && styles.activeTabBtnText]}>
              My Coupons ({earnedCoupons.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.activeTabBtn]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.activeTabBtnText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: REDEEM REWARDS */}
        {activeTab === 'redeem' && (
          <View style={styles.listContainer}>
            {redeemOptions.map((opt) => {
              const canAfford = ecoPoints >= opt.cost;
              return (
                <View key={opt.id} style={styles.rewardCard}>
                  <Text style={styles.rewardIcon}>{opt.icon}</Text>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardTitle}>{opt.title}</Text>
                    <Text style={styles.rewardCost}>{opt.cost} points</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                    onPress={() => handleRedeem(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.redeemBtnText}>
                      {canAfford ? 'Redeem' : 'Need pts'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: MY COUPONS */}
        {activeTab === 'coupons' && (
          <View style={styles.listContainer}>
            {earnedCoupons.map((c) => (
              <View key={c.id} style={styles.couponCard}>
                <Text style={styles.couponIcon}>{c.icon}</Text>
                <View style={styles.couponInfo}>
                  <Text style={styles.couponTitle}>{c.title}</Text>
                  <Text style={styles.couponCode}>{c.code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => handleCopyCode(c.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: POINTS HISTORY */}
        {activeTab === 'history' && (
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
        )}
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
