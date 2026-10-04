import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getUserComplaints, getUserEcoPoints } from '../db/database';
import { supabase } from '../lib/supabase';

export default function MyComplaintsScreen({
  user,
  onBackToHome,
  onOpenSidebar,
  onGoToReport,
}) {
  const [complaints, setComplaints] = useState([]);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'COMPLETED'

  useEffect(() => {
    if (!user?.id) return;

    loadData();

    // Realtime subscription for citizen's complaints
    const channelName = `citizen_complaints_${user.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `citizen_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Realtime change received for citizen:', payload.eventType);
          // Reload latest data and updated eco points from server
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const items = await getUserComplaints(user.id);
      const points = await getUserEcoPoints(user.id);
      setComplaints(items || []);
      setEcoPoints(points || 0);
    } catch (e) {
      console.error('Error loading citizen complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'COMPLETED') return c.status === 'Completed' || c.status === 'Resolved';
    if (filter === 'PENDING') return c.status !== 'Completed' && c.status !== 'Resolved';
    return true;
  });

  const completedCount = complaints.filter(
    (c) => c.status === 'Completed' || c.status === 'Resolved'
  ).length;
  const inProgressCount = complaints.length - completedCount;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>My Complaints & Status</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Eco Points & Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.ecoRow}>
            <View>
              <Text style={styles.ecoLabel}>🌱 Total Eco Points Earned</Text>
              <Text style={styles.ecoPointsText}>{ecoPoints} pts</Text>
            </View>
            <View style={styles.ecoBadge}>
              <Text style={styles.ecoBadgeText}>
                {completedCount > 0 ? 'Active Contributor' : 'Getting Started'}
              </Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{complaints.length}</Text>
              <Text style={styles.statLabel}>Total Filed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#e65100' }]}>{inProgressCount}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: '#2e7d32' }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'ALL' && styles.activeFilterPill]}
            onPress={() => setFilter('ALL')}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === 'ALL' && styles.activeFilterPillText,
              ]}
            >
              All ({complaints.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'PENDING' && styles.activeFilterPill]}
            onPress={() => setFilter('PENDING')}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === 'PENDING' && styles.activeFilterPillText,
              ]}
            >
              Pending ({inProgressCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'COMPLETED' && styles.activeFilterPill]}
            onPress={() => setFilter('COMPLETED')}
          >
            <Text
              style={[
                styles.filterPillText,
                filter === 'COMPLETED' && styles.activeFilterPillText,
              ]}
            >
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Complaints List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2e7d32" />
            <Text style={styles.loadingText}>Loading complaints...</Text>
          </View>
        ) : filteredComplaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'ALL'
                ? 'No Complaints Filed Yet'
                : filter === 'COMPLETED'
                ? 'No Completed Complaints'
                : 'No Pending Complaints'}
            </Text>
            <Text style={styles.emptyDesc}>
              {filter === 'ALL'
                ? 'Report roadside waste or overflowing bins in your neighborhood to track progress and earn Eco Points!'
                : 'All caught up with this category.'}
            </Text>

            {filter === 'ALL' && (
              <TouchableOpacity style={styles.fileBtn} onPress={onGoToReport}>
                <Text style={styles.fileBtnText}>📝 File a Complaint</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredComplaints.map((item) => {
            const isDone = item.status === 'Completed' || item.status === 'Resolved';
            const isInProgress = item.status === 'In Progress' || item.status === 'Assigned';

            return (
              <View key={item.id} style={styles.complaintCard}>
                <View style={styles.complaintHeader}>
                  <Text style={styles.categoryTitle}>{item.category || 'General Waste'}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isDone
                        ? styles.statusDone
                        : isInProgress
                        ? styles.statusInProgress
                        : styles.statusSubmitted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isDone
                          ? styles.statusDoneText
                          : isInProgress
                          ? styles.statusInProgressText
                          : styles.statusSubmittedText,
                      ]}
                    >
                      {isDone ? '✓ Completed' : item.status || 'Submitted'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.complaintDesc}>{item.description}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>📍 Area:</Text>
                  <Text style={styles.metaValue}>{item.location}</Text>
                </View>

                {item.created_at && (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>🗓️ Date:</Text>
                    <Text style={styles.metaValue}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {/* Eco Points Awarded Badge */}
                <View style={styles.rewardRow}>
                  <Text style={styles.rewardLabel}>🌱 Eco Points:</Text>
                  <Text
                    style={[
                      styles.rewardValue,
                      isDone ? styles.pointsEarned : styles.pointsPending,
                    ]}
                  >
                    {isDone
                      ? `+${item.eco_points || 15} pts Earned 🎉`
                      : '15 pts credited when resolved'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  menuBtn: {
    padding: 6,
    marginRight: 10,
  },
  menuIcon: {
    fontSize: 22,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
  },
  backHomeBtn: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  backHomeText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  ecoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ecoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e7d32',
  },
  ecoPointsText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1b5e20',
    marginTop: 2,
  },
  ecoBadge: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  ecoBadgeText: {
    color: '#2e7d32',
    fontSize: 12,
    fontWeight: '700',
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 3,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterPill: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeFilterPillText: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  centerContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyCard: {
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
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  fileBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  fileBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  complaintCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusDone: {
    backgroundColor: '#e8f5e9',
  },
  statusDoneText: {
    color: '#2e7d32',
    fontWeight: '700',
    fontSize: 12,
  },
  statusInProgress: {
    backgroundColor: '#fff3e0',
  },
  statusInProgressText: {
    color: '#e65100',
    fontWeight: '700',
    fontSize: 12,
  },
  statusSubmitted: {
    backgroundColor: '#e3f2fd',
  },
  statusSubmittedText: {
    color: '#1565c0',
    fontWeight: '700',
    fontSize: 12,
  },
  complaintDesc: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#777',
    width: 60,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  rewardLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    marginRight: 6,
  },
  rewardValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  pointsEarned: {
    color: '#2e7d32',
  },
  pointsPending: {
    color: '#888',
    fontStyle: 'italic',
  },
});
