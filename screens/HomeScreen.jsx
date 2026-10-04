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

  const [collectorComplaints, setCollectorComplaints] = useState([]);
  const [collectorLoading, setCollectorLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [collectorFilter, setCollectorFilter] = useState('ALL');

  const isCollector = user?.role === 'worker';

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
          console.log('Realtime INSERT for collector area:', payload.new.id);
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
          console.log('Realtime UPDATE for complaint:', payload.new.id);
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
            onNavigate={(screen) => setCurrentScreen(screen)}
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
            onNavigate={(screen) => setCurrentScreen(screen)}
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
            onNavigate={(screen) => setCurrentScreen(screen)}
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
            onNavigate={(screen) => setCurrentScreen(screen)}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
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

  const activeCount = collectorComplaints.filter((c) => c.status !== 'Completed').length;
  const completedCount = collectorComplaints.filter((c) => c.status === 'Completed').length;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {!isCollector && (
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => setSidebarVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.appName}>SHODHINI</Text>
        </View>

        {isCollector && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.userCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, isCollector ? styles.collectorBadge : styles.citizenBadge]}>
              <Text style={[styles.roleBadgeText, isCollector && { color: tokens.colors.background }]}>
                {isCollector ? 'Garbage Collector' : 'Citizen / User'}
              </Text>
            </View>

            {isCollector && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Feed</Text>
              </View>
            )}
          </View>

          <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Identifier:</Text>
            <Text style={styles.infoValue}>{user?.identifier || user?.email || 'N/A'}</Text>
          </View>
          {user?.area && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{isCollector ? 'Assigned Area:' : 'Home Area:'}</Text>
              <Text style={styles.infoValue}>📍 {user.area}</Text>
            </View>
          )}
        </View>

        {!isCollector && (
          <>
            <View style={styles.ecoPointsCard}>
              <View style={styles.ecoHeaderRow}>
                <View>
                  <Text style={styles.ecoTitle}>🌱 Your Eco Points</Text>
                  <Text style={styles.ecoPointsNumber}>{ecoPoints} pts</Text>
                </View>
                <View style={styles.ecoBadge}>
                  <Text style={styles.ecoBadgeText}>
                    {ecoPoints > 0 ? 'Eco Champion' : 'Level 1 Eco Citizen'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ecoSubtitle}>
                Earn 15 points each time a reported complaint is completed by local sanitation teams!
              </Text>
            </View>

            <View style={styles.sidebarPromptCard}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptIcon}>🧭</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promptTitle}>Looking for more services?</Text>
                  <Text style={styles.promptText}>
                    Open the sidebar menu (☰) to file complaints, request paid doorstep waste pickup, recycle e-waste, and track status.
                  </Text>
                </View>
              </View>
              <View style={styles.promptButtonRow}>
                <TouchableOpacity
                  style={styles.openSidebarBtn}
                  onPress={() => setSidebarVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openSidebarBtnText}>Open Sidebar ☰</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trackComplaintsQuickBtn}
                  onPress={() => setCurrentScreen('my_complaints')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.trackComplaintsQuickText}>Track Status 📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.sectionHeader}>Quick Actions</Text>
              <Text style={styles.sectionDesc}>
                Spot illegal waste dumping or overflowing municipal dustbins? Submit a quick report.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCurrentScreen('complaint')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>📝 Report Waste / File Complaint</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.servicesGrid}>
              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('waste_pickup')}
                activeOpacity={0.7}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>🚚</Text>
                  <View style={styles.paidMiniBadge}>
                    <Text style={styles.paidMiniBadgeText}>PAID</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Waste Pickup</Text>
                <Text style={styles.serviceTileDesc}>No bins nearby? Book convenient doorstep collection.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('recycle')}
                activeOpacity={0.7}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>♻️</Text>
                  <View style={styles.ecoMiniBadge}>
                    <Text style={styles.ecoMiniBadgeText}>+PTS</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Recycle Scrap</Text>
                <Text style={styles.serviceTileDesc}>Dispose of e-waste, metal, paper and earn bonus Eco Points.</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isCollector && (
          <View style={styles.collectorFeedContainer}>
            <View style={styles.feedHeaderRow}>
              <View>
                <Text style={styles.sectionHeader}>Complaints in Your Area</Text>
                <Text style={styles.feedSubtext}>Live updates for {user?.area || `Ward ${user?.area_id || ''}`}</Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadCollectorData} activeOpacity={0.7}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>

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
                  Completed ({completedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {collectorLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={tokens.colors.accent} />
                <Text style={styles.loadingBoxText}>Loading area complaints feed...</Text>
              </View>
            ) : filteredCollectorComplaints.length === 0 ? (
              <View style={styles.emptyCollectorBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyCollectorTitle}>No Complaints Pending!</Text>
                <Text style={styles.emptyCollectorDesc}>
                  Your assigned area ({user?.area || 'Ward'}) has no complaints matching this filter.
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

      {!isCollector && (
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          user={user}
          ecoPoints={ecoPoints}
          onLogout={onLogout}
        />
      )}
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
  hamburgerBtn: {
    padding: tokens.spacing.xs,
    marginRight: tokens.spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.bold,
  },
  appName: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    minHeight: 44,
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  userCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  roleBadge: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
  },
  citizenBadge: {
    backgroundColor: tokens.colors.accent + '20',
  },
  collectorBadge: {
    backgroundColor: tokens.colors.accent,
  },
  roleBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.danger + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.danger,
    marginRight: tokens.spacing.xs,
  },
  liveText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.danger,
  },
  welcomeText: {
    fontSize: tokens.typography.size.xl,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.xs,
  },
  infoLabel: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    width: 125,
    fontWeight: tokens.typography.weight.medium,
  },
  infoValue: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.semibold,
    flex: 1,
  },
  ecoPointsCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    ...tokens.shadow.sm,
  },
  ecoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ecoTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  ecoPointsNumber: {
    fontSize: tokens.typography.size.xxl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    marginVertical: tokens.spacing.xs,
  },
  ecoBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
  },
  ecoBadgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  ecoSubtitle: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    lineHeight: 20,
  },
  sidebarPromptCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  promptHeader: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.md,
  },
  promptIcon: {
    fontSize: 24,
    marginRight: tokens.spacing.sm,
  },
  promptTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  promptText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  promptButtonRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  openSidebarBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openSidebarBtnText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  trackComplaintsQuickBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackComplaintsQuickText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  actionCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  sectionHeader: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  sectionDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    marginVertical: tokens.spacing.sm,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  serviceTile: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    ...tokens.shadow.sm,
    minHeight: 120,
  },
  serviceTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  serviceTileIcon: {
    fontSize: 24,
  },
  paidMiniBadge: {
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  paidMiniBadgeText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.muted,
  },
  ecoMiniBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  ecoMiniBadgeText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  serviceTileTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  serviceTileDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    lineHeight: 18,
  },
  collectorFeedContainer: {
    marginTop: tokens.spacing.md,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  feedSubtext: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
  },
  refreshBtn: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  collectorFilterRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  collectorPill: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectorPillActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  collectorPillText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.colors.muted,
  },
  collectorPillTextActive: {
    color: tokens.colors.background,
    fontWeight: tokens.typography.weight.bold,
  },
  loadingBox: {
    alignItems: 'center',
    padding: tokens.spacing.xl,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
  },
  loadingBoxText: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
  },
  emptyCollectorBox: {
    alignItems: 'center',
    padding: tokens.spacing.xl,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  emptyIcon: {
    fontSize: tokens.typography.size.xxl,
    marginBottom: tokens.spacing.sm,
  },
  emptyCollectorTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  emptyCollectorDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
