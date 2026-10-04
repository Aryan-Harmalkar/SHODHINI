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
                        onPress={() => onUpdateStatus(item.id, 'Completed')}
                        disabled={isUpdating}
                        activeOpacity={0.8}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.doneBtnText}>✅ Mark Done</Text>
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
});
