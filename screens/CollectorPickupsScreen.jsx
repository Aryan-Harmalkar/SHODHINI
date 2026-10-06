import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';
import { rejectComplaint } from '../db/database';
import PickupVerifyModal from '../components/PickupVerifyModal';
// Max allowed distance (metres) between citizen's reported GPS and collector's live GPS
const MAX_DISTANCE_METERS = 100;

// Haversine great-circle distance in metres
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function CountdownTimer({ startTimeIso, durationMinutes = 3, onExpire, styles }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!startTimeIso) return;
    const startMs = new Date(startTimeIso).getTime();
    const endMs = startMs + durationMinutes * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = endMs - now;
      if (diff <= 0) {
        setTimeLeft(0);
        if (onExpire) onExpire();
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTimeIso, durationMinutes]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const expired = timeLeft <= 0;

  return (
    <View style={[styles.timerBadge, expired && styles.timerBadgeExpired]}>
      <Text style={[styles.timerText, expired && styles.timerTextExpired]}>
        {expired ? 'EXPIRED' : `⏱ ${m}:${s.toString().padStart(2, '0')}`}
      </Text>
    </View>
  );
}

export default function CollectorPickupsScreen({
  user,
  initialTab = 'available',
  complaints = [],
  updatingId = null,
  onUpdateStatus,
  onBackToHome,
  onOpenSidebar,
  onRefresh,
  isDutyOnline = true,
  onToggleDuty,
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState(initialTab || 'available');

  // Verification State
  const [verifyingComplaint, setVerifyingComplaint] = useState(null);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) setActiveTab(initialTab);
  }

  // ONLY SHOW DOORSTEP PICKUPS
  const pickupComplaints = complaints.filter((c) => c.category === 'Doorstep Pickup');

  const availableTasks = pickupComplaints.filter(
    (c) => !c.status || c.status === 'Submitted'
  );
  const pendingTasks = pickupComplaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Assigned'
  );
  const completedTasks = pickupComplaints.filter((c) => c.status === 'Completed');
  const activeGeoTasks = pickupComplaints.filter((c) => c.status !== 'Completed');

  const handleVerifyClick = (complaint) => {
    setVerifyingComplaint(complaint);
  };

  const handleRejectClick = (complaint) => {
    Alert.alert(
      'Reject Pickup',
      'Select a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Vehicle Full', onPress: () => processReject(complaint, 'Vehicle Full') },
        { text: 'Out of Shift', onPress: () => processReject(complaint, 'Out of Shift') },
        { text: 'Too Far', onPress: () => processReject(complaint, 'Too Far') },
      ],
      { cancelable: true }
    );
  };

  const processReject = async (complaint, reason) => {
    if (onRefresh) onRefresh(); // Temporary optimistic update
    try {
      await rejectComplaint({ 
        complaintId: complaint.id, 
        reason,
        currentQueue: complaint.gc_queue || []
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleOpenMaps = (lat, lng, address) => {
    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Map Error', 'Could not open map navigation.');
      });
    } else {
      const query = encodeURIComponent(`${address || 'Assagao'}, Goa`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Map Error', 'Could not open map navigation.');
      });
    }
  };

  const handleCallCitizen = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('No Phone', 'No phone number provided for this report.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Error', 'Could not initiate phone call.');
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🚚 Doorstep Pickups</Text>
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
          {onRefresh && (
            <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} activeOpacity={0.7}>
              <Text style={styles.refreshIconText}>🔄</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sleek Worker Header */}
        <View style={styles.workerHeader}>
          <View>
            <Text style={styles.workerName}>👷 {user?.name || 'Sanitation Team'}</Text>

          </View>
          <TouchableOpacity
            style={[
              styles.dutyPill,
              isDutyOnline ? styles.dutyPillOnline : styles.dutyPillOffline,
            ]}
            onPress={onToggleDuty}
            activeOpacity={0.7}
          >
            <View style={[styles.dutyDot, isDutyOnline ? styles.dutyDotOnline : styles.dutyDotOffline]} />
            <Text style={[styles.dutyText, isDutyOnline ? styles.dutyTextOnline : styles.dutyTextOffline]}>
              {isDutyOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isDutyOnline && (
          <TouchableOpacity
            style={styles.offlineAlertBar}
            onPress={onToggleDuty}
            activeOpacity={0.8}
          >
            <Text style={styles.offlineAlertIcon}>⏸️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineAlertTitle}>You are currently Offline</Text>
              <Text style={styles.offlineAlertSub}>
                New complaint alerts & dispatches are paused. Tap to go Online.
              </Text>
            </View>
            <View style={styles.goOnlineBadge}>
              <Text style={styles.goOnlineBadgeText}>Go Online 🟢</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Single Cohesive Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'available' && styles.tabButtonActive]}
            onPress={() => setActiveTab('available')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'available' && styles.tabButtonTextActive]}>
              Available ({availableTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}>
              Pending ({pendingTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'location' && styles.tabButtonActive]}
            onPress={() => setActiveTab('location')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'location' && styles.tabButtonTextActive]}>
              Route ({activeGeoTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
              Done ({completedTasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: AVAILABLE TASKS */}
        {activeTab === 'available' && (
          <View style={styles.taskList}>
            {availableTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>All Caught Up</Text>
                <Text style={styles.emptySub}>No unassigned waste reports right now.</Text>
              </View>
            ) : (
              availableTasks.map((item) => {
                const isUpdating = updatingId === item.id;
                return (
                  <View key={item.id} style={styles.taskCard}>
                    <View style={styles.cardTop}>
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1}}>
                        <Text style={styles.categoryTitle}>{item.category || 'General Waste'}</Text>
                        <CountdownTimer startTimeIso={item.created_at} durationMinutes={3} styles={styles} />
                      </View>
                    </View>

                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <Text style={styles.locationText}>📍 {item.location}</Text>
                    {item.citizenName && (
                      <Text style={styles.citizenText}>👤 {item.citizenName}</Text>
                    )}

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => onUpdateStatus(item.id, 'In Progress')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                        ) : (
                          <Text style={styles.primaryActionText}>✅ Accept</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.rejectBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => handleRejectClick(item)}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rejectBtnText}>❌ Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.secondaryActionText}>📍 Map</Text>
                      </TouchableOpacity>

                      {item.citizenPhone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCallCitizen(item.citizenPhone)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.callIcon}>📞</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: PENDING TASKS */}
        {activeTab === 'pending' && (
          <View style={styles.taskList}>
            {pendingTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>⏳</Text>
                <Text style={styles.emptyTitle}>No Pending Tasks</Text>
                <Text style={styles.emptySub}>Accept tasks from the Available tab to start clearing.</Text>
              </View>
            ) : (
              pendingTasks.map((item) => {
                const isUpdating = updatingId === item.id;
                return (
                  <View key={item.id} style={styles.taskCard}>
                    <View style={styles.cardTop}>
                      <Text style={styles.categoryTitle}>{item.category || 'Waste Clearing'}</Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        {item.accepted_at && (
                           <CountdownTimer startTimeIso={item.accepted_at} durationMinutes={60} styles={styles} />
                        )}
                        <View style={styles.pendingPill}>
                          <Text style={styles.pendingPillText}>IN PROGRESS</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <Text style={styles.locationText}>📍 {item.location}</Text>
                    {item.citizenName && (
                      <Text style={styles.citizenText}>👤 {item.citizenName}</Text>
                    )}

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.doneBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => {
                          setVerifyingComplaint(item);
                        }}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                        ) : (
                          <Text style={styles.doneBtnText}>✅ Mark Picked Up</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.secondaryActionText}>🗺️ Route</Text>
                      </TouchableOpacity>

                      {item.citizenPhone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCallCitizen(item.citizenPhone)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.callIcon}>📞</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: TRACK LOCATION & ROUTE */}
        {activeTab === 'location' && (
          <View style={styles.taskList}>
            {activeGeoTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>All Spots Cleared</Text>
                <Text style={styles.emptySub}>No active pickups right now.</Text>
              </View>
            ) : (
              activeGeoTasks.map((item, idx) => (
                <View key={item.id} style={styles.geoCard}>
                  <View style={styles.geoLeft}>
                    <Text style={styles.geoNumber}>#{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.geoCategory}>{item.category}</Text>
                      <Text style={styles.geoLocation}>📍 {item.location}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.geoNavBtn}
                    onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.geoNavText}>Open Map 🗺️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: COMPLETED TASKS */}
        {activeTab === 'completed' && (
          <View style={styles.taskList}>
            {completedTasks.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Completed Tasks</Text>
                <Text style={styles.emptySub}>Resolved jobs will appear here.</Text>
              </View>
            ) : (
              completedTasks.map((item) => (
                <View key={item.id} style={styles.completedCard}>
                  <View style={styles.completedLeft}>
                    <Text style={styles.completedCheck}>✓</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completedCategory}>{item.category}</Text>
                      <Text style={styles.completedLocation}>📍 {item.location}</Text>
                    </View>
                  </View>
                  <Text style={styles.completedTag}>Cleaned</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* VERIFICATION MODAL OVERLAY */}
      <PickupVerifyModal
        visible={!!verifyingComplaint}
        complaint={verifyingComplaint}
        onClose={() => setVerifyingComplaint(null)}
        onConfirmDone={async (res) => {
          await onUpdateStatus(res.complaintId, 'Completed', res.afterImageBase64, res.resolvedAt);
        }}
      />
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
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
    refreshIconBtn: {
      padding: tokens.spacing.xs,
      minHeight: 36,
      minWidth: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    refreshIconText: {
      fontSize: tokens.typography.size.sm,
    },
    backHomeBtn: {
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
      backgroundColor: colors.card,
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
    workerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.md,
    },
    workerName: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    workerArea: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginTop: 2,
    },
    dutyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
    },
    dutyPillOnline: {
      backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : '#ecfdf5',
      borderColor: '#22c55e',
    },
    dutyPillOffline: {
      backgroundColor: isDark ? 'rgba(148,163,184,0.15)' : '#f1f5f9',
      borderColor: isDark ? 'rgba(148,163,184,0.3)' : '#cbd5e1',
    },
    dutyDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 6,
    },
    dutyDotOnline: {
      backgroundColor: '#22c55e',
    },
    dutyDotOffline: {
      backgroundColor: isDark ? '#94a3b8' : '#64748b',
    },
    dutyText: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
    },
    dutyTextOnline: {
      color: isDark ? '#4ade80' : '#15803d',
    },
    dutyTextOffline: {
      color: colors.muted,
    },
    offlineAlertBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : '#fffbeb',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(234,179,8,0.3)' : '#fde68a',
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.sm,
      marginBottom: tokens.spacing.md,
      gap: tokens.spacing.sm,
    },
    offlineAlertIcon: {
      fontSize: 20,
    },
    offlineAlertTitle: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: isDark ? '#facc15' : '#854d0e',
    },
    offlineAlertSub: {
      fontSize: 10,
      color: isDark ? '#d4d4d8' : '#713f12',
      marginTop: 1,
    },
    goOnlineBadge: {
      backgroundColor: '#22c55e',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.full,
    },
    goOnlineBadgeText: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      color: isDark ? '#000' : '#fff',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.xl,
      padding: 3,
      marginBottom: tokens.spacing.md,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: tokens.radius.lg,
    },
    tabButtonActive: {
      backgroundColor: colors.background,
      ...tokens.shadow.sm,
    },
    tabButtonText: {
      fontSize: 11,
      fontFamily: tokens.typography.family.semibold,
      color: colors.muted,
    },
    tabButtonTextActive: {
      color: colors.accent,
      fontFamily: tokens.typography.family.bold,
    },
    taskList: {
      gap: tokens.spacing.sm,
    },
    taskCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.xs,
    },
    categoryTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    cardTime: {
      fontSize: 10,
      color: colors.muted,
    },
    pendingPill: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: tokens.radius.full,
    },
    pendingPillText: {
      fontSize: 9,
      fontFamily: tokens.typography.family.extrabold,
      color: isDark ? '#fcd34d' : '#d97706',
    },
    descriptionText: {
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      marginBottom: tokens.spacing.sm,
    },
    locationText: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginBottom: 2,
    },
    citizenText: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginBottom: tokens.spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: tokens.spacing.xs,
      marginTop: tokens.spacing.xs,
    },
    primaryActionBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 8,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryActionText: {
      color: isDark ? '#000' : '#fff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    doneBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      paddingVertical: 8,
      borderRadius: tokens.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBtnText: {
      color: isDark ? '#000' : '#fff',
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    rejectBtn: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingVertical: 10,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ff4444',
      marginHorizontal: 4,
    },
    rejectBtnText: {
      color: '#ff4444',
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.xs,
    },
    timerBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 12,
      backgroundColor: 'rgba(50, 205, 50, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(50, 205, 50, 0.3)',
    },
    timerBadgeExpired: {
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      borderColor: 'rgba(255, 68, 68, 0.3)',
    },
    timerText: {
      fontSize: 10,
      color: '#2e8b57',
      fontFamily: tokens.typography.family.bold,
    },
    timerTextExpired: {
      color: '#ff4444',
    },
    secondaryActionBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    secondaryActionText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.semibold,
      color: colors.text,
    },
    callBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    callIcon: {
      fontSize: tokens.typography.size.xs,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    geoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    geoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: tokens.spacing.sm,
    },
    geoNumber: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.accent,
      width: 24,
    },
    geoCategory: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    geoLocation: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 1,
    },
    geoNavBtn: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.lg,
    },
    geoNavText: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.semibold,
      color: colors.accent,
    },
    completedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    completedLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: tokens.spacing.sm,
    },
    completedCheck: {
      fontSize: 14,
      color: colors.accent,
      fontFamily: tokens.typography.family.extrabold,
    },
    completedCategory: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.semibold,
      color: colors.text,
    },
    completedLocation: {
      fontSize: 10,
      color: colors.muted,
    },
    completedTag: {
      fontSize: 10,
      color: colors.accent,
      fontFamily: tokens.typography.family.bold,
    },
    emptyBox: {
      padding: tokens.spacing.xl,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 28,
      marginBottom: tokens.spacing.xs,
    },
    emptyTitle: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    emptySub: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      textAlign: 'center',
      marginTop: 2,
    },
  });
