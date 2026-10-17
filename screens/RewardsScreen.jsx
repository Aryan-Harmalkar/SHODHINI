import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { tokens, useTheme } from '../lib/theme';
import { updateUserEcoPoints } from '../db/database';

const VOUCHERS_STORAGE_KEY = 'shodhini_user_vouchers_';

const REWARDS_CATALOG = [
  {
    id: 'elec_100',
    title: 'Electricity Bill Waiver - ₹100 Off',
    points: 50,
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹100 Waiver',
    tag: 'Popular',
    description: 'Direct ₹100 deduction voucher for your monthly State Electricity Board or Panchayat energy bill. Valid for all residential meters.',
    terms: 'Present voucher code at the local electricity sub-station counter or apply during online bill payment.',
    expiryDays: 60,
  },
  {
    id: 'elec_250',
    title: 'Electricity Bill Waiver - ₹250 Off',
    points: 100,
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹250 Waiver',
    tag: 'Best Value',
    description: 'Substantial ₹250 rebate voucher on your residential power invoice under the Green Citizen Clean Energy Subsidy.',
    terms: 'Valid on bills above ₹300. One voucher allowed per billing cycle per meter number.',
    expiryDays: 60,
  },
  {
    id: 'elec_500',
    title: 'Electricity Bill Waiver - ₹500 Off',
    points: 200,
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹500 Waiver',
    tag: 'Mega Saver',
    description: 'Major ₹500 power bill discount for top eco champions. Direct municipal power subsidy credit.',
    terms: 'Applicable on any domestic electricity bill. Valid for 90 days from redemption.',
    expiryDays: 90,
  },
  {
    id: 'paper_bags',
    title: 'Biodegradable Paper Bags (Pack of 20)',
    points: 25,
    icon: '🛍️',
    category: 'essentials',
    discountVal: 'Free Pack (20 Bags)',
    tag: 'Zero Plastic',
    description: 'Heavy-duty recycled brown kraft paper grocery bags with twisted handles. 100% plastic-free and reusable.',
    terms: 'Collect your sealed pack from the Village Panchayat Office or partnered municipal eco-kiosks.',
    expiryDays: 45,
  },
  {
    id: 'handwash',
    title: 'Organic Herbal Handwash (500ml Bottle)',
    points: 35,
    icon: '🧴',
    category: 'essentials',
    discountVal: 'Free 500ml Bottle',
    tag: 'Eco Hygiene',
    description: 'Antibacterial handwash crafted from organic neem, tulsi & aloe vera in a refillable biodegradable pump bottle.',
    terms: 'Show voucher barcode at the Primary Health Center (PHC) counter or Gram Panchayat store.',
    expiryDays: 45,
  },
  {
    id: 'compost',
    title: 'Organic Farm Compost Fertilizer (5kg)',
    points: 40,
    icon: '🪴',
    category: 'essentials',
    discountVal: 'Free 5kg Sack',
    tag: 'Soil Booster',
    description: 'Nutrient-dense organic compost produced locally from segregated bio-waste. Ideal for kitchen gardens & crops.',
    terms: 'Collect from the Municipal Solid Waste Processing Yard or community composting unit.',
    expiryDays: 60,
  },
  {
    id: 'doorstep_pickup',
    title: 'Free Priority Doorstep Waste Pickup',
    points: 30,
    icon: '🚚',
    category: 'civic',
    discountVal: '1 Free Booking',
    tag: 'Priority Service',
    description: 'Dedicated electric vehicle collection team visits your residence to pick up segregated dry waste, scrap & e-waste.',
    terms: 'Redeemable instantly via the Doorstep Pickup tab in the app with zero fee.',
    expiryDays: 30,
  },
  {
    id: 'tax_rebate',
    title: 'Panchayat Property Tax Rebate - ₹200',
    points: 150,
    icon: '🏛️',
    category: 'civic',
    discountVal: '₹200 Tax Rebate',
    tag: 'Civic Perk',
    description: 'Official ₹200 rebate certificate towards your annual Gram Panchayat house/property tax assessment.',
    terms: 'Submit printed voucher or code copy at the Panchayat Tax Collection counter.',
    expiryDays: 180,
  },
  {
    id: 'plant_tree',
    title: 'Plant a Geo-Tagged Tree in Your Name',
    points: 80,
    icon: '🌳',
    category: 'civic',
    discountVal: 'Certificate + Tag',
    tag: 'Green Legacy',
    description: 'Panchayat nursery plants a native neem or peepal tree in the village green corridor with your nameplate.',
    terms: 'Includes digital geo-tagged photo certificate sent to your registered profile.',
    expiryDays: 90,
  },
];

