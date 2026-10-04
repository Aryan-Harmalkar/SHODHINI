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
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Redeemable catalog items
  const redeemOptions = [
    {
      id: 1,
      title: '₹50 Off Waste Utility Bill',
      cost: 100,
      icon: '🧾',
      category: 'Municipal Bills',
      desc: 'Direct credit towards your monthly municipal sanitation fee.',
    },
    {
      id: 2,
      title: 'Free Doorstep Waste Pickup',
      cost: 75,
      icon: '🚚',
      category: 'Services',
      desc: '100% discount voucher for 1 bulk doorstep waste collection.',
    },
    {
      id: 3,
      title: 'Plant a Community Tree',
      cost: 150,
      icon: '🌳',
      category: 'Green Impact',
      desc: 'Sponsor a native fruit/shade sapling planted in your Ward.',
    },
    {
      id: 4,
      title: '₹100 Eco-Grocery Voucher',
      cost: 200,
      icon: '🛒',
      category: 'Shopping',
      desc: 'Valid at organic & zero-waste partner supermarkets.',
    },
  ];

  // Active / Earned coupons
  const [coupons, setCoupons] = useState([
    {
      id: 'c1',
      code: 'CLEANWARD25',
      discount: '₹25 OFF',
      title: 'Waste Pickup Discount',
      desc: 'Valid on doorstep waste collection bookings.',
      expires: 'Valid until Nov 30, 2026',
      status: 'Active',
    },
    {
      id: 'c2',
      code: 'GREENGROCER15',
      discount: '15% OFF',
      title: 'Organic Food & Household',
      desc: 'Valid at partnered green stores on orders above ₹300.',
      expires: 'Valid until Dec 15, 2026',
      status: 'Active',
    },
    {
      id: 'c3',
      code: 'ECOSCRAP10',
      discount: '10% BONUS',
      title: 'Extra Value on Scrap Sale',
      desc: 'Get +10% extra cash payout when recycling metallic scrap.',
      expires: 'Valid until Dec 31, 2026',
      status: 'Active',
    },
  ]);

  // Points history
  const pointsHistory = [
    {
      id: 'h1',
      title: 'Complaint Marked Completed',
      desc: 'Roadside waste cleared by collector in your ward',
      points: '+15 pts',
      date: 'Today',
      type: 'credit',
    },
    {
      id: 'h2',
      title: 'Recycled Electronic Scrap',
      desc: 'Disposed 2 obsolete mobile devices safely',
      points: '+30 pts',
      date: 'Yesterday',
      type: 'credit',
    },
    {
      id: 'h3',
      title: 'Redeemed CLEANWARD25 Coupon',
      desc: 'Doorstep waste pickup discount coupon',
      points: '-50 pts',
      date: '3 days ago',
      type: 'debit',
    },
    {
      id: 'h4',
      title: 'Clean Community Streak',
      desc: '7-day active citizen reporting streak bonus',
      points: '+20 pts',
      date: '1 week ago',
      type: 'credit',
    },
  ];

  const handleRedeem = (item) => {
    if (ecoPoints < item.cost) {
      Alert.alert(
        'Insufficient Eco Points',
        `You need ${item.cost} points to redeem this reward. You currently have ${ecoPoints} points. Report more waste or recycle scrap to earn points!`
      );
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Redeem "${item.title}" for ${item.cost} Eco Points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem Now',
          onPress: () => {
            Alert.alert(
              '🎉 Reward Unlocked!',
              `You have successfully redeemed ${item.title}. The voucher code has been added to your "Use Coupons" tab.`
            );
          },
        },
      ]
    );
  };

  const handleCopyCode = (code) => {
    setCopiedCode(code);
    Alert.alert('Coupon Code Copied', `"${code}" copied! You can apply this code when booking doorstep waste pickup or at checkout.`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🎁 Rewards & Coupons</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Eco Points Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Total Eco Points Balance</Text>
              <Text style={styles.heroPointsVal}>🌱 {ecoPoints} pts</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Level 2 Citizen</Text>
            </View>
          </View>
          <Text style={styles.heroDesc}>
            Earn points every time municipal workers resolve your reported waste spots or when you recycle scrap!
          </Text>

          {/* Quick Summary Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statStripItem}>
              <Text style={styles.statStripVal}>🌱 {ecoPoints}</Text>
              <Text style={styles.statStripLabel}>Redeemable Pts</Text>
            </View>
            <View style={styles.statStripDivider} />
            <TouchableOpacity
              style={styles.statStripItem}
              onPress={() => setActiveTab('coupons')}
              activeOpacity={0.7}
            >
              <Text style={styles.statStripVal}>🎟️ 3</Text>
              <Text style={styles.statStripLabel}>Coupons Earned</Text>
            </TouchableOpacity>
            <View style={styles.statStripDivider} />
            <TouchableOpacity
              style={styles.statStripItem}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.7}
            >
              <Text style={styles.statStripVal}>📈 +65</Text>
              <Text style={styles.statStripLabel}>Points Earned</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'redeem' && styles.activeTabBtn]}
            onPress={() => setActiveTab('redeem')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'redeem' && styles.activeTabBtnText]}>
              🎁 Redeem Points
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'coupons' && styles.activeTabBtn]}
            onPress={() => setActiveTab('coupons')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'coupons' && styles.activeTabBtnText]}>
              🎟️ Use & Earned Coupons
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'history' && styles.activeTabBtn]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.activeTabBtnText]}>
              📜 Points Earned
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: REDEEM POINTS */}
        {activeTab === 'redeem' && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Redeem Eco Points for Rewards</Text>
            <Text style={styles.sectionSubtitle}>
              Exchange your verified clean points for utility discounts, tree saplings, or service coupons.
            </Text>

            {redeemOptions.map((opt) => {
              const canAfford = ecoPoints >= opt.cost;
              return (
                <View key={opt.id} style={styles.rewardCard}>
                  <View style={styles.rewardHeader}>
                    <Text style={styles.rewardIcon}>{opt.icon}</Text>
                    <View style={styles.rewardInfoCol}>
                      <Text style={styles.rewardTitle}>{opt.title}</Text>
                      <Text style={styles.rewardCategory}>{opt.category}</Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Text style={styles.costText}>{opt.cost} pts</Text>
                    </View>
                  </View>

                  <Text style={styles.rewardDesc}>{opt.desc}</Text>

                  <TouchableOpacity
                    style={[styles.redeemBtn, !canAfford && styles.redeemBtnDisabled]}
                    onPress={() => handleRedeem(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.redeemBtnText}>
                      {canAfford ? 'Redeem Reward ✨' : `Need ${opt.cost - ecoPoints} More Points`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: USE COUPONS / COUPONS EARNED */}
        {activeTab === 'coupons' && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Coupons Earned & Available</Text>
            <Text style={styles.sectionSubtitle}>
              Apply these active promo codes on doorstep garbage collection or partner stores.
            </Text>

            {coupons.map((c) => (
              <View key={c.id} style={styles.couponCard}>
                <View style={styles.couponTop}>
                  <View>
                    <Text style={styles.couponDiscount}>{c.discount}</Text>
                    <Text style={styles.couponTitle}>{c.title}</Text>
                  </View>
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>{c.status}</Text>
                  </View>
                </View>

                <Text style={styles.couponDesc}>{c.desc}</Text>
                <Text style={styles.couponExpires}>🗓️ {c.expires}</Text>

                <View style={styles.codeRow}>
                  <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{c.code}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopyCode(c.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.copyBtnText}>
                      {copiedCode === c.code ? '✓ Copied!' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {c.id === 'c1' && onNavigatePickup && (
                  <TouchableOpacity
                    style={styles.applyDirectBtn}
                    onPress={() => onNavigatePickup()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.applyDirectText}>Apply to Waste Pickup 🚚 →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: POINTS EARNED HISTORY */}
        {activeTab === 'history' && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Points Earned & Transaction History</Text>
            <Text style={styles.sectionSubtitle}>
              Complete activity log of all eco-points credited and debited.
            </Text>

            {pointsHistory.map((h) => {
              const isCredit = h.type === 'credit';
              return (
                <View key={h.id} style={styles.historyRow}>
                  <View style={[styles.historyIconBox, isCredit ? styles.iconCredit : styles.iconDebit]}>
                    <Text style={styles.historyIconText}>{isCredit ? '🌱' : '🎁'}</Text>
                  </View>

                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{h.title}</Text>
                    <Text style={styles.historyDesc}>{h.desc}</Text>
                    <Text style={styles.historyDate}>🗓️ {h.date}</Text>
                  </View>

                  <Text style={[styles.historyPoints, isCredit ? styles.pointsPlus : styles.pointsMinus]}>
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
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  backHomeBtn: {
    backgroundColor: tokens.colors.accent + '15',
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
  heroCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    ...tokens.shadow.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  heroLabel: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
    textTransform: 'uppercase',
  },
  heroPointsVal: {
    fontSize: tokens.typography.size.xl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    marginTop: 2,
  },
  heroBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
  },
  heroBadgeText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  heroDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    lineHeight: 18,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  statStripItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statStripVal: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.text,
  },
  statStripLabel: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 2,
    fontWeight: tokens.typography.weight.medium,
  },
  statStripDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.colors.border,
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
    paddingVertical: tokens.spacing.sm,
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
  cardSection: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  sectionSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
    marginBottom: tokens.spacing.md,
    lineHeight: 18,
  },
  rewardCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  rewardIcon: {
    fontSize: 28,
    marginRight: tokens.spacing.sm,
  },
  rewardInfoCol: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  rewardCategory: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  costBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  costText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  rewardDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginBottom: tokens.spacing.md,
    lineHeight: 18,
  },
  redeemBtn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: tokens.colors.muted + '40',
  },
  redeemBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
  couponCard: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  couponTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  couponDiscount: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  couponTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  activePill: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: 2,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  couponDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginBottom: tokens.spacing.xs,
  },
  couponExpires: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginBottom: tokens.spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    alignItems: 'center',
  },
  codeBox: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
  },
  codeText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  applyDirectBtn: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
  },
  applyDirectText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surface,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.spacing.sm,
  },
  iconCredit: {
    backgroundColor: tokens.colors.accent + '20',
  },
  iconDebit: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  historyIconText: {
    fontSize: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  historyDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  historyDate: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  historyPoints: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.extrabold,
  },
  pointsPlus: {
    color: tokens.colors.accent,
  },
  pointsMinus: {
    color: tokens.colors.danger,
  },
});
