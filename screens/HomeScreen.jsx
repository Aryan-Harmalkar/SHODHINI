import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Sidebar from '../components/Sidebar';
import FileComplaintScreen from './FileComplaintScreen';
import MyComplaintsScreen from './MyComplaintsScreen';
import WastePickupScreen from './WastePickupScreen';
import RecycleScreen from './RecycleScreen';
import ScoreboardScreen from './ScoreboardScreen';
import RewardsScreen from './RewardsScreen';
import CollectorTasksScreen from './CollectorTasksScreen';
import ComplaintCard from '../components/ComplaintCard';
import {
  getUserEcoPoints,
  getAreaComplaints,
  updateComplaintStatus,
} from '../db/database';
import { supabase } from '../lib/supabase';
import { tokens } from '../lib/theme';

export default function HomeScreen({ user, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [rewardsTab, setRewardsTab] = useState('redeem');
  const [collectorTasksTab, setCollectorTasksTab] = useState('available');

  const isCollector = user?.role === 'worker';

  const handleNavigate = (screen) => {
    if (isCollector && (screen === 'rewards' || screen.startsWith('rewards_') || screen === 'complaint' || screen === 'waste_pickup' || screen === 'recycle')) {
      return;
    }
    if (screen === 'rewards_redeem') {
      setRewardsTab('redeem');
      setCurrentScreen('rewards');
    } else if (screen === 'rewards_coupons') {
      setRewardsTab('coupons');
      setCurrentScreen('rewards');
    } else if (screen === 'rewards_history') {
      setRewardsTab('history');
      setCurrentScreen('rewards');
    } else if (screen === 'rewards') {
      setRewardsTab('redeem');
      setCurrentScreen('rewards');
    } else if (screen === 'collector_tasks_available') {
      setCollectorTasksTab('available');
      setCurrentScreen('collector_tasks');
    } else if (screen === 'collector_tasks_pending') {
      setCollectorTasksTab('pending');
      setCurrentScreen('collector_tasks');
    } else if (screen === 'collector_track_location') {
      setCollectorTasksTab('location');
      setCurrentScreen('collector_tasks');
    } else if (screen === 'collector_tasks_completed') {
      setCollectorTasksTab('completed');
      setCurrentScreen('collector_tasks');
    } else if (screen === 'collector_tasks') {
      setCollectorTasksTab('available');
      setCurrentScreen('collector_tasks');
    } else {
      setCurrentScreen(screen);
    }
  };

  const [collectorComplaints, setCollectorComplaints] = useState([]);
  const [collectorLoading, setCollectorLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [collectorFilter, setCollectorFilter] = useState('ALL');

  useEffect(() => {
    if (user?.id && !isCollector) {
      loadEcoPoints();
    }
  }, [user, currentScreen, isCollector]);

  useEffect(() => {
    if (!isCollector || !user?.area_id) return;

    loadCollectorData();

    const channelName = `collector_feed_area_${user.area_id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaints',
          filter: `area_id=eq.${user.area_id}`,
        },
        async (payload) => {
          loadCollectorData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'complaints',
          filter: `area_id=eq.${user.area_id}`,
        },
        (payload) => {
          setCollectorComplaints((prev) =>
            prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...c,
                    ...payload.new,
                    location: c.location,
                    citizenName: c.citizenName,
                    citizenPhone: c.citizenPhone,
                  }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCollector, user?.area_id]);

  const loadEcoPoints = async () => {
    if (!user?.id || isCollector) return;
    try {
      const points = await getUserEcoPoints(user.id);
      setEcoPoints(points || 0);
    } catch (e) {
      console.error('Error fetching eco points:', e);
    }
  };

  const loadCollectorData = async () => {
    if (!user?.area_id) return;
    try {
      const list = await getAreaComplaints(user.area_id);
      setCollectorComplaints(list || []);
    } catch (e) {
      console.error('Error fetching collector complaints:', e);
    } finally {
      setCollectorLoading(false);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    setUpdatingId(complaintId);
    try {
      await updateComplaintStatus({
        complaintId,
        status: newStatus,
        workerId: user.id,
      });

      setCollectorComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? { ...c, status: newStatus, assigned_worker_id: user.id }
            : c
        )
      );
    } catch (err) {
      Alert.alert('Status Update Failed', err.message || 'Could not update complaint status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isCollector) {
    if (currentScreen === 'complaint') {
      return (
        <>
          <FileComplaintScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'my_complaints') {
      return (
        <>
          <MyComplaintsScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onGoToReport={() => setCurrentScreen('complaint')}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'waste_pickup') {
      return (
        <>
          <WastePickupScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'recycle') {
      return (
        <>
          <RecycleScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'scoreboard') {
      return (
        <>
          <ScoreboardScreen
            user={user}
            ecoPoints={ecoPoints}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            isCollector={false}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'rewards') {
      return (
        <>
          <RewardsScreen
            user={user}
            ecoPoints={ecoPoints}
            initialTab={rewardsTab}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onNavigatePickup={() => setCurrentScreen('waste_pickup')}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }
  }

  if (isCollector) {
    if (currentScreen === 'collector_tasks') {
      return (
        <>
          <CollectorTasksScreen
            user={user}
            initialTab={collectorTasksTab}
            complaints={collectorComplaints}
            updatingId={updatingId}
            onUpdateStatus={handleStatusUpdate}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onRefresh={loadCollectorData}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={0}
            onLogout={onLogout}
            isCollector={true}
          />
        </>
      );
    }

    if (currentScreen === 'scoreboard') {
      return (
        <>
          <ScoreboardScreen
            user={user}
            ecoPoints={0}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            isCollector={true}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
            user={user}
            ecoPoints={0}
            onLogout={onLogout}
            isCollector={true}
          />
        </>
      );
    }
  }

  const filteredCollectorComplaints = collectorComplaints.filter((c) => {
    if (collectorFilter === 'ACTIVE') return c.status !== 'Completed';
    if (collectorFilter === 'COMPLETED') return c.status === 'Completed';
    return true;
  });

  const availableCount = collectorComplaints.filter((c) => !c.status || c.status === 'Submitted').length;
  const inProgressCount = collectorComplaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length;
  const activeCount = collectorComplaints.filter((c) => c.status !== 'Completed').length;
  const completedCount = collectorComplaints.filter((c) => c.status === 'Completed').length;

  return (
    <View style={styles.container}>
      {/* Sleek Minimal Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.appName}>SHODHINI</Text>
        </View>

        {!isCollector ? (
          <TouchableOpacity
            style={styles.topPointsPill}
            onPress={() => handleNavigate('rewards')}
            activeOpacity={0.8}
          >
            <Text style={styles.topPointsText}>🌱 {ecoPoints} pts</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topDutyPill}>
            <View style={styles.dutyDot} />
            <Text style={styles.topDutyText}>{user?.area || 'Ward 1'}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Clean Greeting Header */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingTitle}>Welcome, {user?.name || 'User'}</Text>
          <Text style={styles.greetingSub}>
            📍 {user?.area || 'Ward 1'} • {isCollector ? 'Garbage Collector' : 'Citizen Resident'}
          </Text>
        </View>

        {/* CITIZEN VIEW: MINIMAL, FAST & PURPOSEFUL */}
        {!isCollector && (
          <>
            {/* Primary Action Button */}
            <TouchableOpacity
              style={styles.heroReportBtn}
              onPress={() => setCurrentScreen('complaint')}
              activeOpacity={0.85}
            >
              <View style={styles.heroLeft}>
                <View style={styles.heroIconBox}>
                  <Text style={styles.heroIcon}>📸</Text>
                </View>
                <View>
                  <Text style={styles.heroTitle}>Report Waste Spot</Text>
                  <Text style={styles.heroSubtitle}>Capture photo & alert area collectors</Text>
                </View>
              </View>
              <Text style={styles.heroArrow}>→</Text>
            </TouchableOpacity>

            {/* Clean Services Grid (No bloated multi-line text) */}
            <Text style={styles.sectionTitle}>Services</Text>

            <View style={styles.gridContainer}>
              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => setCurrentScreen('my_complaints')}
                activeOpacity={0.7}
              >
                <Text style={styles.gridCardIcon}>📋</Text>
                <Text style={styles.gridCardTitle}>My Reports</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => handleNavigate('scoreboard')}
                activeOpacity={0.7}
              >
                <Text style={styles.gridCardIcon}>🏆</Text>
                <Text style={styles.gridCardTitle}>Scoreboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => handleNavigate('rewards')}
                activeOpacity={0.7}
              >
                <Text style={styles.gridCardIcon}>🎁</Text>
                <Text style={styles.gridCardTitle}>Rewards</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => handleNavigate('waste_pickup')}
                activeOpacity={0.7}
              >
                <Text style={styles.gridCardIcon}>🚚</Text>
                <Text style={styles.gridCardTitle}>Doorstep Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridCard}
                onPress={() => handleNavigate('recycle')}
                activeOpacity={0.7}
              >
                <Text style={styles.gridCardIcon}>♻️</Text>
                <Text style={styles.gridCardTitle}>Scrap Recycling</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* COLLECTOR VIEW: CLEAN FIELD OPERATIONS */}
        {isCollector && (
          <View style={styles.collectorFeedContainer}>
            {/* Quick Operations Strip */}
            <View style={styles.collectorOpsStrip}>
              <TouchableOpacity
                style={styles.opsChip}
                onPress={() => handleNavigate('collector_tasks_available')}
                activeOpacity={0.7}
              >
                <Text style={styles.opsChipNumber}>{availableCount}</Text>
                <Text style={styles.opsChipLabel}>Available</Text>
              </TouchableOpacity>

              <View style={styles.opsChipDivider} />

              <TouchableOpacity
                style={styles.opsChip}
                onPress={() => handleNavigate('collector_tasks_pending')}
                activeOpacity={0.7}
              >
                <Text style={[styles.opsChipNumber, { color: '#d97706' }]}>{inProgressCount}</Text>
                <Text style={styles.opsChipLabel}>Pending</Text>
              </TouchableOpacity>

              <View style={styles.opsChipDivider} />

              <TouchableOpacity
                style={styles.opsChip}
                onPress={() => handleNavigate('collector_track_location')}
                activeOpacity={0.7}
              >
                <Text style={[styles.opsChipNumber, { color: tokens.colors.accent }]}>{activeCount}</Text>
                <Text style={styles.opsChipLabel}>Map Route</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.collectorFilterRow}>
              <TouchableOpacity
                style={[styles.collectorPill, collectorFilter === 'ALL' && styles.collectorPillActive]}
                onPress={() => setCollectorFilter('ALL')}
                activeOpacity={0.7}
              >
                <Text style={[styles.collectorPillText, collectorFilter === 'ALL' && styles.collectorPillTextActive]}>
                  All ({collectorComplaints.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.collectorPill, collectorFilter === 'ACTIVE' && styles.collectorPillActive]}
                onPress={() => setCollectorFilter('ACTIVE')}
                activeOpacity={0.7}
              >
                <Text style={[styles.collectorPillText, collectorFilter === 'ACTIVE' && styles.collectorPillTextActive]}>
                  Active ({activeCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.collectorPill, collectorFilter === 'COMPLETED' && styles.collectorPillActive]}
                onPress={() => setCollectorFilter('COMPLETED')}
                activeOpacity={0.7}
              >
                <Text style={[styles.collectorPillText, collectorFilter === 'COMPLETED' && styles.collectorPillTextActive]}>
                  Done ({completedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {collectorLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={tokens.colors.accent} />
                <Text style={styles.loadingBoxText}>Loading area feed...</Text>
              </View>
            ) : filteredCollectorComplaints.length === 0 ? (
              <View style={styles.emptyCollectorBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyCollectorTitle}>No Complaints Pending</Text>
                <Text style={styles.emptyCollectorDesc}>
                  {user?.area || 'Ward'} currently has no active waste hotspots.
                </Text>
              </View>
            ) : (
              filteredCollectorComplaints.map((item) => (
                <ComplaintCard
                  key={item.id}
                  item={item}
                  updatingId={updatingId}
                  onUpdateStatus={handleStatusUpdate}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        user={user}
        ecoPoints={isCollector ? 0 : ecoPoints}
        onLogout={onLogout}
        isCollector={isCollector}
      />
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
  hamburgerBtn: {
    padding: tokens.spacing.xs,
    marginRight: tokens.spacing.sm,
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.bold,
  },
  appName: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    letterSpacing: 0.5,
  },
  topPointsPill: {
    backgroundColor: tokens.colors.accent + '15',
    paddingVertical: 5,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.accent + '30',
  },
  topPointsText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  topDutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent + '15',
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.accent,
    marginRight: 6,
  },
  topDutyText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  greetingHeader: {
    marginBottom: tokens.spacing.md,
  },
  greetingTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  greetingSub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  heroReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    flex: 1,
  },
  heroIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 20,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: tokens.typography.size.xs,
    marginTop: 1,
  },
  heroArrow: {
    color: '#ffffff',
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    marginLeft: tokens.spacing.xs,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
    minHeight: 88,
  },
  gridCardIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  gridCardTitle: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  collectorFeedContainer: {
    marginTop: tokens.spacing.xs,
  },
  collectorOpsStrip: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.md,
  },
  opsChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opsChipNumber: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#0284c7',
  },
  opsChipLabel: {
    fontSize: 11,
    color: tokens.colors.muted,
    marginTop: 2,
    fontWeight: tokens.typography.weight.medium,
  },
  opsChipDivider: {
    width: 1,
    backgroundColor: tokens.colors.border,
  },
  collectorFilterRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  collectorPill: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    paddingVertical: 6,
    alignItems: 'center',
  },
  collectorPillActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  collectorPillText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.medium,
  },
  collectorPillTextActive: {
    color: tokens.colors.background,
    fontWeight: tokens.typography.weight.bold,
  },
  loadingBox: {
    alignItems: 'center',
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
  },
  loadingBoxText: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
  },
  emptyCollectorBox: {
    alignItems: 'center',
    padding: tokens.spacing.xl,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: tokens.spacing.xs,
  },
  emptyCollectorTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  emptyCollectorDesc: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
});
