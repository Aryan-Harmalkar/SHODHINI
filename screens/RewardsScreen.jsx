import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { tokens } from '../lib/theme';

export default function RewardsScreen({
  user,
  ecoPoints = 0,
  initialTab = 'redeem',
  onBackToHome,
  onOpenSidebar,
  onNavigatePickup,
}) {
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

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
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
                  <Text style={[styles.historyPoints, { color: isCredit ? tokens.colors.accent : tokens.colors.danger }]}>
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
    paddingVertical: tokens.spacing.sm,
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
    minHeight: 40,
    minWidth: 40,
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
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  backHomeBtn: {
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  backHomeText: {
    color: tokens.colors.text,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  balanceLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
  },
  balanceVal: {
    fontSize: tokens.typography.size.xl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    marginTop: 2,
  },
  earnMoreBtn: {
    backgroundColor: tokens.colors.accent + '15',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  earnMoreText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: 3,
    marginBottom: tokens.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  activeTabBtn: {
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  tabBtnText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
  },
  activeTabBtnText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  listContainer: {
    gap: tokens.spacing.sm,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
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
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  rewardCost: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
    marginTop: 2,
  },
  redeemBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  redeemBtnDisabled: {
    backgroundColor: tokens.colors.muted + '40',
  },
  redeemBtnText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
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
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  couponCode: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  copyBtnText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  historyCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surface,
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
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
  },
  historyDate: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  historyPoints: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.extrabold,
  },
});
