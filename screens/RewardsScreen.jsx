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
  useWindowDimensions,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { tokens, useTheme } from '../lib/theme';
import { updateUserEcoPoints } from '../db/database';

// Global conversion: 1 Eco Point = 0.30 paise (₹0.30)
export const ECO_POINT_VAL_INR = 0.30;

const VOUCHERS_STORAGE_KEY = 'shodhini_user_vouchers_';

const REWARDS_CATALOG = [
  // --- UTILITY BILL WAIVERS ---
  {
    id: 'elec_15',
    title: 'Electricity Bill Waiver - ₹15 Off',
    points: 50, // 50 * 0.30 = ₹15.00
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹15.00 Waiver',
    tag: 'Popular',
    description: 'Direct ₹15 deduction voucher for your monthly State Electricity Board or Panchayat energy bill.',
    terms: 'Present voucher code at the local electricity sub-station counter or apply during online bill payment.',
    expiryDays: 60,
  },
  {
    id: 'elec_30',
    title: 'Electricity Bill Waiver - ₹30 Off',
    points: 100, // 100 * 0.30 = ₹30.00
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹30.00 Waiver',
    tag: 'Best Value',
    description: 'Save ₹30 on your residential power invoice under the Green Citizen Clean Energy Subsidy scheme.',
    terms: 'Valid on domestic electricity meters. One voucher allowed per billing cycle.',
    expiryDays: 60,
  },
  {
    id: 'elec_60',
    title: 'Electricity Bill Waiver - ₹60 Off',
    points: 200, // 200 * 0.30 = ₹60.00
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹60.00 Waiver',
    tag: 'Super Saver',
    description: 'Substantial ₹60 power rebate voucher for household electricity meters. High impact civic credit.',
    terms: 'Applicable on any residential electricity bill. Valid for 90 days from redemption.',
    expiryDays: 90,
  },
  {
    id: 'elec_150',
    title: 'Electricity Bill Waiver - ₹150 Off',
    points: 500, // 500 * 0.30 = ₹150.00
    icon: '⚡',
    category: 'utilities',
    discountVal: '₹150.00 Waiver',
    tag: 'Mega Subsidy',
    description: 'Major ₹150 municipal electricity bill grant for top community eco champions.',
    terms: 'Sanctioned under Panchayat Swachh Urja mission. Submit copy at billing desk.',
    expiryDays: 90,
  },

  // --- ECO PRODUCTS & ESSENTIALS ---
  {
    id: 'paper_bags_5',
    title: 'Biodegradable Paper Bags (Pack of 5)',
    points: 25, // 25 * 0.30 = ₹7.50
    icon: '🛍️',
    category: 'essentials',
    discountVal: 'Pack of 5 Bags',
    tag: 'Zero Plastic',
    description: 'Heavy-duty recycled brown kraft grocery bags with handles. 100% plastic-free and reusable.',
    terms: 'Collect sealed pack from Village Panchayat Office or partnered municipal eco-kiosks.',
    expiryDays: 45,
  },
  {
    id: 'paper_bags_10',
    title: 'Biodegradable Paper Bags (Pack of 10)',
    points: 50, // 50 * 0.30 = ₹15.00
    icon: '🛍️',
    category: 'essentials',
    discountVal: 'Pack of 10 Bags',
    tag: 'Eco Essential',
    description: 'Set of 10 reinforced kraft paper bags to eliminate single-use plastic grocery bags.',
    terms: 'Collect from local Panchayat distribution center or participating grocery stores.',
    expiryDays: 45,
  },
  {
    id: 'handwash_refill',
    title: 'Organic Herbal Handwash (200ml Refill)',
    points: 35, // 35 * 0.30 = ₹10.50
    icon: '🧴',
    category: 'essentials',
    discountVal: '200ml Refill',
    tag: 'Eco Hygiene',
    description: 'Antibacterial herbal handwash pouch made with neem, tulsi & aloe extracts in recyclable pouch.',
    terms: 'Redeem at Primary Health Center (PHC) counter or Gram Panchayat store.',
    expiryDays: 45,
  },
  {
    id: 'handwash_dispenser',
    title: 'Organic Herbal Handwash (500ml Dispenser)',
    points: 70, // 70 * 0.30 = ₹21.00
    icon: '🧴',
    category: 'essentials',
    discountVal: '500ml Dispenser',
    tag: 'Family Pack',
    description: 'Family-size organic neem handwash in a 100% recyclable pump bottle dispenser.',
    terms: 'Collect at the Gram Panchayat dispensary or municipal health desk.',
    expiryDays: 60,
  },
  {
    id: 'compost_2kg',
    title: 'Organic Farm Compost Fertilizer (2kg)',
    points: 30, // 30 * 0.30 = ₹9.00
    icon: '🪴',
    category: 'essentials',
    discountVal: '2kg Sack',
    tag: 'Soil Booster',
    description: 'Nutrient-rich municipal organic compost produced locally from segregated bio-waste.',
    terms: 'Collect from the Municipal Solid Waste Processing Yard or community composting unit.',
    expiryDays: 60,
  },
  {
    id: 'compost_5kg',
    title: 'Organic Farm Compost Fertilizer (5kg)',
    points: 60, // 60 * 0.30 = ₹18.00
    icon: '🪴',
    category: 'essentials',
    discountVal: '5kg Sack',
    tag: 'Garden Kit',
    description: 'Heavy 5kg sack of cured bio-compost for kitchen gardens, potted plants & fruit trees.',
    terms: 'Collect from the Municipal Solid Waste Processing Yard or community composting unit.',
    expiryDays: 60,
  },

  // --- CIVIC PERKS ---
  {
    id: 'doorstep_pickup',
    title: 'Free Priority Doorstep Waste Pickup',
    points: 40, // 40 * 0.30 = ₹12.00
    icon: '🚚',
    category: 'civic',
    discountVal: '1 Free Booking',
    tag: 'Priority Service',
    description: 'Dedicated electric vehicle collection team visits your residence to pick up segregated dry waste & scrap.',
    terms: 'Redeemable instantly via the Doorstep Pickup tab in the app with zero fee.',
    expiryDays: 30,
  },
  {
    id: 'tax_rebate',
    title: 'Panchayat Property Tax Rebate - ₹45 Off',
    points: 150, // 150 * 0.30 = ₹45.00
    icon: '🏛️',
    category: 'civic',
    discountVal: '₹45.00 Tax Rebate',
    tag: 'Civic Perk',
    description: 'Official ₹45 rebate certificate towards your annual Gram Panchayat house/property tax assessment.',
    terms: 'Submit printed voucher or code copy at the Panchayat Tax Collection counter.',
    expiryDays: 180,
  },
  {
    id: 'plant_tree',
    title: 'Plant a Geo-Tagged Village Tree',
    points: 100, // 100 * 0.30 = ₹30.00
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
    inrVal: '+₹4.50',
    type: 'credit',
    icon: '✅',
  },
  {
    id: 'h2',
    title: 'Scrap Handover: 12kg Recycled Dry Waste',
    date: 'Yesterday, 11:15 AM',
    points: '+25',
    inrVal: '+₹7.50',
    type: 'credit',
    icon: '♻️',
  },
  {
    id: 'h3',
    title: 'Waste Report Resolved: Market Road Bin',
    date: '12 Oct 2026',
    points: '+15',
    inrVal: '+₹4.50',
    type: 'credit',
    icon: '✅',
  },
  {
    id: 'h4',
    title: 'Waste Report Resolved: School Playground Corner',
    date: '08 Oct 2026',
    points: '+15',
    inrVal: '+₹4.50',
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isWideDesktop = width >= 1150;

  const styles = useMemo(
    () => getStyles(colors, isDark, isDesktop, isWideDesktop),
    [colors, isDark, isDesktop, isWideDesktop]
  );

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'vouchers' | 'history'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'utilities' | 'essentials' | 'civic'
  const [vouchers, setVouchers] = useState([]);
  const [pointsHistory, setPointsHistory] = useState(INITIAL_HISTORY);
  const [selectedRewardToRedeem, setSelectedRewardToRedeem] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [newlyRedeemedVoucher, setNewlyRedeemedVoucher] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const storageKey = `${VOUCHERS_STORAGE_KEY}${user?.id || 'guest'}`;
  const totalRupeeValue = useMemo(() => (ecoPoints * ECO_POINT_VAL_INR).toFixed(2), [ecoPoints]);

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
  const saveVouchers = useCallback(
    async (updatedList) => {
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
    },
    [storageKey]
  );

  // Filter rewards by category
  const filteredRewards = useMemo(() => {
    if (selectedCategory === 'all') return REWARDS_CATALOG;
    return REWARDS_CATALOG.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Citizen Eco Tier calculation
  const tierInfo = useMemo(() => {
    if (ecoPoints >= 200) {
      return { title: 'Village Eco Hero', badge: '👑', color: '#f59e0b' };
    }
    if (ecoPoints >= 100) {
      return { title: 'Eco Champion', badge: '🌟', color: '#10b981' };
    }
    if (ecoPoints >= 50) {
      return { title: 'Green Guardian', badge: '🌿', color: '#3b82f6' };
    }
    return { title: 'Seedling Citizen', badge: '🌱', color: colors.accent };
  }, [ecoPoints, colors.accent]);

  // Handle Redeem click
  const handleInitiateRedeem = (reward) => {
    if (ecoPoints < reward.points) {
      const deficitPts = reward.points - ecoPoints;
      const deficitInr = (deficitPts * ECO_POINT_VAL_INR).toFixed(2);
      Alert.alert(
        'Insufficient Eco Points',
        `You have ${ecoPoints} Eco Points (₹${totalRupeeValue}).\nYou need ${deficitPts} more points (₹${deficitInr}) to redeem ${reward.title}.\n\n💡 1 Eco Point = ₹0.30 (30 paise).\nEarn points by reporting waste (+15 pts / ₹4.50) or recycling scrap (+25 pts / ₹7.50)!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📸 Report Waste Spot',
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
      const prefix =
        reward.category === 'utilities' ? 'ELEC' : reward.category === 'essentials' ? 'ECO' : 'CIVIC';
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
        inrValue: (reward.points * ECO_POINT_VAL_INR).toFixed(2),
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
          inrVal: `-₹${(reward.points * ECO_POINT_VAL_INR).toFixed(2)}`,
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
    Alert.alert(
      'Voucher Code Copied!',
      `Code: ${voucher.code}\nValue: ${voucher.discountVal}\n\nPresent this code at the relevant counter or electricity sub-station to claim your reward.`
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={onOpenSidebar}
            activeOpacity={0.7}
            accessibilityLabel="Open Sidebar Menu"
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🎁 Eco Rewards & Perks</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={onBackToHome}
            activeOpacity={0.7}
            accessibilityLabel="Return to Home Screen"
          >
            <Text style={styles.backHomeText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* HERO BANNER CARD */}
          <View style={styles.heroCard}>
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroSubLabel}>Available Eco Balance</Text>
              <View style={styles.pointsRow}>
                <Text style={styles.heroPointsValue}>🌱 {ecoPoints}</Text>
                <Text style={styles.heroPointsUnit}>pts</Text>
              </View>

              {/* Conversion Valuation Pill */}
              <View style={styles.cashValPill}>
                <Text style={styles.cashValAmount}>≈ ₹{totalRupeeValue}</Text>
                <View style={styles.rateDivider} />
                <Text style={styles.rateNote}>1 pt = ₹0.30 (30p)</Text>
              </View>
            </View>

            <View style={styles.heroRightCol}>
              <View style={[styles.tierBadge, { borderColor: tierInfo.color }]}>
                <Text style={styles.tierBadgeIcon}>{tierInfo.badge}</Text>
                <Text style={[styles.tierBadgeText, { color: tierInfo.color }]}>{tierInfo.title}</Text>
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
                  <Text style={styles.heroActionBtnPrimaryText}>📸 + Earn Points</Text>
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
          </View>

          {/* TAB SWITCHER */}
          <View style={styles.tabBarWrapper}>
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
                  📜 Points History
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TAB 1: REWARDS CATALOG */}
          {activeTab === 'catalog' && (
            <View>
              {/* Category Filter Pills */}
              <View style={styles.categoriesWrapper}>
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
                      🌟 All Perks ({REWARDS_CATALOG.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryPill, selectedCategory === 'utilities' && styles.activeCategoryPill]}
                    onPress={() => setSelectedCategory('utilities')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedCategory === 'utilities' && styles.activeCategoryPillText,
                      ]}
                    >
                      ⚡ Electricity Waivers
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.categoryPill, selectedCategory === 'essentials' && styles.activeCategoryPill]}
                    onPress={() => setSelectedCategory('essentials')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedCategory === 'essentials' && styles.activeCategoryPillText,
                      ]}
                    >
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
              </View>

              {/* Catalog Grid */}
              <View style={styles.catalogGrid}>
                {filteredRewards.map((reward) => {
                  const canAfford = ecoPoints >= reward.points;
                  const deficitPts = reward.points - ecoPoints;
                  const progressPct = Math.min(100, Math.round((ecoPoints / reward.points) * 100));
                  const inrValue = (reward.points * ECO_POINT_VAL_INR).toFixed(2);
                  const deficitInr = (deficitPts * ECO_POINT_VAL_INR).toFixed(2);

                  return (
                    <View key={reward.id} style={styles.rewardCard}>
                      {/* Card Header */}
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.rewardIconBadge}>
                          <Text style={styles.rewardIconText}>{reward.icon}</Text>
                        </View>
                        <View style={styles.cardHeaderTitleGroup}>
                          <View style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{reward.tag}</Text>
                          </View>
                          <Text style={styles.rewardTitle} numberOfLines={2}>
                            {reward.title}
                          </Text>
                        </View>
                      </View>

                      {/* Valuation Strip: Points + Rupees */}
                      <View style={styles.valuationStrip}>
                        <View style={styles.costPointPill}>
                          <Text style={styles.costPointText}>🌱 {reward.points} pts</Text>
                        </View>
                        <View style={styles.costInrPill}>
                          <Text style={styles.costInrText}>Worth ₹{inrValue}</Text>
                        </View>
                      </View>

                      <Text style={styles.rewardDescription}>{reward.description}</Text>

                      <View style={styles.termsBox}>
                        <Text style={styles.termsText}>📍 {reward.terms}</Text>
                      </View>

                      {/* Bottom Footer Area with Aligned Buttons */}
                      <View style={styles.cardFooterArea}>
                        {!canAfford && (
                          <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                              <Text style={styles.progressLabel}>Progress: {progressPct}%</Text>
                              <Text style={styles.progressDeficit}>
                                Need {deficitPts} pts (₹{deficitInr})
                              </Text>
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
                            {canAfford
                              ? `🎉 Redeem for ${reward.points} pts (₹${inrValue})`
                              : `🔒 Need ${deficitPts} More Pts`}
                          </Text>
                        </TouchableOpacity>
                      </View>
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
                    You have {ecoPoints} Eco Points (worth ₹{totalRupeeValue}). Explore the rewards catalog to redeem
                    electricity bill waivers, paper bag packs, organic handwash, and compost!
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
                <View style={styles.vouchersGrid}>
                  {vouchers.map((voucher) => {
                    const isCopied = copiedCodeId === voucher.id;
                    return (
                      <View key={voucher.id} style={styles.voucherCard}>
                        {/* Ticket Top */}
                        <View style={styles.ticketHeader}>
                          <View style={styles.ticketBadgeRow}>
                            <View style={styles.activeStatusPill}>
                              <Text style={styles.activeStatusText}>🟢 ACTIVE VOUCHER</Text>
                            </View>
                            <Text style={styles.voucherDate}>Redeemed {voucher.redeemedAt}</Text>
                          </View>
                          <Text style={styles.voucherTitle}>
                            {voucher.icon} {voucher.title}
                          </Text>
                          <Text style={styles.voucherDiscountVal}>{voucher.discountVal}</Text>
                        </View>

                        {/* Ticket Notch Line */}
                        <View style={styles.ticketDividerWrap}>
                          <View style={styles.ticketNotchLeft} />
                          <View style={styles.ticketDashedLine} />
                          <View style={styles.ticketNotchRight} />
                        </View>

                        {/* Ticket Bottom */}
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
                          </View>

                          <View style={styles.voucherMetaRow}>
                            <Text style={styles.voucherExpiryText}>⏳ Valid until: {voucher.expiresAt}</Text>
                            <Text style={styles.voucherSpentText}>
                              {voucher.pointsSpent} pts (₹{voucher.inrValue})
                            </Text>
                          </View>

                          <Text style={styles.voucherInstructions}>
                            📌 {voucher.terms || 'Present this code at the municipal or electricity sub-station counter.'}
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
                <View style={styles.historyHeaderRow}>
                  <Text style={styles.historyHeaderTitle}>Activity Log</Text>
                  <Text style={styles.historyHeaderRate}>Rate: 1 pt = ₹0.30</Text>
                </View>
                {pointsHistory.map((h, idx) => {
                  const isCredit = h.type === 'credit';
                  const isLast = idx === pointsHistory.length - 1;
                  return (
                    <View key={h.id} style={[styles.historyRow, isLast && { borderBottomWidth: 0 }]}>
                      <View
                        style={[
                          styles.historyIconCircle,
                          { backgroundColor: isCredit ? '#10b98118' : '#ef444418' },
                        ]}
                      >
                        <Text style={styles.historyIcon}>{h.icon}</Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>{h.title}</Text>
                        <Text style={styles.historyDate}>{h.date}</Text>
                      </View>
                      <View style={styles.historyPointsWrap}>
                        <Text style={[styles.historyPoints, { color: isCredit ? '#10b981' : '#ef4444' }]}>
                          {h.points} pts
                        </Text>
                        {h.inrVal && (
                          <Text style={[styles.historyInrVal, { color: isCredit ? '#10b981' : '#ef4444' }]}>
                            {h.inrVal}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* How points work card */}
              <View style={styles.howItWorksCard}>
                <Text style={styles.howItWorksTitle}>🌱 How to Earn More Eco Points & Cash Credits</Text>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksEmoji}>📸</Text>
                  <View style={styles.howItWorksTextGroup}>
                    <Text style={styles.howItWorksItemTitle}>Report Waste Spot (+15 pts ≈ ₹4.50)</Text>
                    <Text style={styles.howItWorksItemSub}>
                      Points credited once area garbage collector cleans and completes photo resolution.
                    </Text>
                  </View>
                </View>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksEmoji}>♻️</Text>
                  <View style={styles.howItWorksTextGroup}>
                    <Text style={styles.howItWorksItemTitle}>Recycle Dry Waste & Scrap (+25 pts ≈ ₹7.50)</Text>
                    <Text style={styles.howItWorksItemSub}>
                      Hand over sorted paper, cardboard, plastic, or e-waste to doorstep collection vans.
                    </Text>
                  </View>
                </View>
                <View style={styles.howItWorksItem}>
                  <Text style={styles.howItWorksEmoji}>⚠️</Text>
                  <View style={styles.howItWorksTextGroup}>
                    <Text style={styles.howItWorksItemTitle}>False Report Deduction (-5 pts ≈ -₹1.50)</Text>
                    <Text style={styles.howItWorksItemSub}>
                      Submitting fake, repeated, or non-waste images will trigger automatic point deductions.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
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
            <Text style={styles.modalSubtitle}>Claim this reward using your earned Eco Points</Text>

            <View style={styles.modalRewardSummary}>
              <Text style={styles.modalRewardTitle}>{selectedRewardToRedeem?.title}</Text>
              <Text style={styles.modalRewardDiscount}>{selectedRewardToRedeem?.discountVal}</Text>

              <View style={styles.modalPointsRow}>
                <Text style={styles.modalPointsLabel}>Cost in Points:</Text>
                <Text style={styles.modalPointsValue}>
                  - {selectedRewardToRedeem?.points} pts (-₹
                  {((selectedRewardToRedeem?.points || 0) * ECO_POINT_VAL_INR).toFixed(2)})
                </Text>
              </View>

              <View style={styles.modalPointsRow}>
                <Text style={styles.modalPointsLabel}>Remaining Balance:</Text>
                <Text style={styles.modalPointsRemaining}>
                  🌱 {Math.max(0, ecoPoints - (selectedRewardToRedeem?.points || 0))} pts (≈ ₹
                  {(Math.max(0, ecoPoints - (selectedRewardToRedeem?.points || 0)) * ECO_POINT_VAL_INR).toFixed(2)})
                </Text>
              </View>
            </View>

            <Text style={styles.modalTermsNote}>📌 {selectedRewardToRedeem?.terms}</Text>

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

      {/* MODAL 2: SUCCESS CELEBRATION */}
      <Modal
        visible={Boolean(newlyRedeemedVoucher)}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewlyRedeemedVoucher(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 6 }}>🎉</Text>
            <Text style={styles.modalTitle}>Reward Unlocked!</Text>
            <Text style={styles.modalSubtitle}>
              Your voucher has been generated and saved to your wallet.
            </Text>

            <View style={styles.successTicketBox}>
              <Text style={styles.successTicketTitle}>
                {newlyRedeemedVoucher?.icon} {newlyRedeemedVoucher?.title}
              </Text>
              <Text style={styles.successTicketDiscount}>{newlyRedeemedVoucher?.discountVal}</Text>

              <View style={styles.successCodeContainer}>
                <Text style={styles.successCodeLabel}>VOUCHER CODE</Text>
                <Text style={styles.successCodeText}>{newlyRedeemedVoucher?.code}</Text>
              </View>

              <Text style={styles.successExpiryText}>
                ⏳ Valid until: {newlyRedeemedVoucher?.expiresAt}
              </Text>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => handleCopyCode(newlyRedeemedVoucher)}
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

const getStyles = (colors, isDark, isDesktop, isWideDesktop) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? tokens.spacing.xl : tokens.spacing.md,
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
      paddingVertical: 7,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.full,
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
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: isDesktop ? tokens.spacing.xl : tokens.spacing.md,
      paddingBottom: tokens.spacing.xxl,
      alignItems: 'center',
    },
    contentWrapper: {
      width: '100%',
      maxWidth: 1140,
    },

    // HERO CARD
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: isDesktop ? tokens.spacing.lg : tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: isDesktop ? 'space-between' : 'flex-start',
      alignItems: isDesktop ? 'center' : 'stretch',
      gap: isDesktop ? tokens.spacing.lg : tokens.spacing.md,
      ...tokens.shadow.sm,
    },
    heroLeftCol: {
      flex: isDesktop ? 1.2 : 0,
    },
    heroSubLabel: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
      marginBottom: 2,
    },
    pointsRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    heroPointsValue: {
      fontSize: isDesktop ? 36 : 30,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
    },
    heroPointsUnit: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.muted,
      marginLeft: 6,
    },
    cashValPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#10b98115',
      borderWidth: 1,
      borderColor: '#10b98135',
      paddingVertical: 5,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      marginTop: 2,
    },
    cashValAmount: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.extrabold,
      color: '#10b981',
    },
    rateDivider: {
      width: 1,
      height: 12,
      backgroundColor: '#10b98140',
      marginHorizontal: 8,
    },
    rateNote: {
      fontSize: 11,
      fontFamily: tokens.typography.family.semibold,
      color: colors.muted,
    },
    heroRightCol: {
      flex: isDesktop ? 1 : 0,
      alignItems: isDesktop ? 'flex-end' : 'stretch',
      gap: tokens.spacing.sm,
    },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: isDesktop ? 'flex-end' : 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing.md,
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
    heroActionsRow: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      width: isDesktop ? 'auto' : '100%',
    },
    heroActionBtnPrimary: {
      flex: isDesktop ? 0 : 1,
      backgroundColor: colors.accent,
      paddingVertical: 10,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
    },
    heroActionBtnPrimaryText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      textAlign: 'center',
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
      minHeight: 42,
    },
    heroActionBtnSecondaryText: {
      color: colors.text,
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },

    // TAB BAR
    tabBarWrapper: {
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.full,
      padding: 4,
      width: '100%',
      maxWidth: isDesktop ? 560 : '100%',
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: tokens.radius.full,
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

    // CATEGORIES
    categoriesWrapper: {
      marginBottom: tokens.spacing.md,
      alignItems: isDesktop ? 'center' : 'stretch',
    },
    categoryPillsContainer: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      paddingBottom: 4,
    },
    categoryPill: {
      paddingVertical: 7,
      paddingHorizontal: tokens.spacing.md,
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

    // CATALOG GRID (RESPONSIVE)
    catalogGrid: {
      flexDirection: isDesktop ? 'row' : 'column',
      flexWrap: isDesktop ? 'wrap' : 'nowrap',
      gap: tokens.spacing.md,
    },
    rewardCard: {
      width: isDesktop ? (isWideDesktop ? '31.8%' : '48.6%') : '100%',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'column',
      ...tokens.shadow.sm,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: tokens.spacing.xs,
    },
    rewardIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: tokens.spacing.sm,
    },
    rewardIconText: {
      fontSize: 22,
    },
    cardHeaderTitleGroup: {
      flex: 1,
    },
    tagBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accentLight || 'rgba(0,0,0,0.05)',
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
      marginBottom: 3,
    },
    tagBadgeText: {
      fontSize: 9,
      fontFamily: tokens.typography.family.bold,
      color: colors.accent,
      textTransform: 'uppercase',
    },
    rewardTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      lineHeight: 18,
    },
    valuationStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      marginVertical: tokens.spacing.xs,
    },
    costPointPill: {
      backgroundColor: '#10b98118',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    costPointText: {
      fontSize: 11,
      fontFamily: tokens.typography.family.extrabold,
      color: '#10b981',
    },
    costInrPill: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    costInrText: {
      fontSize: 11,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    rewardDescription: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      lineHeight: 17,
      marginBottom: tokens.spacing.xs,
    },
    termsBox: {
      backgroundColor: colors.surface,
      padding: tokens.spacing.xs,
      borderRadius: tokens.radius.md,
      marginBottom: tokens.spacing.sm,
    },
    termsText: {
      fontSize: 10,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
      lineHeight: 14,
    },

    // Card Footer Area with perfectly aligned button
    cardFooterArea: {
      marginTop: 'auto',
      paddingTop: tokens.spacing.xs,
    },
    progressContainer: {
      marginBottom: tokens.spacing.xs,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
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
      height: 5,
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
      justifyContent: 'center',
      minHeight: 42,
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
      textAlign: 'center',
    },
    redeemButtonTextDisabled: {
      color: colors.muted,
    },

    // VOUCHERS WALLET
    vouchersContainer: {
      width: '100%',
    },
    vouchersGrid: {
      flexDirection: isDesktop ? 'row' : 'column',
      flexWrap: isDesktop ? 'wrap' : 'nowrap',
      gap: tokens.spacing.md,
    },
    voucherCard: {
      width: isDesktop ? '48.8%' : '100%',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...tokens.shadow.sm,
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
      maxWidth: 440,
    },
    browseCatalogCta: {
      backgroundColor: colors.accent,
      paddingVertical: 9,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radius.lg,
    },
    browseCatalogCtaText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    ticketHeader: {
      padding: tokens.spacing.md,
      paddingBottom: tokens.spacing.xs,
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
      paddingVertical: 7,
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
      paddingVertical: 5,
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
      height: 26,
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.sm,
      paddingHorizontal: tokens.spacing.md,
      marginBottom: tokens.spacing.sm,
    },
    bar: {
      height: 20,
      backgroundColor: colors.text,
      borderRadius: 1,
      opacity: 0.8,
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

    // HISTORY
    historyContainer: {
      gap: tokens.spacing.md,
      width: '100%',
    },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    historyHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: tokens.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: tokens.spacing.xs,
    },
    historyHeaderTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    historyHeaderRate: {
      fontSize: 11,
      fontFamily: tokens.typography.family.medium,
      color: colors.muted,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: tokens.spacing.sm,
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
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.extrabold,
    },
    historyInrVal: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      marginTop: 1,
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

    // MODALS
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: tokens.spacing.md,
    },
    modalContentCard: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      ...tokens.shadow.md,
    },
    modalIconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: tokens.spacing.sm,
    },
    modalIconText: {
      fontSize: 30,
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
      paddingVertical: 11,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    modalCancelBtnText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    modalConfirmBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 11,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
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
