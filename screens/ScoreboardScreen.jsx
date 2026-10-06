import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const isWorker = user?.role === 'worker' || isCollector;
  const userWardName = user?.area || (user?.area_id ? formatWardName(user.area_id) : 'Assagao - Ward 1 (Ghateshwar Nagar)');

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

  const currentCitizenEntry = !isWorker && user?.id ? citizens.find((c) => c.id === user.id) : null;
  const userRank = currentCitizenEntry ? currentCitizenEntry.rank : 1;

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
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
          >
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
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
            <View>
              <Text style={styles.standingName}>👷 {user?.name || 'Worker'}</Text>
              <Text style={styles.standingSub}>Sanitation Team • {userWardName}</Text>
            </View>
            <View style={styles.workerDutyPill}>
              <Text style={styles.workerDutyText}>{workerStats.completed} Cleanups Done</Text>
            </View>
          </View>
        ) : (
          <View style={styles.standingCard}>
            <View>
              <Text style={styles.standingName}>{user?.name || 'Citizen'}</Text>
              <Text style={styles.standingSub}>Rank #{userRank} • {userWardName}</Text>
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
              🏙️ Assagao Wards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'citizens' && styles.activeTabBtn]}
            onPress={() => setTab('citizens')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'citizens' && styles.activeTabBtnText]}>
              👥 Citizens
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
              (() => {
                const activeWards = wards.filter((ward) => ward.resolved > 0 || ward.active > 0);
                if (activeWards.length === 0) {
                  return (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No ward data recorded yet.</Text>
                    </View>
                  );
                }
                return activeWards.map((ward, index) => {
                  const isUserWard = userWardName.toLowerCase() === ward.name.toLowerCase();
                  // Re-calculate visual rank for filtered list
                  const visualRank = index + 1;

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
                        <Text style={[styles.itemName, isUserWard && styles.currentUserName]}>
                          {ward.name} {isUserWard ? '(Your Ward)' : ''}
                        </Text>
                        <Text style={styles.itemSub}>
                          {ward.resolved} cleanups • {ward.active} active
                        </Text>
                      </View>

                      <View style={styles.metricCol}>
                        <Text style={[styles.metricVal, { color: ward.score >= 80 ? colors.accent : '#d97706' }]}>
                          {ward.score}%
                        </Text>
                      </View>
                    </View>
                  );
                });
              })()
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
                        <Text style={[styles.itemName, isYou && styles.currentUserName]}>
                          {item.name} {isYou ? '(You)' : ''}
                        </Text>
                        <Text style={styles.itemSub}>📍 {item.ward}</Text>
                      </View>

                      <View style={styles.metricCol}>
                        <Text style={styles.metricVal}>{item.points} pts</Text>
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
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
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
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    paddingVertical: 5,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.full,
  },
  workerDutyText: {
    color: colors.accent,
    fontSize: tokens.typography.size.xs,
    fontFamily: tokens.typography.family.bold,
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
  itemName: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.semibold,
    color: colors.text,
  },
  currentUserName: {
    color: colors.accent,
    fontFamily: tokens.typography.family.bold,
  },
  itemSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  metricCol: {
    alignItems: 'flex-end',
  },
  metricVal: {
    fontSize: tokens.typography.size.sm,
    fontFamily: tokens.typography.family.bold,
    color: colors.accent,
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
