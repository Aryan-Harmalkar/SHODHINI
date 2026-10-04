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
import {
  getUserEcoPoints,
  getAreaComplaints,
  updateComplaintStatus,
} from '../db/database';
import { supabase } from '../lib/supabase';

export default function HomeScreen({ user, onLogout }) {
  // 'home' | 'complaint' | 'my_complaints' | 'waste_pickup' | 'recycle'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ecoPoints, setEcoPoints] = useState(0);

  // Collector Live Feed State
  const [collectorComplaints, setCollectorComplaints] = useState([]);
  const [collectorLoading, setCollectorLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [collectorFilter, setCollectorFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'COMPLETED'

  const isCollector = user?.role === 'worker';

  useEffect(() => {
    if (user?.id && !isCollector) {
      loadEcoPoints();
    }
  }, [user, currentScreen, isCollector]);

  // Collector: Load complaints & Subscribe to Realtime INSERT & UPDATE
  useEffect(() => {
    if (!isCollector || !user?.area_id) return;

    loadCollectorData();

    // Realtime channel for collector's area
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
          // Reload to get populated citizen profile & location details
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

      // Update state locally immediately
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

  // Screen Switcher for Citizen/User
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

  // Filtered collector complaints
  const filteredCollectorComplaints = collectorComplaints.filter((c) => {
    if (collectorFilter === 'ACTIVE') return c.status !== 'Completed';
    if (collectorFilter === 'COMPLETED') return c.status === 'Completed';
    return true;
  });

  const activeCount = collectorComplaints.filter((c) => c.status !== 'Completed').length;
  const completedCount = collectorComplaints.filter((c) => c.status === 'Completed').length;

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {!isCollector && (
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => setSidebarVisible(true)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.appName}>SHODHINI</Text>
        </View>

        {/* Collector logout retained for worker role */}
        {isCollector && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.roleBadge,
                isCollector ? styles.collectorBadge : styles.citizenBadge,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isCollector && { color: '#e65100' },
                ]}
              >
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
            <Text style={styles.infoLabel}>Username/Email:</Text>
            <Text style={styles.infoValue}>{user?.identifier || user?.email || 'N/A'}</Text>
          </View>

          {user?.area ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {isCollector ? 'Assigned Area:' : 'Home Area:'}
              </Text>
              <Text style={styles.infoValue}>📍 {user.area}</Text>
            </View>
          ) : null}
        </View>

        {/* ================= CITIZEN-ONLY SECTIONS ================= */}
        {!isCollector && (
          <>
            {/* Eco Points Section */}
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

            {/* Sidebar Navigation Prompt Banner */}
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
                >
                  <Text style={styles.openSidebarBtnText}>Open Sidebar ☰</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.trackComplaintsQuickBtn}
                  onPress={() => setCurrentScreen('my_complaints')}
                >
                  <Text style={styles.trackComplaintsQuickText}>Track Status 📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action: File / Report */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeader}>Quick Actions</Text>
              <Text style={styles.sectionDesc}>
                Spot illegal waste dumping or overflowing municipal dustbins? Submit a quick report.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCurrentScreen('complaint')}
              >
                <Text style={styles.actionButtonText}>📝 Report Waste / File Complaint</Text>
              </TouchableOpacity>
            </View>

            {/* Citizen Services Highlights */}
            <View style={styles.servicesGrid}>
              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('waste_pickup')}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>🚚</Text>
                  <View style={styles.paidMiniBadge}>
                    <Text style={styles.paidMiniBadgeText}>PAID</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Waste Pickup</Text>
                <Text style={styles.serviceTileDesc}>
                  No bins nearby? Book convenient doorstep collection.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('recycle')}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>♻️</Text>
                  <View style={styles.ecoMiniBadge}>
                    <Text style={styles.ecoMiniBadgeText}>+PTS</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Recycle Scrap</Text>
                <Text style={styles.serviceTileDesc}>
                  Dispose of e-waste, metal, paper and earn bonus Eco Points.
                </Text>
              </TouchableOpacity>
            </View>

            {/* About SHODHINI */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutHeader}>About SHODHINI</Text>
              <Text style={styles.aboutIntro}>
                SHODHINI connects citizens with municipal workers for clean, responsive waste management.
              </Text>
            </View>
          </>
        )}

        {/* ================= GARBAGE COLLECTOR LIVE FEED ================= */}
        {isCollector && (
          <View style={styles.collectorFeedContainer}>
            <View style={styles.feedHeaderRow}>
              <View>
                <Text style={styles.sectionHeader}>Complaints in Your Area</Text>
                <Text style={styles.feedSubtext}>
                  Live updates for {user?.area || `Ward ${user?.area_id || ''}`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={loadCollectorData}
              >
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills for Collector */}
            <View style={styles.collectorFilterRow}>
              <TouchableOpacity
                style={[
                  styles.collectorPill,
                  collectorFilter === 'ALL' && styles.collectorPillActive,
                ]}
                onPress={() => setCollectorFilter('ALL')}
              >
                <Text
                  style={[
                    styles.collectorPillText,
                    collectorFilter === 'ALL' && styles.collectorPillTextActive,
                  ]}
                >
                  All ({collectorComplaints.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.collectorPill,
                  collectorFilter === 'ACTIVE' && styles.collectorPillActive,
                ]}
                onPress={() => setCollectorFilter('ACTIVE')}
              >
                <Text
                  style={[
                    styles.collectorPillText,
                    collectorFilter === 'ACTIVE' && styles.collectorPillTextActive,
                  ]}
                >
                  Active ({activeCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.collectorPill,
                  collectorFilter === 'COMPLETED' && styles.collectorPillActive,
                ]}
                onPress={() => setCollectorFilter('COMPLETED')}
              >
                <Text
                  style={[
                    styles.collectorPillText,
                    collectorFilter === 'COMPLETED' && styles.collectorPillTextActive,
                  ]}
                >
                  Completed ({completedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Complaints List */}
            {collectorLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#2e7d32" />
                <Text style={styles.loadingBoxText}>Loading area complaints feed...</Text>
              </View>
            ) : filteredCollectorComplaints.length === 0 ? (
              <View style={styles.emptyCollectorBox}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyCollectorTitle}>No Complaints Pending!</Text>
                <Text style={styles.emptyCollectorDesc}>
                  Your assigned area ({user?.area || 'Ward'}) has no complaints matching this filter.
                  New reports from citizens will appear here live.
                </Text>
              </View>
            ) : (
              filteredCollectorComplaints.map((item) => {
                const isCompleted = item.status === 'Completed';
                const isInProgress = item.status === 'In Progress';
                const isAssigned = item.status === 'Assigned';
                const isUpdating = updatingId === item.id;

                return (
                  <View key={item.id} style={styles.collectorCard}>
                    <View style={styles.collectorCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardCategory}>{item.category || 'General Waste'}</Text>
                        <Text style={styles.cardDate}>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString()
                            : 'Just now'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isCompleted
                            ? styles.statusBadgeCompleted
                            : isInProgress
                            ? styles.statusBadgeProgress
                            : styles.statusBadgeSubmitted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isCompleted
                              ? styles.statusTextCompleted
                              : isInProgress
                              ? styles.statusTextProgress
                              : styles.statusTextSubmitted,
                          ]}
                        >
                          {item.status || 'Submitted'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardDescription}>{item.description}</Text>

                    <View style={styles.cardMetaRow}>
                      <Text style={styles.metaKey}>📍 Location:</Text>
                      <Text style={styles.metaVal}>{item.location}</Text>
                    </View>

                    <View style={styles.cardMetaRow}>
                      <Text style={styles.metaKey}>👤 Citizen:</Text>
                      <Text style={styles.metaVal}>
                        {item.citizenName} {item.citizenPhone ? `(${item.citizenPhone})` : ''}
                      </Text>
                    </View>

                    {/* Status Action Buttons */}
                    <View style={styles.actionButtonsDivider} />
                    <Text style={styles.actionSectionLabel}>Update Status:</Text>

                    <View style={styles.actionButtonGroup}>
                      {/* 1. Assign to me */}
                      <TouchableOpacity
                        style={[
                          styles.actionPill,
                          isAssigned && styles.actionPillActive,
                        ]}
                        disabled={isUpdating || isAssigned || isCompleted}
                        onPress={() => handleStatusUpdate(item.id, 'Assigned')}
                      >
                        <Text
                          style={[
                            styles.actionPillLabel,
                            isAssigned && styles.actionPillLabelActive,
                          ]}
                        >
                          📌 Assigned
                        </Text>
                      </TouchableOpacity>

                      {/* 2. In Progress */}
                      <TouchableOpacity
                        style={[
                          styles.actionPill,
                          isInProgress && styles.actionPillActive,
                        ]}
                        disabled={isUpdating || isInProgress || isCompleted}
                        onPress={() => handleStatusUpdate(item.id, 'In Progress')}
                      >
                        <Text
                          style={[
                            styles.actionPillLabel,
                            isInProgress && styles.actionPillLabelActive,
                          ]}
                        >
                          ⏳ In Progress
                        </Text>
                      </TouchableOpacity>

                      {/* 3. Completed */}
                      <TouchableOpacity
                        style={[
                          styles.actionPill,
                          styles.actionPillCompleted,
                          isCompleted && styles.actionPillCompletedActive,
                        ]}
                        disabled={isUpdating || isCompleted}
                        onPress={() => handleStatusUpdate(item.id, 'Completed')}
                      >
                        <Text
                          style={[
                            styles.actionPillLabel,
                            isCompleted && styles.actionPillLabelActive,
                          ]}
                        >
                          {isCompleted ? '✓ Completed' : '✅ Mark Done'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isUpdating && (
                      <View style={styles.updatingOverlay}>
                        <ActivityIndicator size="small" color="#2e7d32" />
                        <Text style={styles.updatingText}>Updating...</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Slide-out Sidebar Drawer */}
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
    backgroundColor: '#f4f6f8',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2e7d32',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  logoutBtnText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  citizenBadge: {
    backgroundColor: '#e8f5e9',
  },
  collectorBadge: {
    backgroundColor: '#fff3e0',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e7d32',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e7d32',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2e7d32',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    width: 125,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#222',
    fontWeight: '600',
    flex: 1,
  },
  ecoPointsCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  ecoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ecoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  ecoPointsNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1b5e20',
    marginTop: 2,
  },
  ecoBadge: {
    backgroundColor: '#2e7d32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  ecoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  ecoSubtitle: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  sidebarPromptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  promptIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  promptText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  promptButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  openSidebarBtn: {
    flex: 1,
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  openSidebarBtnText: {
    color: '#2e7d32',
    fontWeight: '700',
    fontSize: 13,
  },
  trackComplaintsQuickBtn: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackComplaintsQuickText: {
    color: '#1b5e20',
    fontWeight: '700',
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  serviceTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTileIcon: {
    fontSize: 24,
  },
  paidMiniBadge: {
    backgroundColor: '#ffecb3',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  paidMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f57f17',
  },
  ecoMiniBadge: {
    backgroundColor: '#c8e6c9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  ecoMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1b5e20',
  },
  serviceTileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  serviceTileDesc: {
    fontSize: 11,
    color: '#666',
    lineHeight: 15,
  },
  aboutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 8,
  },
  aboutIntro: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  // Collector Live Feed Styles
  collectorFeedContainer: {
    marginTop: 4,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedSubtext: {
    fontSize: 13,
    color: '#666',
  },
  refreshBtn: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '700',
  },
  collectorFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  collectorPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  collectorPillActive: {
    backgroundColor: '#2e7d32',
  },
  collectorPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  collectorPillTextActive: {
    color: '#ffffff',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingBoxText: {
    marginTop: 10,
    fontSize: 13,
    color: '#666',
  },
  emptyCollectorBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyCollectorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 6,
  },
  emptyCollectorDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  collectorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  collectorCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  cardDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeSubmitted: {
    backgroundColor: '#e3f2fd',
  },
  statusBadgeProgress: {
    backgroundColor: '#fff3e0',
  },
  statusBadgeCompleted: {
    backgroundColor: '#e8f5e9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextSubmitted: {
    color: '#1565c0',
  },
  statusTextProgress: {
    color: '#e65100',
  },
  statusTextCompleted: {
    color: '#2e7d32',
  },
  cardDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
    lineHeight: 19,
  },
  cardMetaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaKey: {
    fontSize: 12,
    color: '#777',
    width: 65,
    fontWeight: '500',
  },
  metaVal: {
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
    flex: 1,
  },
  actionButtonsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  actionSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  actionPillActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  actionPillCompleted: {
    backgroundColor: '#f1f8e9',
    borderColor: '#c8e6c9',
  },
  actionPillCompletedActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  actionPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  actionPillLabelActive: {
    color: '#ffffff',
  },
  updatingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  updatingText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
});
