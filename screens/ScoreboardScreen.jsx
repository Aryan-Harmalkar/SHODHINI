import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';
import {
  getCitizenLeaderboard,
  getWardLeaderboard,
  getCollectorCleanupStats,
  formatWardName,
} from '../db/database';

export default function ScoreboardScreen({
  user,
  ecoPoints = 0,
  onBackToHome,
  onOpenSidebar,
  isCollector = false,
}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const isWorker = user?.role === 'worker' || isCollector;
  const userWardName = user?.area || (user?.area_id ? formatWardName(user.area_id) : '');

  const [tab, setTab] = useState(isWorker ? 'wards' : 'citizens');
  const [citizens, setCitizens] = useState([]);
  const [wards, setWards] = useState([]);
  const [workerStats, setWorkerStats] = useState({ completed: 0, active: 0, geotagged: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboardData = async () => {
    const [citizenList, wardList, collectorData] = await Promise.all([
      getCitizenLeaderboard(),
      getWardLeaderboard(),
      isWorker ? getCollectorCleanupStats(user?.id, user?.area_id) : Promise.resolve({ completed: 0, active: 0, geotagged: 0 }),
    ]);

    let finalCitizens = citizenList || [];
    if (!isWorker && user?.id) {
      const found = finalCitizens.some((c) => c.id === user.id);
      if (!found) {
        finalCitizens = [
          ...finalCitizens,
          {
            id: user.id,
            name: user.name || 'Citizen',
            ward: userWardName || 'Active Contributor',
            points: Number(ecoPoints || 0),
            hasGeotag: false,
            reportsCount: 0,
          },
        ].sort((a, b) => b.points - a.points).map((item, idx) => ({ ...item, rank: idx + 1 }));
      }
    }

    return { finalCitizens, wardList, collectorData };
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { finalCitizens, wardList, collectorData } = await fetchLeaderboardData();
        if (mounted) {
          setCitizens(finalCitizens);
          setWards(wardList || []);
          setWorkerStats(collectorData || { completed: 0, active: 0, geotagged: 0 });
        }
      } catch (err) {
        console.warn('Error loading scoreboard data:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    load();
    return () => { mounted = false; };
  }, [user?.id, user?.area_id, isWorker]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { finalCitizens, wardList, collectorData } = await fetchLeaderboardData();
      setCitizens(finalCitizens);
      setWards(wardList || []);
      setWorkerStats(collectorData || { completed: 0, active: 0, geotagged: 0 });
    } catch (err) {
      console.warn('Error refreshing scoreboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const currentCitizenEntry = !isWorker && user?.id ? citizens.find((c) => c.id === user.id) : null;
  const userRank = currentCitizenEntry ? currentCitizenEntry.rank : 1;
  const displayLocation = currentCitizenEntry?.ward || userWardName || 'Active Contributor';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🏆 Scoreboard</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Sleek Minimal Standing Card */}
        {isWorker ? (
          <View style={styles.standingCard}>
            <View style={styles.standingInfo}>
              <Text style={styles.standingName}>👷 {user?.name || 'Worker'}</Text>
              <Text style={styles.standingSub}>Sanitation Team • {userWardName || 'Field Operations'}</Text>
            </View>
            <View style={styles.workerDutyPill}>
              <Text style={styles.workerDutyText}>{workerStats.completed} Cleanups Done</Text>
              {workerStats.geotagged > 0 && (
                <Text style={styles.workerDutySubText}>📍 {workerStats.geotagged} GPS Verified</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.standingCard}>
            <View style={styles.standingInfo}>
              <Text style={styles.standingName}>{user?.name || 'Citizen'}</Text>
              <Text style={styles.standingSub}>Rank #{userRank} • {displayLocation}</Text>
            </View>
            <View style={styles.ecoPill}>
              <Text style={styles.ecoPillText}>🌱 {ecoPoints} pts</Text>
            </View>
          </View>
        )}

        {/* Minimal Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'wards' && styles.activeTabBtn]}
            onPress={() => setTab('wards')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'wards' && styles.activeTabBtnText]}>
              🏙️ Wards & Cleanliness
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
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <View style={styles.listCard}>
            {/* WARD CLEANLINESS RANKING */}
            {tab === 'wards' && (
              wards.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No ward cleanliness records found.</Text>
                </View>
              ) : (
                wards.map((ward, index) => {
                  const isUserWard = userWardName && (
                    userWardName.toLowerCase() === ward.name.toLowerCase() ||
                    ward.name.toLowerCase().includes(userWardName.toLowerCase())
                  );
                  const visualRank = index + 1;
                  const isPristine = ward.total === 0;

                  return (
                    <View
                      key={ward.id || ward.name}
                      style={[styles.row, isUserWard && styles.currentUserRow]}
                    >
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankNum}>
                          {visualRank === 1 ? '🥇' : visualRank === 2 ? '🥈' : visualRank === 3 ? '🥉' : `#${visualRank}`}
                        </Text>
                      </View>

                      <View style={styles.infoCol}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.itemName, isUserWard && styles.currentUserName]}>
                            {ward.name} {isUserWard ? '(Your Area)' : ''}
                          </Text>
                          {ward.geotaggedCount > 0 && (
                            <View style={styles.geotagBadge}>
                              <Text style={styles.geotagBadgeText}>📸 {ward.geotaggedCount} Geotagged</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemSub}>
                          {isPristine
                            ? '✨ 0 active waste spots • 100% Pristine'
                            : `${ward.resolved} cleanups resolved • ${ward.active} active`}
                        </Text>
                        {ward.latestCoords && (
                          <Text style={styles.itemMeta}>
                            📍 Latest Live Geotag: {ward.latestCoords}
                          </Text>
                        )}
                      </View>

                      <View style={styles.metricCol}>
                        <Text style={[styles.metricVal, { color: ward.score >= 80 ? colors.accent : '#d97706' }]}>
                          {ward.score}%
                        </Text>
                        <Text style={styles.metricSub}>Clean</Text>
                      </View>
                    </View>
                  );
                })
              )
            )}

            {/* CITIZEN CHAMPIONS */}
            {tab === 'citizens' && (
              citizens.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No registered citizens yet.</Text>
                </View>
              ) : (
                citizens.map((item) => {
                  const isFirst = item.rank === 1;
                  const isSecond = item.rank === 2;
                  const isThird = item.rank === 3;
                  const isYou = !isWorker && user?.id === item.id;

                  return (
                    <View
                      key={item.id || item.name}
                      style={[styles.row, isYou && styles.currentUserRow]}
                    >
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankNum}>
                          {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${item.rank}`}
                        </Text>
                      </View>

                      <View style={styles.infoCol}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.itemName, isYou && styles.currentUserName]}>
                            {item.name} {isYou ? '(You)' : ''}
                          </Text>
                          {item.hasGeotag && (
                            <View style={styles.geotagBadge}>
                              <Text style={styles.geotagBadgeText}>📸 Live Geotag</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.itemSub} numberOfLines={1}>
                          📍 {item.ward || 'Community Contributor'}
                        </Text>
                        {item.reportsCount > 0 && (
                          <Text style={styles.itemMeta}>
                            {item.reportsCount} {item.reportsCount === 1 ? 'report' : 'reports'} filed
                            {item.geotagCoords ? ` • ${item.geotagCoords}` : ''}
                          </Text>
                        )}
                      </View>

                      <View style={styles.metricCol}>
                        <Text style={styles.metricVal}>{item.points} pts</Text>
                        <Text style={styles.metricSub}>Eco Points</Text>
                      </View>
                    </View>
                  );
                })
              )
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: colors.card,
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
    gap: tokens.spacing.sm,
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
  backHomeBtn: {
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: colors.surface,
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
  standingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  standingInfo: {
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  standingName: {
    fontSize: tokens.typography.size.base,
    fontFamily: tokens.typography.family.bold,
    color: colors.text,
  },
  standingSub: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    marginTop: 2,
  },
  ecoPill: {
    backgroundColor: colors.accent + '20',
    paddingVertical: 5,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  ecoPillText: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.xs,
  },
  workerDutyPill: {
    backgroundColor: colors.accent + '20',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    alignItems: 'flex-end',
  },
  workerDutyText: {
    color: colors.accent,
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
  },
  workerDutySubText: {
    color: colors.accent,
    fontSize: 10,
    marginTop: 2,
    fontFamily: tokens.typography.family.semibold,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.xl,
    padding: 3,
    marginBottom: tokens.spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: tokens.radius.lg,
  },
  activeTabBtn: {
    backgroundColor: colors.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...tokens.shadow.sm,
  },
  tabBtnText: {
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.semibold,
    color: colors.muted,
  },
  activeTabBtnText: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  loadingBox: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentUserRow: {
    backgroundColor: colors.accent + (isDark ? '15' : '08'),
    marginHorizontal: -tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  rankBadge: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  rankNum: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.muted,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.semibold,
    color: colors.text,
  },
  currentUserName: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  geotagBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  geotagBadgeText: {
    fontSize: 10,
    fontFamily: tokens.typography.family.bold,
    color: colors.accent,
  },
  itemSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  metricCol: {
    alignItems: 'flex-end',
    marginLeft: tokens.spacing.sm,
  },
  metricVal: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.accent,
  },
  metricSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  emptyBox: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
  },
});
