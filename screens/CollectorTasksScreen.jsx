import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const availableTasks = complaints.filter(
    (c) => !c.status || c.status === 'Submitted'
  );
  const pendingTasks = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Assigned'
  );
  const completedTasks = complaints.filter((c) => c.status === 'Completed');
  const activeGeoTasks = complaints.filter((c) => c.status !== 'Completed');

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
          <Text style={styles.screenTitle}>📋 Collector Tasks</Text>
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
        {/* Worker Overview Card */}
        <View style={styles.workerSummaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>Sanitation Operations</Text>
              <Text style={styles.summaryName}>👷 {user?.name || 'Sanitation Team'}</Text>
            </View>
            <View style={styles.dutyPill}>
              <View style={styles.dutyDot} />
              <Text style={styles.dutyPillText}>ON DUTY</Text>
            </View>
          </View>

          <View style={styles.assignedAreaRow}>
            <Text style={styles.assignedAreaLabel}>📍 Assigned Area:</Text>
            <Text style={styles.assignedAreaVal}>{user?.area || 'Ward 1'}</Text>
          </View>

          {/* Quick Stats Strip */}
          <View style={styles.statsStrip}>
            <TouchableOpacity
              style={[styles.statBox, activeTab === 'available' && styles.statBoxActive]}
              onPress={() => setActiveTab('available')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statVal, { color: '#0284c7' }]}>{availableTasks.length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={[styles.statBox, activeTab === 'pending' && styles.statBoxActive]}
              onPress={() => setActiveTab('pending')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statVal, { color: '#d97706' }]}>{pendingTasks.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={[styles.statBox, activeTab === 'location' && styles.statBoxActive]}
              onPress={() => setActiveTab('location')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statVal, { color: tokens.colors.accent }]}>
                {activeGeoTasks.length}
              </Text>
              <Text style={styles.statLabel}>Hotspots</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity
              style={[styles.statBox, activeTab === 'completed' && styles.statBoxActive]}
              onPress={() => setActiveTab('completed')}
              activeOpacity={0.7}
            >
              <Text style={[styles.statVal, { color: tokens.colors.accent }]}>
                {completedTasks.length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation Buttons */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'available' && styles.tabButtonActive]}
            onPress={() => setActiveTab('available')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'available' && styles.tabButtonTextActive]}>
              🔔 Available ({availableTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}>
              ⏳ Pending ({pendingTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'location' && styles.tabButtonActive]}
            onPress={() => setActiveTab('location')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'location' && styles.tabButtonTextActive]}>
              📍 Track Location
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}>
              ✅ Done ({completedTasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: TASKS AVAILABLE */}
        {activeTab === 'available' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>New Tasks Waiting for Pickup</Text>
                <Text style={styles.sectionSub}>Reports submitted by citizens in {user?.area || 'your ward'}.</Text>
              </View>
            </View>

            {availableTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySub}>No new unassigned waste reports in your area right now.</Text>
              </View>
            ) : (
              availableTasks.map((item) => {
                const isUpdating = updatingId === item.id;
                return (
                  <View key={item.id} style={styles.taskCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.badgeNew}>
                        <Text style={styles.badgeNewText}>NEW REPORT</Text>
                      </View>
                      <Text style={styles.cardDate}>
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </Text>
                    </View>

                    <Text style={styles.categoryTitle}>{item.category || 'General Waste'}</Text>
                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>📍 Location:</Text>
                      <Text style={styles.detailVal}>{item.location}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>👤 Citizen:</Text>
                      <Text style={styles.detailVal}>{item.citizenName || 'Local Citizen'}</Text>
                    </View>

                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => onUpdateStatus(item.id, 'In Progress')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={tokens.colors.background} />
                        ) : (
                          <Text style={styles.primaryActionText}>🚀 Accept & Start Work</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.secondaryActionText}>📍 Navigate Map</Text>
                      </TouchableOpacity>

                      {item.citizenPhone && (
                        <TouchableOpacity
                          style={styles.callIconBtn}
                          onPress={() => handleCallCitizen(item.citizenPhone)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.callIconText}>📞</Text>
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
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>In-Progress & Assigned Tasks</Text>
                <Text style={styles.sectionSub}>Active waste clearing jobs currently being handled.</Text>
              </View>
            </View>

            {pendingTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⏳</Text>
                <Text style={styles.emptyTitle}>No Pending Tasks</Text>
                <Text style={styles.emptySub}>You have no tasks currently in progress. Accept tasks from the Available tab.</Text>
              </View>
            ) : (
              pendingTasks.map((item) => {
                const isUpdating = updatingId === item.id;
                return (
                  <View key={item.id} style={[styles.taskCard, styles.pendingBorder]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.badgePending}>
                        <Text style={styles.badgePendingText}>⚡ IN PROGRESS</Text>
                      </View>
                      <Text style={styles.cardDate}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Active'}
                      </Text>
                    </View>

                    <Text style={styles.categoryTitle}>{item.category || 'Waste Clearing'}</Text>
                    <Text style={styles.descriptionText}>{item.description}</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>📍 Location:</Text>
                      <Text style={styles.detailVal}>{item.location}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>👤 Citizen:</Text>
                      <Text style={styles.detailVal}>
                        {item.citizenName} {item.citizenPhone ? `(${item.citizenPhone})` : ''}
                      </Text>
                    </View>

                    <View style={styles.actionButtonRow}>
                      <TouchableOpacity
                        style={[styles.doneActionBtn, isUpdating && styles.btnDisabled]}
                        onPress={() => onUpdateStatus(item.id, 'Completed')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color={tokens.colors.background} />
                        ) : (
                          <Text style={styles.doneActionText}>✅ Mark Cleaned & Done</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.secondaryActionText}>🗺️ Map Route</Text>
                      </TouchableOpacity>

                      {item.citizenPhone && (
                        <TouchableOpacity
                          style={styles.callIconBtn}
                          onPress={() => handleCallCitizen(item.citizenPhone)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.callIconText}>📞</Text>
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
          <View style={styles.tabContent}>
            {/* Visual Radar Card */}
            <View style={styles.mapRadarCard}>
              <View style={styles.radarHeader}>
                <View>
                  <Text style={styles.radarTitle}>📍 Hotspot Location & GPS Navigator</Text>
                  <Text style={styles.radarSub}>Turn-by-turn routing to active waste coordinates</Text>
                </View>
                <View style={styles.gpsPill}>
                  <Text style={styles.gpsPillText}>GPS LIVE</Text>
                </View>
              </View>

              <View style={styles.radarVisualBox}>
                <Text style={styles.radarGraphic}>🧭 🚚 ---------------- 📍 🗑️</Text>
                <Text style={styles.radarCoordsText}>
                  Assigned Ward: {user?.area || 'Ward 1'} • {activeGeoTasks.length} Active Hotspots
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: tokens.spacing.md, marginBottom: tokens.spacing.xs }]}>
              Hotspots to Clear ({activeGeoTasks.length})
            </Text>

            {activeGeoTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>No Hotspots Pending</Text>
                <Text style={styles.emptySub}>All reported waste locations in your area are cleared!</Text>
              </View>
            ) : (
              activeGeoTasks.map((item, idx) => {
                const isUpdating = updatingId === item.id;
                const hasCoords = item.latitude && item.longitude;
                return (
                  <View key={item.id} style={styles.locationTaskCard}>
                    <View style={styles.locCardTop}>
                      <View style={styles.locNumBadge}>
                        <Text style={styles.locNumText}>#{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: tokens.spacing.sm }}>
                        <Text style={styles.categoryTitle}>{item.category}</Text>
                        <Text style={styles.locationSubText}>📍 {item.location}</Text>
                      </View>
                      <View style={[styles.statusMiniBadge, item.status === 'In Progress' ? styles.miniPending : styles.miniSubmitted]}>
                        <Text style={styles.statusMiniText}>{item.status || 'Waiting'}</Text>
                      </View>
                    </View>

                    {hasCoords ? (
                      <View style={styles.coordsBox}>
                        <Text style={styles.coordsLabel}>GPS Coordinates:</Text>
                        <Text style={styles.coordsVal}>
                          Lat: {item.latitude.toFixed(5)}, Lng: {item.longitude.toFixed(5)}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.coordsBox}>
                        <Text style={styles.coordsLabel}>Address Area:</Text>
                        <Text style={styles.coordsVal}>{item.location}</Text>
                      </View>
                    )}

                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View style={styles.locActionRow}>
                      <TouchableOpacity
                        style={styles.googleMapsBtn}
                        onPress={() => handleOpenMaps(item.latitude, item.longitude, item.location)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.googleMapsBtnText}>🗺️ Open in Google Maps (Directions) →</Text>
                      </TouchableOpacity>

                      <View style={styles.locSecondaryRow}>
                        {item.status !== 'In Progress' ? (
                          <TouchableOpacity
                            style={[styles.smallAcceptBtn, isUpdating && styles.btnDisabled]}
                            onPress={() => onUpdateStatus(item.id, 'In Progress')}
                            disabled={isUpdating}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.smallAcceptText}>🚀 Start Work</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.smallDoneBtn, isUpdating && styles.btnDisabled]}
                            onPress={() => onUpdateStatus(item.id, 'Completed')}
                            disabled={isUpdating}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.smallDoneText}>✅ Mark Done</Text>
                          </TouchableOpacity>
                        )}

                        {item.citizenPhone && (
                          <TouchableOpacity
                            style={styles.smallCallBtn}
                            onPress={() => handleCallCitizen(item.citizenPhone)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.smallCallText}>📞 Call Reporter</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 4: COMPLETED TASKS */}
        {activeTab === 'completed' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Completed Clearing History</Text>
                <Text style={styles.sectionSub}>All waste hotspots cleared and verified.</Text>
              </View>
            </View>

            {completedTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🧹</Text>
                <Text style={styles.emptyTitle}>No Completed Tasks Yet</Text>
                <Text style={styles.emptySub}>Complete your first waste collection job to see your history here.</Text>
              </View>
            ) : (
              completedTasks.map((item) => (
                <View key={item.id} style={styles.completedCard}>
                  <View style={styles.completedTopRow}>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ RESOLVED</Text>
                    </View>
                    <Text style={styles.cardDate}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}
                    </Text>
                  </View>

                  <Text style={styles.categoryTitle}>{item.category}</Text>
                  <Text style={styles.descriptionText}>{item.description}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>📍 Location:</Text>
                    <Text style={styles.detailVal}>{item.location}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>👤 Citizen:</Text>
                    <Text style={styles.detailVal}>{item.citizenName || 'Citizen'}</Text>
                  </View>
                </View>
              ))
            )}
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
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    marginRight: tokens.spacing.sm,
    padding: tokens.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: tokens.typography.size.lg,
    color: tokens.colors.text,
  },
  screenTitle: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  refreshIconBtn: {
    padding: tokens.spacing.xs,
    minWidth: 38,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  refreshIconText: {
    fontSize: 16,
  },
  backHomeBtn: {
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backHomeText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  workerSummaryCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: tokens.typography.weight.semibold,
  },
  summaryName: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginTop: 2,
  },
  dutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent + '20',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent,
    marginRight: 6,
  },
  dutyPillText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  assignedAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
  },
  assignedAreaLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginRight: tokens.spacing.xs,
  },
  assignedAreaVal: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    marginTop: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
  },
  statBoxActive: {
    backgroundColor: tokens.colors.background,
  },
  statVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
  },
  statLabel: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 2,
    fontWeight: tokens.typography.weight.medium,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.colors.border,
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
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  tabButtonActive: {
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  tabContent: {
    marginTop: tokens.spacing.xs,
  },
  sectionHeaderRow: {
    marginBottom: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  sectionSub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: tokens.spacing.sm,
  },
  emptyTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  emptySub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  taskCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  pendingBorder: {
    borderColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  badgeNew: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#0284c7',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#d97706',
  },
  cardDate: {
    fontSize: 11,
    color: tokens.colors.muted,
  },
  categoryTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailKey: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    width: 80,
    fontWeight: tokens.typography.weight.medium,
  },
  detailVal: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.semibold,
    flex: 1,
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.surface,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  primaryActionText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  doneActionBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  doneActionText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  secondaryActionBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  secondaryActionText: {
    color: tokens.colors.text,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
  },
  callIconBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIconText: {
    fontSize: 18,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Map Radar Card
  mapRadarCard: {
    backgroundColor: '#0f172a',
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.md,
  },
  radarTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: '#ffffff',
  },
  radarSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  gpsPill: {
    backgroundColor: '#10b981',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  gpsPillText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#ffffff',
  },
  radarVisualBox: {
    backgroundColor: '#1e293b',
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarGraphic: {
    fontSize: 20,
    color: '#38bdf8',
    letterSpacing: 2,
    marginBottom: tokens.spacing.xs,
  },
  radarCoordsText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: tokens.typography.weight.medium,
  },
  locationTaskCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  locCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  locNumBadge: {
    backgroundColor: tokens.colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locNumText: {
    color: tokens.colors.background,
    fontSize: 11,
    fontWeight: tokens.typography.weight.extrabold,
  },
  locationSubText: {
    fontSize: 11,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  statusMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  miniSubmitted: {
    backgroundColor: '#e0f2fe',
  },
  miniPending: {
    backgroundColor: '#fef3c7',
  },
  statusMiniText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  coordsBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    marginVertical: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordsLabel: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginRight: 6,
  },
  coordsVal: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  locActionRow: {
    marginTop: tokens.spacing.sm,
  },
  googleMapsBtn: {
    backgroundColor: '#2563eb',
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    marginBottom: tokens.spacing.xs,
  },
  googleMapsBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  locSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  smallAcceptBtn: {
    flex: 1,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  smallAcceptText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  smallDoneBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  smallDoneText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  smallCallBtn: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  smallCallText: {
    color: tokens.colors.text,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
  },
  completedCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: tokens.colors.accent,
    ...tokens.shadow.sm,
  },
  completedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  completedBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
});
