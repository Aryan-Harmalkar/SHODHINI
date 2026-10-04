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
import { tokens } from '../lib/theme';

export default function MyComplaintsScreen({
  user,
  onBackToHome,
  onOpenSidebar,
  onGoToReport,
}) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ecoPoints, setEcoPoints] = useState(0);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        const [pts, list] = await Promise.all([
          getUserEcoPoints(user.id),
          getUserComplaints(user.id),
        ]);
        setEcoPoints(pts || 0);
        setComplaints(list || []);
      } catch (err) {
        console.warn('Error loading my complaints:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const filtered = complaints.filter((c) => {
    if (filter === 'PENDING') return c.status !== 'Completed';
    if (filter === 'RESOLVED') return c.status === 'Completed';
    return true;
  });

  const totalPoints = ecoPoints;
  const completedCount = complaints.filter((c) => c.status === 'Completed').length;
  const pendingCount = complaints.length - completedCount;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>My Reports</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.ecoRow}>
            <View>
              <Text style={styles.ecoLabel}>Total Eco Points</Text>
              <Text style={styles.ecoPointsText}>{totalPoints}</Text>
            </View>
            <View style={styles.ecoBadge}>
              <Text style={styles.ecoBadgeText}>
                {totalPoints > 0 ? 'Eco Champion' : 'Level 1'}
              </Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{complaints.length}</Text>
              <Text style={styles.statLabel}>Filed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{completedCount}</Text>
              <Text style={styles.statLabel}>Resolved</Text>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'ALL' && styles.activeFilterPill]}
            onPress={() => setFilter('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'ALL' && styles.activeFilterPillText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'PENDING' && styles.activeFilterPill]}
            onPress={() => setFilter('PENDING')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'PENDING' && styles.activeFilterPillText]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'RESOLVED' && styles.activeFilterPill]}
            onPress={() => setFilter('RESOLVED')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === 'RESOLVED' && styles.activeFilterPillText]}>
              Resolved
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tokens.colors.accent} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Complaints Found</Text>
            <Text style={styles.emptyDesc}>
              {filter === 'ALL'
                ? "You haven't reported any waste issues yet."
                : `You don't have any ${filter.toLowerCase()} reports right now.`}
            </Text>
            {filter === 'ALL' && (
              <TouchableOpacity style={styles.fileBtn} onPress={onGoToReport} activeOpacity={0.7}>
                <Text style={styles.fileBtnText}>File a Complaint</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((item) => {
            const isDone = item.status === 'Completed';
            const isInProgress = item.status === 'In Progress';
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

                <View style={styles.rewardRow}>
                  <Text style={styles.rewardLabel}>🌱 Eco Points:</Text>
                  <Text style={[styles.rewardValue, isDone ? styles.pointsEarned : styles.pointsPending]}>
                    {isDone ? `+${item.eco_points || 15} pts Earned 🎉` : '15 pts credited when resolved'}
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
  menuBtn: {
    padding: tokens.spacing.xs,
    marginRight: tokens.spacing.sm,
    minHeight: 44,
    minWidth: 44,
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
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  backHomeBtn: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backHomeText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  summaryCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.sm,
  },
  ecoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ecoLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.accent,
  },
  ecoPointsText: {
    fontSize: tokens.typography.size.xxl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.text,
    marginTop: 2,
  },
  ecoBadge: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.accent + '30',
  },
  ecoBadgeText: {
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  statsDivider: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: tokens.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  statLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: 4,
  },
  filterPill: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeFilterPill: {
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  filterPillText: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
  },
  activeFilterPillText: {
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.bold,
  },
  centerContainer: {
    padding: tokens.spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.muted,
    fontSize: tokens.typography.size.sm,
  },
  emptyCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    ...tokens.shadow.sm,
  },
  emptyIcon: {
    fontSize: tokens.typography.size.xxl,
    marginBottom: tokens.spacing.sm,
  },
  emptyTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  emptyDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: tokens.spacing.lg,
  },
  fileBtn: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  fileBtnText: {
    color: tokens.colors.background,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.sm,
  },
  complaintCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    ...tokens.shadow.sm,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  categoryTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  statusPill: {
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  statusDone: {
    backgroundColor: tokens.colors.accent + '20',
  },
  statusDoneText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.xs,
  },
  statusInProgress: {
    backgroundColor: '#fff3e0',
  },
  statusInProgressText: {
    color: '#e65100',
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.xs,
  },
  statusSubmitted: {
    backgroundColor: '#e3f2fd',
  },
  statusSubmittedText: {
    color: '#1565c0',
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.xs,
  },
  complaintDesc: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    width: 60,
    fontWeight: tokens.typography.weight.medium,
  },
  metaValue: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.semibold,
    flex: 1,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  rewardLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
    marginRight: tokens.spacing.xs,
  },
  rewardValue: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  pointsEarned: {
    color: tokens.colors.accent,
  },
  pointsPending: {
    color: tokens.colors.muted,
    fontStyle: 'italic',
  },
});