const INITIAL_HISTORY = [
  {
    id: 'h1',
    title: 'Waste Report Resolved: Cleaned by Collector',
    date: 'Today, 2:30 PM',
    points: '+15',
    type: 'credit',
    icon: '✅',
  },
  {
    id: 'h2',
    title: 'Scrap Handover: 12kg Recycled Dry Waste',
    date: 'Yesterday, 11:15 AM',
    points: '+25',
    type: 'credit',
    icon: '♻️',
  },
  {
    id: 'h3',
    title: 'Waste Report Resolved: Market Road Bin',
    date: '12 Oct 2026',
    points: '+15',
    type: 'credit',
    icon: '✅',
  },
  {
    id: 'h4',
    title: 'Waste Report Resolved: School Playground Corner',
    date: '08 Oct 2026',
    points: '+15',
    type: 'credit',
    icon: '✅',
  },
];

export default function RewardsScreen({
  user,
  ecoPoints = 0,
  onBackToHome,
  onOpenSidebar,
  onPointsUpdated,
  onNavigatePickup,
  onNavigateReport,
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'vouchers' | 'history'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'utilities' | 'essentials' | 'civic'
  const [vouchers, setVouchers] = useState([]);
  const [pointsHistory, setPointsHistory] = useState(INITIAL_HISTORY);
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [newlyRedeemedVoucher, setNewlyRedeemedVoucher] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const storageKey = `${VOUCHERS_STORAGE_KEY}${user?.id || 'guest'}`;

  // Load saved vouchers from storage
  useEffect(() => {
    let isMounted = true;
    async function loadVouchers() {
      try {
        let raw = null;
        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') {
            raw = localStorage.getItem(storageKey);
          }
        } else {
          raw = await SecureStore.getItemAsync(storageKey);
        }
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setVouchers(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load saved vouchers:', err);
      }
    }
    loadVouchers();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // Save vouchers to storage
  const saveVouchers = useCallback(async (updatedList) => {
    try {
      setVouchers(updatedList);
      const str = JSON.stringify(updatedList);
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, str);
        }
      } else {
        await SecureStore.setItemAsync(storageKey, str);
      }
    } catch (err) {
      console.warn('Failed to persist vouchers:', err);
    }
  }, [storageKey]);

  // Filter rewards by category
  const filteredRewards = useMemo(() => {
    if (selectedCategory === 'all') return REWARDS_CATALOG;
    return REWARDS_CATALOG.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Citizen Eco Tier calculation
  const tierInfo = useMemo(() => {
    if (ecoPoints >= 200) {
      return { title: 'Village Eco Hero', badge: '👑', nextMilestone: null, color: '#f59e0b' };
    }
    if (ecoPoints >= 100) {
      return { title: 'Eco Champion', badge: '🌟', nextMilestone: 200, color: '#10b981' };
    }
    if (ecoPoints >= 50) {
      return { title: 'Green Guardian', badge: '🌿', nextMilestone: 100, color: '#3b82f6' };
    }
    return { title: 'Seedling Citizen', badge: '🌱', nextMilestone: 50, color: colors.accent };
  }, [ecoPoints, colors.accent]);

  // Handle Redeem click
  const handleInitiateRedeem = (reward) => {
    if (ecoPoints < reward.points) {
      const deficit = reward.points - ecoPoints;
      Alert.alert(
        'Insufficient Eco Points',
        `You have ${ecoPoints} Eco Points. You need ${deficit} more points to redeem ${reward.title}.\n\n💡 Earn points by reporting waste (+15 pts) or recycling dry waste (+25 pts)!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📸 Report Waste',
            onPress: () => {
              if (onNavigateReport) onNavigateReport();
              else if (onBackToHome) onBackToHome();
            },
          },
        ]
      );
      return;
    }
    setSelectedRewardToRedeem(reward);
  };

  // Confirm and process redemption
  const handleConfirmRedemption = async () => {
    if (!selectedRewardToRedeem) return;
    const reward = selectedRewardToRedeem;
    setIsRedeeming(true);

    try {
      // 1. Deduct points via database
      let updatedTotal = ecoPoints - reward.points;
      if (user?.id) {
        const dbNewPts = await updateUserEcoPoints(user.id, -reward.points);
        if (typeof dbNewPts === 'number') {
          updatedTotal = dbNewPts;
        }
      }

      if (onPointsUpdated) {
        onPointsUpdated(updatedTotal);
      }

      // 2. Generate a voucher code
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const prefix = reward.category === 'utilities' ? 'ELEC' : reward.category === 'essentials' ? 'ECO' : 'CIVIC';
      const voucherCode = `SHODH-${prefix}-${reward.points}-${randomSuffix}`;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (reward.expiryDays || 60));
      const expiryFormatted = expiryDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const redeemedFormatted = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const newVoucher = {
        id: `vouch_${Date.now()}_${randomSuffix}`,
        rewardId: reward.id,
        title: reward.title,
        code: voucherCode,
        discountVal: reward.discountVal,
        pointsSpent: reward.points,
        category: reward.category,
        icon: reward.icon,
        description: reward.description,
        terms: reward.terms,
        redeemedAt: redeemedFormatted,
        expiresAt: expiryFormatted,
        status: 'active',
      };

      const updatedVouchers = [newVoucher, ...vouchers];
      await saveVouchers(updatedVouchers);

      // 3. Add to local history list
      setPointsHistory((prev) => [
        {
          id: `h_redeem_${Date.now()}`,
          title: `Redeemed: ${reward.title}`,
          date: 'Just now',
          points: `-${reward.points}`,
          type: 'debit',
          icon: '🎟️',
        },
        ...prev,
      ]);

      setSelectedRewardToRedeem(null);
      setNewlyRedeemedVoucher(newVoucher);
    } catch (err) {
      console.warn('Redemption error:', err);
      Alert.alert('Redemption Failed', 'Unable to process reward redemption. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = (voucher) => {
    setCopiedCodeId(voucher.id);
    setTimeout(() => {
      setCopiedCodeId(null);
    }, 2500);
    Alert.alert('Voucher Code Copied!', `Code: ${voucher.code}\n\nPresent this code at the relevant counter to claim your reward.`);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🎁 Eco Rewards & Perks</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Eco Balance & Tier Card */}
        <View style={styles.heroBalanceCard}>
          <View style={styles.heroCardTop}>
            <View>
              <Text style={styles.heroSubLabel}>Available Eco Balance</Text>
              <View style={styles.pointsNumberRow}>
                <Text style={styles.heroPointsValue}>🌱 {ecoPoints}</Text>
                <Text style={styles.heroPointsUnit}>pts</Text>
              </View>
            </View>
            <View style={[styles.tierBadge, { borderColor: tierInfo.color }]}>
              <Text style={styles.tierBadgeIcon}>{tierInfo.badge}</Text>
              <Text style={[styles.tierBadgeText, { color: tierInfo.color }]}>{tierInfo.title}</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>{vouchers.length}</Text>
              <Text style={styles.heroStatLabel}>Vouchers Won</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>₹100 - ₹500</Text>
              <Text style={styles.heroStatLabel}>Bill Waivers</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNumber}>100%</Text>
              <Text style={styles.heroStatLabel}>Panchayat Verified</Text>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.heroActionBtnPrimary}
              onPress={() => {
                if (onNavigateReport) onNavigateReport();
                else if (onBackToHome) onBackToHome();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.heroActionBtnPrimaryText}>📸 + Earn Points (Report Waste)</Text>
            </TouchableOpacity>

            {onNavigatePickup && (
              <TouchableOpacity
                style={styles.heroActionBtnSecondary}
                onPress={onNavigatePickup}
                activeOpacity={0.8}
              >
                <Text style={styles.heroActionBtnSecondaryText}>🚚 Pickup</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'catalog' && styles.activeTabButton]}
            onPress={() => setActiveTab('catalog')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'catalog' && styles.activeTabButtonText]}>
              🎁 Rewards Catalog
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'vouchers' && styles.activeTabButton]}
            onPress={() => setActiveTab('vouchers')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'vouchers' && styles.activeTabButtonText]}>
              🎟️ My Vouchers ({vouchers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'history' && styles.activeTabButtonText]}>
              📜 Points Log
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: REWARDS CATALOG */}
        {activeTab === 'catalog' && (
          <View>
            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsContainer}
            >
              <TouchableOpacity
                style={[styles.categoryPill, selectedCategory === 'all' && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory('all')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryPillText, selectedCategory === 'all' && styles.activeCategoryPillText]}>
                  🌟 All Rewards ({REWARDS_CATALOG.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryPill, selectedCategory === 'utilities' && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory('utilities')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryPillText, selectedCategory === 'utilities' && styles.activeCategoryPillText]}>
                  ⚡ Electricity Waivers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryPill, selectedCategory === 'essentials' && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory('essentials')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryPillText, selectedCategory === 'essentials' && styles.activeCategoryPillText]}>
                  🌿 Eco Products
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryPill, selectedCategory === 'civic' && styles.activeCategoryPill]}
                onPress={() => setSelectedCategory('civic')}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryPillText, selectedCategory === 'civic' && styles.activeCategoryPillText]}>
                  🏛️ Civic Perks
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Catalog Reward Cards */}
            <View style={styles.catalogList}>
              {filteredRewards.map((reward) => {
                const canAfford = ecoPoints >= reward.points;
                const deficit = reward.points - ecoPoints;
                const progressPct = Math.min(100, Math.round((ecoPoints / reward.points) * 100));

                return (
                  <View key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardCardHeader}>
                      <View style={styles.rewardIconBadge}>
                        <Text style={styles.rewardIconText}>{reward.icon}</Text>
                      </View>
                      <View style={styles.rewardHeaderDetails}>
                        <View style={styles.rewardTagRow}>
                          <View style={styles.tagPill}>
                            <Text style={styles.tagPillText}>{reward.tag}</Text>
                          </View>
                          <View style={styles.costBadge}>
                            <Text style={styles.costBadgeText}>🌱 {reward.points} pts</Text>
                          </View>
                        </View>
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                      </View>
                    </View>

                    <Text style={styles.rewardDescription}>{reward.description}</Text>

                    <View style={styles.termsRow}>
                      <Text style={styles.termsLabel}>📍 {reward.terms}</Text>
                    </View>

                    {/* Progress Bar if not enough points */}
                    {!canAfford && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Progress: {progressPct}%</Text>
                          <Text style={styles.progressDeficit}>Need {deficit} more pts</Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.redeemButton, !canAfford && styles.redeemButtonDisabled]}
                      onPress={() => handleInitiateRedeem(reward)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.redeemButtonText, !canAfford && styles.redeemButtonTextDisabled]}>
                        {canAfford ? `🎉 Redeem for ${reward.points} Points` : `🔒 Need ${deficit} More Points`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 2: MY VOUCHERS */}
        {activeTab === 'vouchers' && (
          <View style={styles.vouchersContainer}>
            {vouchers.length === 0 ? (
              <View style={styles.emptyVouchersCard}>
                <Text style={styles.emptyVouchersIcon}>🎟️</Text>
                <Text style={styles.emptyVouchersTitle}>No Redeemed Vouchers Yet</Text>
                <Text style={styles.emptyVouchersSub}>
                  Use your Eco Points in the catalog to unlock electricity bill waivers, paper bags, organic handwash, and compost!
                </Text>
                <TouchableOpacity
                  style={styles.browseCatalogCta}
                  onPress={() => setActiveTab('catalog')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.browseCatalogCtaText}>Explore Rewards Catalog →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.vouchersList}>
                {vouchers.map((voucher) => {
                  const isCopied = copiedCodeId === voucher.id;
                  return (
                    <View key={voucher.id} style={styles.voucherTicketCard}>
                      <View style={styles.ticketHeader}>
                        <View style={styles.ticketBadgeRow}>
                          <View style={styles.activeStatusPill}>
                            <Text style={styles.activeStatusText}>🟢 ACTIVE VOUCHER</Text>
                          </View>
                          <Text style={styles.voucherDate}>Redeemed {voucher.redeemedAt}</Text>
                        </View>
                        <Text style={styles.voucherTitle}>{voucher.icon} {voucher.title}</Text>
                        <Text style={styles.voucherDiscountVal}>{voucher.discountVal}</Text>
                      </View>

                      {/* Ticket Perforation Line */}
                      <View style={styles.ticketDividerWrap}>
                        <View style={styles.ticketNotchLeft} />
                        <View style={styles.ticketDashedLine} />
                        <View style={styles.ticketNotchRight} />
                      </View>

                      <View style={styles.ticketBody}>
                        <Text style={styles.voucherCodeLabel}>VOUCHER CODE</Text>
                        <View style={styles.codeBoxRow}>
                          <Text style={styles.voucherCodeText}>{voucher.code}</Text>
                          <TouchableOpacity
                            style={[styles.copyButton, isCopied && styles.copyButtonDone]}
                            onPress={() => handleCopyCode(voucher)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.copyButtonText, isCopied && styles.copyButtonTextDone]}>
                              {isCopied ? '✓ Copied' : '📋 Copy'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Barcode visual simulation */}
                        <View style={styles.barcodeVisual}>
                          <View style={[styles.bar, { width: 4 }]} />
                          <View style={[styles.bar, { width: 2 }]} />
                          <View style={[styles.bar, { width: 6 }]} />
                          <View style={[styles.bar, { width: 3 }]} />
                          <View style={[styles.bar, { width: 8 }]} />
                          <View style={[styles.bar, { width: 2 }]} />
                          <View style={[styles.bar, { width: 5 }]} />
                          <View style={[styles.bar, { width: 7 }]} />
                          <View style={[styles.bar, { width: 3 }]} />
                          <View style={[styles.bar, { width: 9 }]} />
                          <View style={[styles.bar, { width: 4 }]} />
                          <View style={[styles.bar, { width: 2 }]} />
                          <View style={[styles.bar, { width: 5 }]} />
                          <View style={[styles.bar, { width: 8 }]} />
                          <View style={[styles.bar, { width: 3 }]} />
                          <View style={[styles.bar, { width: 6 }]} />
                          <View style={[styles.bar, { width: 2 }]} />
                          <View style={[styles.bar, { width: 7 }]} />
                        </View>

                        <View style={styles.voucherMetaRow}>
                          <Text style={styles.voucherExpiryText}>⏳ Valid until: {voucher.expiresAt}</Text>
                          <Text style={styles.voucherSpentText}>Cost: {voucher.pointsSpent} pts</Text>
                        </View>

                        <Text style={styles.voucherInstructions}>
                          📌 {voucher.terms || 'Show this code at the municipal or Panchayat counter.'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: POINTS HISTORY */}
        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <View style={styles.historyCard}>
              {pointsHistory.map((h, idx) => {
                const isCredit = h.type === 'credit';
                const isLast = idx === pointsHistory.length - 1;
                return (
                  <View key={h.id} style={[styles.historyRow, isLast && { borderBottomWidth: 0 }]}>
                    <View style={[styles.historyIconCircle, { backgroundColor: isCredit ? '#10b98115' : '#ef444415' }]}>
                      <Text style={styles.historyIcon}>{h.icon}</Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyTitle}>{h.title}</Text>
                      <Text style={styles.historyDate}>{h.date}</Text>
                    </View>
                    <View style={styles.historyPointsWrap}>
                      <Text style={[styles.historyPoints, { color: isCredit ? '#10b981' : '#ef4444' }]}>
                        {h.points}
                      </Text>
                      <Text style={styles.historyPtsLabel}>pts</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* How Points Work Explanation Card */}
            <View style={styles.howItWorksCard}>
              <Text style={styles.howItWorksTitle}>🌱 How to Earn More Eco Points</Text>
              <View style={styles.howItWorksItem}>
                <Text style={styles.howItWorksEmoji}>📸</Text>
                <View style={styles.howItWorksTextGroup}>
                  <Text style={styles.howItWorksItemTitle}>Report Waste Spot (+15 pts)</Text>
                  <Text style={styles.howItWorksItemSub}>Points credited as soon as area collector cleans & completes resolution.</Text>
                </View>
              </View>
              <View style={styles.howItWorksItem}>
                <Text style={styles.howItWorksEmoji}>♻️</Text>
                <View style={styles.howItWorksTextGroup}>
                  <Text style={styles.howItWorksItemTitle}>Recycle Dry Waste & Scrap (+25 pts)</Text>
                  <Text style={styles.howItWorksItemSub}>Hand over sorted paper, cardboard, plastics or metal to pickup teams.</Text>
                </View>
              </View>
              <View style={styles.howItWorksItem}>
                <Text style={styles.howItWorksEmoji}>⚠️</Text>
                <View style={styles.howItWorksTextGroup}>
                  <Text style={styles.howItWorksItemTitle}>False Report Penalty (-5 pts)</Text>
                  <Text style={styles.howItWorksItemSub}>Submitting fake or non-waste photos leads to point deduction.</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: CONFIRM REDEMPTION */}
      <Modal
        visible={Boolean(selectedRewardToRedeem)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRewardToRedeem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>{selectedRewardToRedeem?.icon}</Text>
            </View>

            <Text style={styles.modalTitle}>Confirm Redemption</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to redeem this reward?
            </Text>

            <View style={styles.modalRewardSummary}>
              <Text style={styles.modalRewardTitle}>{selectedRewardToRedeem?.title}</Text>
              <Text style={styles.modalRewardDiscount}>{selectedRewardToRedeem?.discountVal}</Text>
              <View style={styles.modalPointsRow}>
                <Text style={styles.modalPointsLabel}>Deduction:</Text>
                <Text style={styles.modalPointsValue}>- {selectedRewardToRedeem?.points} Eco Points</Text>
              </View>
              <View style={styles.modalPointsRow}>
                <Text style={styles.modalPointsLabel}>Remaining Balance:</Text>
                <Text style={styles.modalPointsRemaining}>
                  🌱 {Math.max(0, ecoPoints - (selectedRewardToRedeem?.points || 0))} pts
                </Text>
              </View>
            </View>

            <Text style={styles.modalTermsNote}>
              📌 {selectedRewardToRedeem?.terms}
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedRewardToRedeem(null)}
                disabled={isRedeeming}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmRedemption}
                disabled={isRedeeming}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {isRedeeming ? 'Redeeming...' : 'Confirm & Claim 🎁'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: REDEMPTION SUCCESS CELEBRATION */}
      <Modal
        visible={Boolean(newlyRedeemedVoucher)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewlyRedeemedVoucher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
            <Text style={styles.modalTitle}>Reward Unlocked!</Text>
            <Text style={styles.modalSubtitle}>
              Congratulations! Your voucher has been generated and added to your wallet.
            </Text>

            <View style={styles.successTicketBox}>
              <Text style={styles.successTicketTitle}>
                {newlyRedeemedVoucher?.icon} {newlyRedeemedVoucher?.title}
              </Text>
              <Text style={styles.successTicketDiscount}>{newlyRedeemedVoucher?.discountVal}</Text>

              <View style={styles.successCodeContainer}>
                <Text style={styles.successCodeLabel}>YOUR VOUCHER CODE</Text>
                <Text style={styles.successCodeText}>{newlyRedeemedVoucher?.code}</Text>
              </View>

              <Text style={styles.successExpiryText}>
                ⏳ Valid until: {newlyRedeemedVoucher?.expiresAt}
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  handleCopyCode(newlyRedeemedVoucher);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>📋 Copy Code</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setNewlyRedeemedVoucher(null);
                  setActiveTab('vouchers');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalConfirmBtnText}>View in Wallet 🎟️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      padding: tokens.spacing.md,
      paddingBottom: tokens.spacing.xxl,
    },
    heroBalanceCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    heroCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: tokens.spacing.md,
    },
    heroSubLabel: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
      marginBottom: 2,
    },
    pointsNumberRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroPointsValue: {
      fontSize: 32,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
    },
    heroPointsUnit: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.muted,
      marginLeft: 6,
    },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
    },
    tierBadgeIcon: {
      fontSize: 16,
      marginRight: 6,
    },
    tierBadgeText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroStatItem: {
      alignItems: 'center',
      flex: 1,
    },
    heroStatNumber: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
    },
    heroStatLabel: {
      fontSize: 10,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
      marginTop: 2,
    },
    heroStatDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
    },
    heroActionsRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    heroActionBtnPrimary: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroActionBtnPrimaryText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    heroActionBtnSecondary: {
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroActionBtnSecondaryText: {
      color: colors.text,
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.xl,
      padding: 4,
      marginBottom: tokens.spacing.md,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: tokens.radius.lg,
    },
    activeTabButton: {
      backgroundColor: colors.card,
      ...tokens.shadow.sm,
    },
    tabButtonText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.semibold,
      color: colors.muted,
    },
    activeTabButtonText: {
      color: colors.accent,
      fontFamily: tokens.typography.family.extrabold,
    },
    categoryPillsContainer: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      paddingBottom: tokens.spacing.sm,
      marginBottom: tokens.spacing.xs,
    },
    categoryPill: {
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeCategoryPill: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    categoryPillText: {
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      fontFamily: tokens.typography.family.semibold,
    },
    activeCategoryPillText: {
      color: isDark ? '#000000' : '#ffffff',
      fontFamily: tokens.typography.family.bold,
    },
    catalogList: {
      gap: tokens.spacing.md,
    },
    rewardCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    rewardCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: tokens.spacing.sm,
    },
    rewardIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: tokens.spacing.sm,
    },
    rewardIconText: {
      fontSize: 24,
    },
    rewardHeaderDetails: {
      flex: 1,
    },
    rewardTagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    tagPill: {
      backgroundColor: colors.accentLight || 'rgba(0,0,0,0.05)',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    tagPillText: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      color: colors.accent,
      textTransform: 'uppercase',
    },
    costBadge: {
      backgroundColor: '#10b98120',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    costBadgeText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.extrabold,
      color: '#10b981',
    },
    rewardTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      lineHeight: 20,
    },
    rewardDescription: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      lineHeight: 18,
      marginBottom: tokens.spacing.sm,
    },
    termsRow: {
      backgroundColor: colors.surface,
      padding: tokens.spacing.xs,
      borderRadius: tokens.radius.md,
      marginBottom: tokens.spacing.sm,
    },
    termsLabel: {
      fontSize: 11,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
    },
    progressContainer: {
      marginBottom: tokens.spacing.sm,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    progressLabel: {
      fontSize: 10,
      fontFamily: tokens.typography.family.semibold,
      color: colors.muted,
    },
    progressDeficit: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      color: colors.accent,
    },
    progressBarTrack: {
      height: 6,
      backgroundColor: colors.surface,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    redeemButton: {
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
    },
    redeemButtonDisabled: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    redeemButtonText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    redeemButtonTextDisabled: {
      color: colors.muted,
    },
    vouchersContainer: {
      gap: tokens.spacing.md,
    },
    emptyVouchersCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyVouchersIcon: {
      fontSize: 48,
      marginBottom: tokens.spacing.sm,
    },
    emptyVouchersTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 6,
    },
    emptyVouchersSub: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: tokens.spacing.md,
    },
    browseCatalogCta: {
      backgroundColor: colors.accent,
      paddingVertical: 8,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
    },
    browseCatalogCtaText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    vouchersList: {
      gap: tokens.spacing.md,
    },
    voucherTicketCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...tokens.shadow.sm,
    },
    ticketHeader: {
      padding: tokens.spacing.md,
      paddingBottom: tokens.spacing.sm,
    },
    ticketBadgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    activeStatusPill: {
      backgroundColor: '#10b98120',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    activeStatusText: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      color: '#10b981',
    },
    voucherDate: {
      fontSize: 11,
      color: colors.muted,
    },
    voucherTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 2,
    },
    voucherDiscountVal: {
      fontSize: tokens.typography.size.lg,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.accent,
    },
    ticketDividerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 20,
      position: 'relative',
    },
    ticketNotchLeft: {
      width: 14,
      height: 24,
      backgroundColor: colors.background,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    ticketDashedLine: {
      flex: 1,
      height: 1,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.border,
    },
    ticketNotchRight: {
      width: 14,
      height: 24,
      backgroundColor: colors.background,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
    ticketBody: {
      padding: tokens.spacing.md,
      paddingTop: tokens.spacing.xs,
    },
    voucherCodeLabel: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      color: colors.muted,
      letterSpacing: 1,
      marginBottom: 4,
    },
    codeBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.accent,
      borderRadius: tokens.radius.lg,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: 8,
      marginBottom: tokens.spacing.sm,
    },
    voucherCodeText: {
      flex: 1,
      fontSize: tokens.typography.size.sm,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 1.5,
    },
    copyButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: tokens.radius.md,
    },
    copyButtonDone: {
      backgroundColor: '#10b98120',
      borderColor: '#10b981',
    },
    copyButtonText: {
      fontSize: 11,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    copyButtonTextDone: {
      color: '#10b981',
    },
    barcodeVisual: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 3,
      height: 28,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      marginBottom: tokens.spacing.sm,
    },
    bar: {
      height: 22,
      backgroundColor: colors.text,
      borderRadius: 1,
      opacity: 0.85,
    },
    voucherMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    voucherExpiryText: {
      fontSize: 11,
      fontFamily: tokens.typography.family.semibold,
      color: colors.muted,
    },
    voucherSpentText: {
      fontSize: 11,
      color: colors.muted,
    },
    voucherInstructions: {
      fontSize: 11,
      color: colors.muted,
      lineHeight: 16,
      backgroundColor: colors.surface,
      padding: tokens.spacing.xs,
      borderRadius: tokens.radius.md,
    },
    historyContainer: {
      gap: tokens.spacing.md,
    },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      paddingHorizontal: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: tokens.spacing.sm,
    },
    historyIcon: {
      fontSize: 18,
    },
    historyInfo: {
      flex: 1,
    },
    historyTitle: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 2,
    },
    historyDate: {
      fontSize: 10,
      color: colors.muted,
    },
    historyPointsWrap: {
      alignItems: 'flex-end',
    },
    historyPoints: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.extrabold,
    },
    historyPtsLabel: {
      fontSize: 9,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
    },
    howItWorksCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: tokens.spacing.sm,
    },
    howItWorksTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 4,
    },
    howItWorksItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      padding: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    howItWorksEmoji: {
      fontSize: 20,
      marginRight: tokens.spacing.sm,
    },
    howItWorksTextGroup: {
      flex: 1,
    },
    howItWorksItemTitle: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 2,
    },
    howItWorksItemSub: {
      fontSize: 11,
      color: colors.muted,
      lineHeight: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: tokens.spacing.md,
    },
    modalContentCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      ...tokens.shadow.md,
    },
    modalIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: tokens.spacing.sm,
    },
    modalIconText: {
      fontSize: 32,
    },
    modalTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: tokens.spacing.md,
    },
    modalRewardSummary: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalRewardTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: 2,
    },
    modalRewardDiscount: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.accent,
      marginBottom: tokens.spacing.sm,
    },
    modalPointsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
    },
    modalPointsLabel: {
      fontSize: 11,
      color: colors.muted,
    },
    modalPointsValue: {
      fontSize: 11,
      fontFamily: tokens.typography.family.bold,
      color: '#ef4444',
    },
    modalPointsRemaining: {
      fontSize: 11,
      fontFamily: tokens.typography.family.bold,
      color: '#10b981',
    },
    modalTermsNote: {
      fontSize: 10,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: tokens.spacing.md,
      lineHeight: 15,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      width: '100%',
    },
    modalCancelBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelBtnText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    modalConfirmBtn: {
      flex: 1.5,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmBtnText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: isDark ? '#000000' : '#ffffff',
    },
    successTicketBox: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    successTicketTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 2,
    },
    successTicketDiscount: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.accent,
      marginBottom: tokens.spacing.sm,
    },
    successCodeContainer: {
      width: '100%',
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: '#10b981',
      borderRadius: tokens.radius.md,
      padding: tokens.spacing.sm,
      alignItems: 'center',
      marginBottom: 6,
    },
    successCodeLabel: {
      fontSize: 9,
      fontFamily: tokens.typography.family.bold,
      color: colors.muted,
      letterSpacing: 1,
      marginBottom: 2,
    },
    successCodeText: {
      fontSize: tokens.typography.size.base,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 2,
    },
    successExpiryText: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
  });
