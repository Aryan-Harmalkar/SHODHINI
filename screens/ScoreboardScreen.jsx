import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { tokens } from '../lib/theme';
import {
  getCitizenLeaderboard,
  getWardLeaderboard,
  getCollectorCleanupStats,
} from '../db/database';

export default function ScoreboardScreen({
  user,
  ecoPoints = 0,
  onBackToHome,
  onOpenSidebar,
  isCollector = false,
}) {
  const isWorker = user?.role === 'worker' || isCollector;
  const userWardName = user?.area || (user?.area_id ? `Ward ${user.area_id}` : 'Ward 1');

  // Default to 'wards' for collectors (field focus), 'citizens' for regular residents
  const [tab, setTab] = useState(isWorker ? 'wards' : 'citizens');
  const [citizens, setCitizens] = useState([]);
  const [wards, setWards] = useState([]);
  const [workerStats, setWorkerStats] = useState({ completed: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [citizenList, wardList, collectorData] = await Promise.all([
        getCitizenLeaderboard(),
        getWardLeaderboard(),
        isWorker ? getCollectorCleanupStats(user?.id, user?.area_id) : Promise.resolve({ completed: 0, active: 0 }),
      ]);

      // If current user is a citizen and not yet returned (e.g. before RLS sync), ensure they are represented
      let finalCitizens = citizenList || [];
      if (!isWorker && user?.id) {
        const found = finalCitizens.some((c) => c.id === user.id);
        if (!found) {
          finalCitizens = [
            ...finalCitizens,
            {
              id: user.id,
              name: user.name || 'Citizen',
              ward: userWardName,
              points: Number(ecoPoints || 0),
            },
          ].sort((a, b) => b.points - a.points).map((item, idx) => ({ ...item, rank: idx + 1 }));
        }
      }

      setCitizens(finalCitizens);
      setWards(wardList || []);
      setWorkerStats(collectorData || { completed: 0, active: 0 });
    } catch (err) {
      console.warn('Error loading scoreboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.name, user?.area_id, isWorker, userWardName, ecoPoints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Find citizen standing
  const currentCitizenEntry = !isWorker && user?.id ? citizens.find((c) => c.id === user.id) : null;
  const userRank = currentCitizenEntry ? currentCitizenEntry.rank : 1;
  const totalCitizens = Math.max(citizens.length, 1);
  const userTier =
    userRank === 1
      ? 'Top 1'
      : userRank <= Math.ceil(totalCitizens * 0.2)
      ? 'Top 20%'
      : userRank <= Math.ceil(totalCitizens * 0.5)
      ? 'Top 50%'
      : 'Active';

  const getDynamicBadge = (rank, points) => {
    if (rank === 1 && points > 0) return '👑 Clean Champion';
    if (rank === 2 && points > 0) return '🌟 Eco Hero';
    if (rank === 3 && points > 0) return '🌱 Green Warrior';
    if (points >= 50) return '♻️ Recycler Pro';
    if (points > 0) return '🌿 Active Citizen';
    return '🌱 Registered Member';
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>
            {isWorker ? '🏆 Ward Cleanliness & Scoreboard' : '🏆 Scoreboard & Community Ranks'}
          </Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.accent} />}
      >
        {/* STANDING OVERVIEW CARD */}
        {isWorker ? (
          /* WORKER STANDING CARD — NO ECO POINTS */
          <View style={[styles.standingCard, styles.workerStandingCard]}>
            <View style={styles.standingHeader}>
              <View>
                <Text style={styles.standingLabel}>Sanitation Field Standing</Text>
                <Text style={styles.standingName}>👷 {user?.name || 'Sanitation Team'}</Text>
              </View>
              <View style={styles.workerDutyPill}>
                <View style={styles.dutyDot} />
                <Text style={styles.workerDutyText}>ACTIVE ON DUTY</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: tokens.colors.accent }]}>
                  {workerStats.completed}
                </Text>
                <Text style={styles.statLabel}>Cleanups Done</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statVal}>{userWardName}</Text>
                <Text style={styles.statLabel}>Assigned Ward</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: workerStats.active > 0 ? '#d97706' : tokens.colors.accent }]}>
                  {workerStats.active}
                </Text>
                <Text style={styles.statLabel}>Active Hotspots</Text>
              </View>
            </View>

            <View style={styles.workerNoteRow}>
              <Text style={styles.workerNoteText}>
                🛡️ Municipal Operations Hub • Track ward cleanup performance and garbage clearance below.
              </Text>
            </View>
          </View>
        ) : (
          /* CITIZEN STANDING CARD — REAL USER ECO POINTS */
          <View style={styles.standingCard}>
            <View style={styles.standingHeader}>
              <View>
                <Text style={styles.standingLabel}>Your Citizen Standing</Text>
                <Text style={styles.standingName}>{user?.name || 'Citizen'}</Text>
              </View>
              <View style={styles.ecoPill}>
                <Text style={styles.ecoPillText}>🌱 {ecoPoints} pts</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>#{userRank}</Text>
                <Text style={styles.statLabel}>City Rank</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statVal}>{userWardName}</Text>
                <Text style={styles.statLabel}>Your Ward</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: tokens.colors.accent }]}>{userTier}</Text>
                <Text style={styles.statLabel}>Tier</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB SWITCHER */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'wards' && styles.activeTabBtn]}
            onPress={() => setTab('wards')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'wards' && styles.activeTabBtnText]}>
              🏙️ Ward Cleanliness
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'citizens' && styles.activeTabBtn]}
            onPress={() => setTab('citizens')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'citizens' && styles.activeTabBtnText]}>
              👥 Citizen Champions
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={tokens.colors.accent} />
            <Text style={styles.loadingText}>Fetching live rankings from municipal database...</Text>
          </View>
        ) : (
          <>
            {/* VIEW 1: WARDS CLEANLINESS RANKING (REAL DATABASE DATA) */}
            {tab === 'wards' && (
              <View style={styles.leaderboardCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Cleanest Wards Leaderboard</Text>
                    <Text style={styles.sectionSubtitle}>
                      Calculated from real complaint reports & verified cleanups in each ward.
                    </Text>
                  </View>
                </View>

                {wards.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateIcon}>🏙️</Text>
                    <Text style={styles.emptyStateTitle}>No Ward Data Yet</Text>
                    <Text style={styles.emptyStateSub}>Ward cleanliness will update as complaints are logged and cleared.</Text>
                  </View>
                ) : (
                  wards.map((ward) => {
                    const isUserWard = userWardName.toLowerCase() === ward.name.toLowerCase();

                    return (
                      <View
                        key={ward.id || ward.name}
                        style={[
                          styles.rankRow,
                          isUserWard && styles.currentUserRow,
                        ]}
                      >
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankNum}>
                            {ward.rank === 1 ? '🥇' : ward.rank === 2 ? '🥈' : ward.rank === 3 ? '🥉' : `#${ward.rank}`}
                          </Text>
                        </View>

                        <View style={styles.rankInfoCol}>
                          <View style={styles.wardTitleRow}>
                            <Text style={[styles.rankName, isUserWard && styles.currentUserName]}>
                              {ward.name}
                            </Text>
                            {isUserWard && (
                              <View style={styles.yourWardTag}>
                                <Text style={styles.yourWardTagText}>{isWorker ? 'YOUR DUTY WARD' : 'YOUR HOME WARD'}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.rankWardSub}>
                            🧹 {ward.resolved} Cleanups Done • {ward.active} Active Hotspot{ward.active === 1 ? '' : 's'}
                          </Text>
                        </View>

                        <View style={styles.scoreCol}>
                          <Text style={[styles.scoreVal, { color: ward.score >= 80 ? tokens.colors.accent : '#d97706' }]}>
                            {ward.score}%
                          </Text>
                          <Text style={styles.scoreUnit}>Clean Score</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={styles.verifiedFooterRow}>
                  <Text style={styles.verifiedFooterText}>
                    📊 Live data compiled directly from municipal reports. No arbitrary estimates.
                  </Text>
                </View>
              </View>
            )}

            {/* VIEW 2: CITIZEN CHAMPIONS (REAL REGISTERED CITIZENS ONLY) */}
            {tab === 'citizens' && (
              <View style={styles.leaderboardCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Community Citizen Champions</Text>
                    <Text style={styles.sectionSubtitle}>
                      {isWorker
                        ? 'Resident eco-points earned by filing complaints & recycling waste. (Citizens only)'
                        : 'Real registered residents ranked by verified clean reports & eco contributions.'}
                    </Text>
                  </View>
                </View>

                {citizens.length === 0 ? (
                  <View style={styles.emptyStateBox}>
                    <Text style={styles.emptyStateIcon}>🌱</Text>
                    <Text style={styles.emptyStateTitle}>No Citizens Registered Yet</Text>
                    <Text style={styles.emptyStateSub}>
                      Be the first to report waste or recycle scrap to climb the leaderboard!
                    </Text>
                  </View>
                ) : (
                  citizens.map((item) => {
                    const isFirst = item.rank === 1;
                    const isSecond = item.rank === 2;
                    const isThird = item.rank === 3;
                    const isYou = !isWorker && user?.id === item.id;
                    const badgeText = getDynamicBadge(item.rank, item.points);

                    return (
                      <View
                        key={item.id || item.name}
                        style={[
                          styles.rankRow,
                          isYou && styles.currentUserRow,
                        ]}
                      >
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankNum}>
                            {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${item.rank}`}
                          </Text>
                        </View>

                        <View style={styles.rankInfoCol}>
                          <View style={styles.rankNameRow}>
                            <Text style={[styles.rankName, isYou && styles.currentUserName]}>
                              {item.name} {isYou ? '(You)' : ''}
                            </Text>
                          </View>
                          <View style={styles.rankSubRow}>
                            <Text style={styles.rankWard}>📍 {item.ward}</Text>
                            <Text style={styles.rankBadgeText}>{badgeText}</Text>
                          </View>
                        </View>

                        <View style={styles.pointsCol}>
                          <Text style={styles.pointsText}>{item.points}</Text>
                          <Text style={styles.pointsUnit}>pts</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={styles.verifiedFooterRow}>
                  <Text style={styles.verifiedFooterText}>
                    ✨ Only actual registered citizens are shown. No random or generated mock profiles.
                  </Text>
                </View>
              </View>
            )}
          </>
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
    flex: 1,
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
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    flexShrink: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  refreshBtn: {
    padding: tokens.spacing.xs,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: tokens.typography.size.base,
  },
  backHomeBtn: {
    backgroundColor: tokens.colors.accent + '15',
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
  standingCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    ...tokens.shadow.sm,
  },
  workerStandingCard: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.background,
  },
  standingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  standingLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
    textTransform: 'uppercase',
  },
  standingName: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  ecoPill: {
    backgroundColor: tokens.colors.accent,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
  },
  ecoPillText: {
    color: tokens.colors.background,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.sm,
  },
  workerDutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent + '20',
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
  workerDutyText: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.text,
  },
  statLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: tokens.colors.border,
  },
  workerNoteRow: {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  workerNoteText: {
    fontSize: 11,
    color: tokens.colors.muted,
    fontStyle: 'italic',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    padding: 3,
    marginBottom: tokens.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  activeTabBtn: {
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  tabBtnText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
  },
  activeTabBtnText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  loadingBox: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
  },
  loadingText: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
  },
  leaderboardCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.sm,
  },
  cardHeaderRow: {
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  sectionSubtitle: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surface,
  },
  currentUserRow: {
    backgroundColor: tokens.colors.accent + '10',
    marginHorizontal: -tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
  },
  rankBadge: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  rankNum: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.muted,
  },
  rankInfoCol: {
    flex: 1,
  },
  wardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yourWardTag: {
    backgroundColor: tokens.colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  yourWardTagText: {
    color: tokens.colors.accent,
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankName: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  currentUserName: {
    color: tokens.colors.accent,
  },
  rankSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rankWard: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
  },
  rankWardSub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  rankBadgeText: {
    fontSize: 10,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  pointsUnit: {
    fontSize: 10,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
  },
  scoreCol: {
    alignItems: 'flex-end',
  },
  scoreVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
  },
  scoreUnit: {
    fontSize: 10,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
  },
  emptyStateBox: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: tokens.spacing.xs,
  },
  emptyStateTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  emptyStateSub: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  verifiedFooterRow: {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.surface,
    alignItems: 'center',
  },
  verifiedFooterText: {
    fontSize: 10,
    color: tokens.colors.muted,
    textAlign: 'center',
  },
});
