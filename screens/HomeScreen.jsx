import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
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
import CleanupVerifyModal from '../components/CleanupVerifyModal';
import {
  getUserEcoPoints,
  getAreaComplaints,
  updateComplaintStatus,
  getCollectorDutyStatus,
  setCollectorDutyStatus,
  formatWardName,
} from '../db/database';
import { supabase } from '../lib/supabase';
import { sendLocalComplaintNotification } from '../lib/notifications';
import { tokens, useTheme } from '../lib/theme';

export default function HomeScreen({ user, onLogout }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
    if (screen === 'rewards' || screen.startsWith('rewards_')) {
      setCurrentScreen('waste_pickup');
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
  const [dashboardVerifyComplaint, setDashboardVerifyComplaint] = useState(null);

  // Garbage Collector Online/Offline Duty State & Live Alerts
  const [isDutyOnline, setIsDutyOnline] = useState(true);
  const isDutyOnlineRef = useRef(true);
  const [liveAlert, setLiveAlert] = useState(null);

  useEffect(() => {
    if (isCollector && user?.id) {
      getCollectorDutyStatus(user.id).then((status) => {
        setIsDutyOnline(status);
        isDutyOnlineRef.current = status;
      });
    }
  }, [isCollector, user?.id]);

  const handleToggleDuty = async () => {
    const next = !isDutyOnline;
    setIsDutyOnline(next);
    isDutyOnlineRef.current = next;
    if (user?.id) {
      await setCollectorDutyStatus(user.id, next);
    }
  };

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
          // If collector is offline, suppress notifications & alerts
          if (!isDutyOnlineRef.current) return;

          loadCollectorData();
          sendLocalComplaintNotification({
            title: `🚨 New Waste Alert: ${formatWardName(user.area_id)}`,
            body: `${payload.new.category || 'General Waste'}: ${payload.new.description || 'New report filed in Assagao.'}`,
          });
          setLiveAlert(payload.new);
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

  const handleStatusUpdate = async (complaintId, newStatus, collectorImageBase64 = null, resolvedAt = null, collectorLatitude = null, collectorLongitude = null) => {
    setUpdatingId(complaintId);
    try {
      await updateComplaintStatus({
        complaintId,
        status: newStatus,
        workerId: user.id,
        collectorImageBase64,
        resolvedAt,
        collectorLatitude,
        collectorLongitude,
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

  const availableCount = collectorComplaints.filter((c) => !c.status || c.status === 'Submitted').length;
  const inProgressCount = collectorComplaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length;
  const activeCount = collectorComplaints.filter((c) => c.status !== 'Completed').length;
  const completedCount = collectorComplaints.filter((c) => c.status === 'Completed').length;

  const filteredCollectorComplaints = collectorComplaints.filter((c) => {
    if (collectorFilter === 'ACTIVE') return c.status !== 'Completed';
    if (collectorFilter === 'COMPLETED') return c.status === 'Completed';
    return true;
  });

  const renderContent = () => {
    if (!isCollector) {
      if (currentScreen === 'complaint') {
        return (
          <FileComplaintScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
        );
      }
      if (currentScreen === 'my_complaints') {
        return (
          <MyComplaintsScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onGoToReport={() => setCurrentScreen('complaint')}
          />
        );
      }
      if (currentScreen === 'waste_pickup') {
        return (
          <WastePickupScreen
            user={user}
            ecoPoints={ecoPoints}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onPointsUpdated={(newPts) => setEcoPoints(newPts)}
          />
        );
      }
      if (currentScreen === 'recycle') {
        return (
          <RecycleScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
        );
      }
      if (currentScreen === 'scoreboard') {
        return (
          <ScoreboardScreen
            user={user}
            ecoPoints={ecoPoints}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            isCollector={false}
          />
        );
      }

    }

    if (isCollector) {
      if (currentScreen === 'collector_tasks') {
        return (
          <CollectorTasksScreen
            user={user}
            initialTab={collectorTasksTab}
            complaints={collectorComplaints}
            updatingId={updatingId}
            onUpdateStatus={handleStatusUpdate}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onRefresh={loadCollectorData}
            isDutyOnline={isDutyOnline}
            onToggleDuty={handleToggleDuty}
          />
        );
      }
      if (currentScreen === 'scoreboard') {
        return (
          <ScoreboardScreen
            user={user}
            ecoPoints={0}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            isCollector={true}
          />
        );
      }
    }

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
            <Image
              source={require('../assets/leaf-icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>SHODHINI</Text>
          </View>

          <View style={styles.topRight}>
            <TouchableOpacity
              style={styles.themeToggleBtn}
              onPress={toggleTheme}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Day/Dark Theme"
            >
              <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>

            {!isCollector ? (
              <TouchableOpacity
                style={styles.topPointsPill}
                onPress={() => handleNavigate('waste_pickup')}
                activeOpacity={0.8}
              >
                <Text style={styles.topPointsText}>🌱 {ecoPoints} pts</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.topDutyPill,
                  isDutyOnline ? styles.topDutyPillOnline : styles.topDutyPillOffline,
                ]}
                onPress={handleToggleDuty}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Collector Duty Status"
              >
                <View style={[styles.dutyDot, isDutyOnline ? styles.dutyDotOnline : styles.dutyDotOffline]} />
                <Text style={[styles.topDutyText, isDutyOnline ? styles.topDutyTextOnline : styles.topDutyTextOffline]}>
                  {isDutyOnline ? '🟢 On Duty' : '⚪ Off Duty'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Clean Greeting Header */}
          <View style={styles.greetingHeader}>
            <Text style={styles.greetingTitle}>Welcome, {user?.name || 'User'}</Text>
            <Text style={styles.greetingSub}>
              📍 {user?.area || 'Assagao - Ward 1'} • {isCollector ? 'Garbage Collector' : 'Citizen Resident'}
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
              {/* LIVE COMPLAINT ALERT BANNER */}
              {liveAlert && (
                <View style={styles.liveAlertCard}>
                  <View style={styles.liveAlertTop}>
                    <View style={styles.liveAlertBadge}>
                      <Text style={styles.liveAlertBadgeText}>🚨 NEW COMPLAINT ALERT</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setLiveAlert(null)}
                      style={styles.liveAlertClose}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.liveAlertCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.liveAlertTitle}>
                    {liveAlert.category || 'General Waste'} • {user?.area || 'Assagao - Ward 1'}
                  </Text>
                  <Text style={styles.liveAlertDesc} numberOfLines={2}>
                    {liveAlert.description || 'New waste issue filed in your ward.'}
                  </Text>
                  <View style={styles.liveAlertActions}>
                    <TouchableOpacity
                      style={styles.liveAlertAcceptBtn}
                      onPress={() => {
                        handleStatusUpdate(liveAlert.id, 'In Progress');
                        setLiveAlert(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.liveAlertAcceptText}>⚡ Accept Job</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.liveAlertDismissBtn}
                      onPress={() => setLiveAlert(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.liveAlertDismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* DUTY STATUS SWITCHER CARD */}
              <View style={[styles.dutyCard, isDutyOnline ? styles.dutyCardOnline : styles.dutyCardOffline]}>
                <View style={styles.dutyCardLeft}>
                  <View style={[styles.dutyIndicatorDot, isDutyOnline ? styles.dutyDotOnline : styles.dutyDotOffline]} />
                  <View style={styles.dutyCardTextBox}>
                    <Text style={[styles.dutyCardTitle, isDutyOnline ? styles.dutyTitleOnline : styles.dutyTitleOffline]}>
                      {isDutyOnline ? '🟢 Online • On Duty' : '⚪ Offline • Off Duty'}
                    </Text>
                    <Text style={styles.dutyCardSubtitle}>
                      {isDutyOnline
                        ? `Live alerts active for ${user?.area || 'Assagao - Ward 1'}`
                        : 'Complaints & notifications paused while off duty.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.dutyToggleBtn, isDutyOnline ? styles.dutyToggleBtnOffline : styles.dutyToggleBtnOnline]}
                  onPress={handleToggleDuty}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dutyToggleBtnText, isDutyOnline ? styles.dutyToggleTextOffline : styles.dutyToggleTextOnline]}>
                    {isDutyOnline ? 'Go Offline' : 'Go Online 🟢'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!isDutyOnline && (
                <View style={styles.offlineNoticeBanner}>
                  <Text style={styles.offlineNoticeIcon}>⏸️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offlineNoticeTitle}>You are currently Off Duty</Text>
                    <Text style={styles.offlineNoticeDesc}>
                      Switch to Online mode to receive realtime complaint dispatches and push notifications in your ward.
                    </Text>
                  </View>
                </View>
              )}

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
                  <Text style={[styles.opsChipNumber, { color: colors.accent }]}>{activeCount}</Text>
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
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.loadingBoxText}>Loading area feed...</Text>
                </View>
              ) : filteredCollectorComplaints.length === 0 ? (
                <View style={styles.emptyCollectorBox}>
                  <Text style={styles.emptyIcon}>🎉</Text>
                  <Text style={styles.emptyCollectorTitle}>No Complaints Pending</Text>
                  <Text style={styles.emptyCollectorDesc}>
                    {user?.area || 'Assagao Village'} currently has no active waste hotspots.
                  </Text>
                </View>
              ) : (
                filteredCollectorComplaints.map((item) => (
                  <ComplaintCard
                    key={item.id}
                    item={item}
                    updatingId={updatingId}
                    onUpdateStatus={handleStatusUpdate}
                    onVerifyCleanup={setDashboardVerifyComplaint}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.rootContainer}>
      {renderContent()}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        user={user}
        ecoPoints={isCollector ? 0 : ecoPoints}
        onLogout={onLogout}
        isCollector={isCollector}
        isDutyOnline={isDutyOnline}
        onToggleDuty={handleToggleDuty}
      />
      {isCollector && (
        <CleanupVerifyModal
          visible={Boolean(dashboardVerifyComplaint)}
          complaint={dashboardVerifyComplaint}
          onClose={() => setDashboardVerifyComplaint(null)}
          onConfirmDone={async ({ complaintId, afterImageBase64, resolvedAt, latitude, longitude }) => {
            await handleStatusUpdate(
              complaintId,
              'Completed',
              afterImageBase64,
              resolvedAt,
              latitude,
              longitude
            );
          }}
        />
      )}
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    rootContainer: {
      flex: 1,
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      backgroundColor: colors.headerBg || colors.background,
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
      gap: tokens.spacing.xs,
    },
    themeToggleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeToggleIcon: {
      fontSize: 16,
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
      color: colors.text,
      fontWeight: tokens.typography.weight.bold,
    },
    headerLogo: {
      width: 22,
      height: 22,
      marginRight: 6,
    },
    appName: {
      fontSize: tokens.typography.size.base,
      fontWeight: tokens.typography.weight.extrabold,
      color: colors.accent,
      letterSpacing: 0.5,
    },
    topPointsPill: {
      backgroundColor: colors.accent + '20',
      paddingVertical: 5,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: colors.accent + '40',
    },
    topPointsText: {
      color: colors.accent,
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    topDutyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
    },
    topDutyPillOnline: {
      backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : '#ecfdf5',
      borderColor: '#22c55e',
    },
    topDutyPillOffline: {
      backgroundColor: isDark ? 'rgba(148,163,184,0.15)' : '#f1f5f9',
      borderColor: isDark ? 'rgba(148,163,184,0.3)' : '#cbd5e1',
    },
    dutyDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    dutyDotOnline: {
      backgroundColor: '#22c55e',
    },
    dutyDotOffline: {
      backgroundColor: isDark ? '#94a3b8' : '#64748b',
    },
    topDutyText: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    topDutyTextOnline: {
      color: isDark ? '#4ade80' : '#15803d',
    },
    topDutyTextOffline: {
      color: colors.muted,
    },
    dutyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      marginBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    dutyCardOnline: {
      backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4',
      borderColor: isDark ? 'rgba(34,197,94,0.35)' : '#bbf7d0',
    },
    dutyCardOffline: {
      backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc',
      borderColor: colors.border,
    },
    dutyCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: tokens.spacing.sm,
    },
    dutyIndicatorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    dutyCardTextBox: {
      flex: 1,
    },
    dutyCardTitle: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
    },
    dutyTitleOnline: {
      color: isDark ? '#4ade80' : '#166534',
    },
    dutyTitleOffline: {
      color: colors.muted,
    },
    dutyCardSubtitle: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginTop: 2,
    },
    dutyToggleBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: tokens.radius.full,
    },
    dutyToggleBtnOnline: {
      backgroundColor: '#22c55e',
    },
    dutyToggleBtnOffline: {
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239,68,68,0.4)' : '#fca5a5',
    },
    dutyToggleBtnText: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    dutyToggleTextOnline: {
      color: '#ffffff',
    },
    dutyToggleTextOffline: {
      color: isDark ? '#f87171' : '#b91c1c',
    },
    liveAlertCard: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      borderWidth: 2,
      borderColor: '#f59e0b',
      marginBottom: tokens.spacing.md,
      ...tokens.shadow.md,
    },
    liveAlertTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    liveAlertBadge: {
      backgroundColor: '#fef3c7',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    liveAlertBadgeText: {
      fontSize: 11,
      fontWeight: tokens.typography.weight.extrabold,
      color: '#b45309',
    },
    liveAlertClose: {
      padding: 4,
    },
    liveAlertCloseText: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: tokens.typography.weight.bold,
    },
    liveAlertTitle: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
      marginBottom: 4,
    },
    liveAlertDesc: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginBottom: tokens.spacing.sm,
      lineHeight: 18,
    },
    liveAlertActions: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
    },
    liveAlertAcceptBtn: {
      flex: 1,
      backgroundColor: '#22c55e',
      paddingVertical: 8,
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveAlertAcceptText: {
      color: '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    liveAlertDismissBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveAlertDismissText: {
      color: colors.muted,
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.medium,
    },
    offlineNoticeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : '#fffbeb',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.3)' : '#fde68a',
      borderRadius: tokens.radius.md,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    offlineNoticeIcon: {
      fontSize: 22,
    },
    offlineNoticeTitle: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
      color: isDark ? '#facc15' : '#854d0e',
      marginBottom: 2,
    },
    offlineNoticeDesc: {
      fontSize: 11,
      color: isDark ? '#d4d4d8' : '#713f12',
      lineHeight: 16,
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
      color: colors.text,
    },
    greetingSub: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginTop: 2,
    },
    heroReportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.accent,
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
      color: colors.muted,
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
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 88,
    },
    gridCardIcon: {
      fontSize: 26,
      marginBottom: 6,
    },
    gridCardTitle: {
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
      textAlign: 'center',
    },
    collectorFeedContainer: {
      marginTop: tokens.spacing.xs,
    },
    collectorOpsStrip: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      paddingVertical: tokens.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: isDark ? '#38bdf8' : '#0284c7',
    },
    opsChipLabel: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
      fontWeight: tokens.typography.weight.medium,
    },
    opsChipDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    collectorFilterRow: {
      flexDirection: 'row',
      gap: tokens.spacing.xs,
      marginBottom: tokens.spacing.md,
    },
    collectorPill: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.full,
      paddingVertical: 6,
      alignItems: 'center',
    },
    collectorPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    collectorPillText: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      fontWeight: tokens.typography.weight.medium,
    },
    collectorPillTextActive: {
      color: '#ffffff',
      fontWeight: tokens.typography.weight.bold,
    },
    loadingBox: {
      alignItems: 'center',
      padding: tokens.spacing.lg,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadingBoxText: {
      marginTop: tokens.spacing.sm,
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
    },
    emptyCollectorBox: {
      alignItems: 'center',
      padding: tokens.spacing.xl,
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyIcon: {
      fontSize: 28,
      marginBottom: tokens.spacing.xs,
    },
    emptyCollectorTitle: {
      fontSize: tokens.typography.size.base,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
    },
    emptyCollectorDesc: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 2,
    },
  });
