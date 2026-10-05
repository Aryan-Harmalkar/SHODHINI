import React, { useState } from 'react';
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
import { tokens } from '../lib/theme';
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
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'available');

  // Verification State
  const [verifyingComplaint, setVerifyingComplaint] = useState(null);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) setActiveTab(initialTab);
  }

  const availableTasks = complaints.filter(
    (c) => !c.status || c.status === 'Submitted'
  );
  const pendingTasks = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Assigned'
  );
  const completedTasks = complaints.filter((c) => c.status === 'Completed');
  const activeGeoTasks = complaints.filter((c) => c.status !== 'Completed');

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
      const query = encodeURIComponent(`${address || 'Ward 1'}, City`);
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
            <Text style={styles.workerArea}>📍 {user?.area || 'Ward 1'}</Text>
          </View>
          <View style={styles.dutyPill}>
            <View style={styles.dutyDot} />
            <Text style={styles.dutyText}>ON DUTY</Text>
          </View>
        </View>

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
                          <ActivityIndicator size="small" color="#ffffff" />
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
                          <ActivityIndicator size="small" color="#ffffff" />
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
                <Text style={styles.emptySub}>No active hotspots to route to in your ward.</Text>
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

const styles = StyleSheet.create({
  reportPanel: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  reportPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 6,
  },
  reportRow: {
    fontSize: 12,
    color: '#334155',
    marginTop: 3,
  },
  reportNavBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reportNavText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gpsBox: {
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gpsBoxOk: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  gpsBoxBad: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  gpsSub: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },
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
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
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
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  workerName: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  workerArea: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  dutyPill: {
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
  dutyText: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: 3,
    marginBottom: tokens.spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
  },
  tabButtonTextActive: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  taskList: {
    gap: tokens.spacing.sm,
  },
  taskCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  categoryTitle: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  cardTime: {
    fontSize: 10,
    color: tokens.colors.muted,
  },
  pendingPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  pendingPillText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#d97706',
  },
  descriptionText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  locationText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginBottom: 2,
  },
  citizenText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
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
    backgroundColor: tokens.colors.accent,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: tokens.colors.accent,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  secondaryActionBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  secondaryActionText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
  },
  callBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 8,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
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
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  geoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.sm,
  },
  geoNumber: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    width: 24,
  },
  geoCategory: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  geoLocation: {
    fontSize: 11,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  geoNavBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  geoNavText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.accent,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  completedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.sm,
  },
  completedCheck: {
    fontSize: 14,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.extrabold,
  },
  completedCategory: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
  },
  completedLocation: {
    fontSize: 10,
    color: tokens.colors.muted,
  },
  completedTag: {
    fontSize: 10,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
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
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  emptySub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  modalCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: 20,
    width: '100%',
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  modalTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.muted,
    fontWeight: 'bold',
  },
  modalScroll: {
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  compareCol: {
    flex: 1,
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  compareImage: {
    width: '100%',
    height: 120,
    borderRadius: tokens.radius.md,
    backgroundColor: '#f1f5f9',
  },
  captureBtn: {
    width: '100%',
    height: 120,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnText: {
    fontSize: 12,
    color: tokens.colors.muted,
    fontWeight: 'bold',
  },
  verifyingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: tokens.radius.md,
  },
  verifyingText: {
    marginLeft: 8,
    color: '#0284c7',
    fontWeight: 'bold',
  },
  successBox: {
    padding: 12,
    backgroundColor: '#dcfce7',
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  successBoxText: {
    color: '#166534',
    fontWeight: 'bold',
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  errorBoxText: {
    color: '#991b1b',
    fontWeight: 'bold',
  },
  errorReasonText: {
    color: '#991b1b',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#b91c1c',
    borderRadius: tokens.radius.sm,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  confirmDoneBtn: {
    marginTop: 16,
    backgroundColor: tokens.colors.accent,
    padding: 14,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  confirmDoneBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: tokens.typography.size.sm,
  },
});
