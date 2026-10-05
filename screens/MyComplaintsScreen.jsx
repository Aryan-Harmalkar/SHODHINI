import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getUserComplaints, getUserEcoPoints } from '../db/database';
import { tokens, useTheme } from '../lib/theme';

export default function MyComplaintsScreen({
  user,
  onBackToHome,
  onOpenSidebar,
  onGoToReport,
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Day/Dark Theme"
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
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
            <ActivityIndicator size="large" color={colors.accent} />
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
            const isAdminReview =
              item.status === 'Pending Admin' ||
              Boolean(item.description && item.description.includes('[PENDING ADMIN CROSS-VERIFICATION'));

            return (
              <View key={item.id} style={styles.complaintCard}>
                <View style={styles.complaintHeader}>
                  <Text style={styles.categoryTitle}>{item.category || 'General Waste'}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isDone
                        ? styles.statusDone
                        : isAdminReview
                        ? styles.statusAdminReview
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
                          : isAdminReview
                          ? styles.statusAdminReviewText
                          : isInProgress
                          ? styles.statusInProgressText
                          : styles.statusSubmittedText,
                      ]}
                    >
                      {isDone
                        ? '✓ Completed'
                        : isAdminReview
                        ? '🛡️ Admin Review'
                        : item.status || 'Submitted'}
                    </Text>
                  </View>
                </View>

                {isAdminReview && (
                  <View style={styles.adminNoticeStrip}>
                    <Text style={styles.adminNoticeStripText}>
                      🛡️ Low AI sureness (&lt;20%). Held for Municipal Admin cross-verification before field dispatch.
                    </Text>
                  </View>
                )}

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
      paddingVertical: tokens.spacing.md,
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
      color: colors.text,
      fontFamily: tokens.typography.family.bold,
    },
    screenTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    backHomeBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      borderRadius: tokens.radius.lg,
      minHeight: 44,
      justifyContent: 'center',
    },
    backHomeText: {
      color: colors.accent,
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
    },
    scrollContent: {
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xxl,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    ecoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ecoLabel: {
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.semibold,
      color: colors.accent,
    },
    ecoPointsText: {
      fontSize: tokens.typography.size.xxl,
      fontFamily: tokens.typography.family.extrabold,
      color: colors.text,
      marginTop: 2,
    },
    ecoBadge: {
      backgroundColor: colors.accent + '20',
      paddingVertical: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: colors.accent + '35',
    },
    ecoBadgeText: {
      color: colors.accent,
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    statsDivider: {
      height: 1,
      backgroundColor: colors.border,
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
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    statLabel: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      marginTop: 2,
    },
    filterRow: {
      flexDirection: 'row',
      marginBottom: tokens.spacing.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: tokens.radius.xl,
      padding: 4,
    },
    filterPill: {
      flex: 1,
      paddingVertical: tokens.spacing.sm,
      alignItems: 'center',
      borderRadius: tokens.radius.lg,
      minHeight: 44,
      justifyContent: 'center',
    },
    activeFilterPill: {
      backgroundColor: colors.background,
      ...tokens.shadow.sm,
    },
    filterPillText: {
      fontSize: tokens.typography.size.sm,
      color: colors.muted,
      fontFamily: tokens.typography.family.semibold,
    },
    activeFilterPillText: {
      color: colors.text,
      fontFamily: tokens.typography.family.bold,
    },
    centerContainer: {
      padding: tokens.spacing.xxl,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: tokens.spacing.sm,
      color: colors.muted,
      fontSize: tokens.typography.size.sm,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.xl,
      padding: tokens.spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...tokens.shadow.sm,
    },
    emptyIcon: {
      fontSize: tokens.typography.size.xxl,
      marginBottom: tokens.spacing.sm,
    },
    emptyTitle: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      marginBottom: tokens.spacing.sm,
    },
    emptyDesc: {
      fontSize: tokens.typography.size.sm,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: tokens.spacing.lg,
    },
    fileBtn: {
      backgroundColor: colors.accent,
      paddingVertical: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      borderRadius: tokens.radius.xl,
      minHeight: 48,
      justifyContent: 'center',
    },
    fileBtnText: {
      color: isDark ? '#000' : '#fff',
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.sm,
    },
    complaintCard: {
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      marginBottom: tokens.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
    },
    statusPill: {
      paddingVertical: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.sm,
      borderRadius: tokens.radius.full,
    },
    statusDone: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : colors.accent + '20',
    },
    statusDoneText: {
      color: colors.accent,
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.xs,
    },
    statusInProgress: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fff3e0',
    },
    statusInProgressText: {
      color: isDark ? '#fbbf24' : '#e65100',
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.xs,
    },
    statusSubmitted: {
      backgroundColor: isDark ? 'rgba(14, 165, 233, 0.2)' : '#e3f2fd',
    },
    statusSubmittedText: {
      color: isDark ? '#38bdf8' : '#1565c0',
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.xs,
    },
    statusAdminReview: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
    },
    statusAdminReviewText: {
      color: isDark ? '#fcd34d' : '#92400e',
      fontFamily: tokens.typography.family.bold,
      fontSize: tokens.typography.size.xs,
    },
    adminNoticeStrip: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      borderRadius: tokens.radius.lg,
      padding: 6,
      marginBottom: tokens.spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    adminNoticeStripText: {
      fontSize: 10,
      color: isDark ? '#fcd34d' : '#78350f',
      lineHeight: 14,
    },
    complaintDesc: {
      fontSize: tokens.typography.size.sm,
      color: colors.text,
      marginBottom: tokens.spacing.sm,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    metaLabel: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      width: 60,
      fontFamily: tokens.typography.family.medium,
    },
    metaValue: {
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      fontFamily: tokens.typography.family.semibold,
      flex: 1,
    },
    rewardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: tokens.spacing.sm,
      paddingTop: tokens.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rewardLabel: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      fontFamily: tokens.typography.family.semibold,
      marginRight: tokens.spacing.xs,
    },
    rewardValue: {
      fontSize: tokens.typography.size.xs,
      fontFamily: tokens.typography.family.bold,
    },
    pointsEarned: {
      color: colors.accent,
    },
    pointsPending: {
      color: colors.muted,
      fontStyle: 'italic',
    },
  });
