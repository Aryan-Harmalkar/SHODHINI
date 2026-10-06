import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';
import CleanupVerifyModal from '../components/CleanupVerifyModal';

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

export default function CollectorTasksScreen({
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
  onRejectTask,
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

  const availableTasks = complaints.filter(
    (c) => (!c.status || c.status === 'Submitted') && c.assigned_worker_id !== user?.id
  );
  const pendingTasks = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Assigned' || (c.status === 'Pending GC' && c.assigned_worker_id === user?.id)
  );
  const completedTasks = complaints.filter((c) => c.status === 'Completed');
  const activeGeoTasks = complaints.filter((c) => c.status !== 'Completed');

  const priorityTasks = complaints.filter(
    (c) => c.status === 'Pending GC' && c.assigned_worker_id === user?.id
  );

  const [now, setNow] = useState(Date.now());
  const autoRejectedRef = useRef(new Set());
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    if (priorityTasks.length > 0) {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [priorityTasks.length]);

  useEffect(() => {
    // Check timeouts
    priorityTasks.forEach((pt) => {
      if (pt.assigned_at && !autoRejectedRef.current.has(pt.id)) {
        const diffMs = Date.now() - new Date(pt.assigned_at).getTime();
        const remaining = 180 - Math.floor(diffMs / 1000);
        if (remaining <= 0) {
          autoRejectedRef.current.add(pt.id);
          if (onRejectTask) onRejectTask(pt.id, 'Timeout', pt.gc_queue || []);
        }
      }
    });
  }, [now, priorityTasks]);

  const handleVerifyClick = (complaint) => {
    setVerifyingComplaint(complaint);
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
          <Text style={styles.screenTitle}>📋 Tasks</Text>
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

      {/* PRIORITY ALERTS */}
      {priorityTasks.length > 0 && isDutyOnline && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {priorityTasks.map((pt) => {
            const diffMs = Date.now() - new Date(pt.assigned_at).getTime();
            const remaining = Math.max(0, 180 - Math.floor(diffMs / 1000));
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

            return (
              <View key={pt.id} style={{ backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#ef4444' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#991b1b', flex: 1 }}>
                    🚨 Incoming Priority Request
                  </Text>
                  <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{timeStr}</Text>
                  </View>
                </View>
                <Text style={{ color: '#7f1d1d', marginTop: 8, fontSize: 14 }}>
                  {pt.description}
                </Text>
                <Text style={{ color: '#7f1d1d', marginTop: 4, fontSize: 14, fontWeight: 'bold' }}>
                  📍 {pt.location}
                </Text>
                
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => onUpdateStatus(pt.id, 'In Progress')}
                    disabled={updatingId === pt.id}
                  >
                    {updatingId === pt.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✅ Accept</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef4444', padding: 14, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      Alert.alert(
                        'Reject Request',
                        'Are you sure you want to reject this request? It will be sent to the next available collector.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Reject', 
                            style: 'destructive',
                            onPress: () => {
                              if (onRejectTask) onRejectTask(pt.id, 'Rejected by GC', pt.gc_queue || []);
                            }
                          }
                        ]
                      );
                    }}
                    disabled={updatingId === pt.id}
                  >
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sleek Worker Header */}
        <View style={styles.workerHeader}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.workerName}>👷 {user?.name || 'Sanitation Team'}</Text>
              {user?.gc_class && (
                <View style={{ marginLeft: 8, backgroundColor: user.gc_class.includes('A') ? '#10b981' : '#fbbf24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: user.gc_class.includes('A') ? '#064e3b' : '#78350f', textTransform: 'uppercase' }}>
                    {user.gc_class}
                  </Text>
                </View>
              )}
            </View>

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
                      <Text style={styles.categoryTitle}>{item.category || 'General Waste'}</Text>
                      <Text style={styles.cardTime}>
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New'}
                      </Text>
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
                          <Text style={styles.primaryActionText}>Accept Job</Text>
                        )}
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
                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>IN PROGRESS</Text>
                      </View>
                    </View>

                    {item.accepted_at && (Date.now() - new Date(item.accepted_at).getTime()) > 3600000 && (
                      <View style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#ef4444' }}>
                        <Text style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: 13 }}>
                          ⚠️ SLA Warning: You accepted this over 1 hour ago. Please arrive immediately.
                        </Text>
                      </View>
                    )}

                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <Text style={styles.locationText}>📍 {item.location}</Text>
                    {item.citizenName && (
                      <Text style={styles.citizenText}>👤 {item.citizenName}</Text>
                    )}

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.doneBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => handleVerifyClick(item)}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                        ) : (
                          <Text style={styles.doneBtnText}>📸 Verify Cleanup</Text>
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
                <Text style={styles.emptySub}>No active hotspots to route to right now.</Text>
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
                  
                  {item.accepted_at && (Date.now() - new Date(item.accepted_at).getTime()) > 3600000 && (
                    <Text style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: 12, marginTop: 4, marginLeft: 36 }}>
                      ⚠️ SLA Missed! (Over 1 hr)
                    </Text>
                  )}
                  
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
        <CleanupVerifyModal
          visible={Boolean(verifyingComplaint)}
          complaint={verifyingComplaint}
          onClose={() => setVerifyingComplaint(null)}
          onConfirmDone={async ({ complaintId, afterImageBase64, resolvedAt, latitude, longitude }) => {
            await onUpdateStatus(
              complaintId,
              'Completed',
              afterImageBase64,
              resolvedAt,
              latitude,
              longitude
            );
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
      padding: tokens.spacing.md,
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
      padding: tokens.spacing.md,
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
