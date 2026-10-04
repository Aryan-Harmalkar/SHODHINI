import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { tokens } from '../lib/theme';

export default function ScoreboardScreen({ user, ecoPoints = 0, onBackToHome, onOpenSidebar }) {
  const [tab, setTab] = useState('citizens'); // 'citizens' | 'wards'

  const userWardName = user?.area || (user?.area_id ? `Ward ${user.area_id}` : 'Ward 1');

  // Community Champions Mock & Live Data
  const citizensLeaderboard = [
    { rank: 1, name: 'Priya Sharma', ward: 'Ward 3', points: 420, badge: '👑 Clean Champion' },
    { rank: 2, name: user?.name || 'You', ward: userWardName, points: Math.max(ecoPoints, 185), isCurrent: true, badge: '🌟 Eco Hero' },
    { rank: 3, name: 'Rahul Deshmukh', ward: 'Ward 1', points: 165, badge: '🌱 Green Warrior' },
    { rank: 4, name: 'Sneha Patil', ward: 'Ward 5', points: 130, badge: '♻️ Recycler Pro' },
    { rank: 5, name: 'Vikram Mehta', ward: 'Ward 2', points: 115, badge: '🧹 Street Guard' },
    { rank: 6, name: 'Ananya Roy', ward: 'Ward 4', points: 90, badge: '🌿 Active Citizen' },
  ].sort((a, b) => b.points - a.points).map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Ward Ranking by Community Cleanliness & Resolved Tasks
  const wardLeaderboard = [
    { rank: 1, name: 'Ward 1', resolved: 48, score: 96, points: 720 },
    { rank: 2, name: 'Ward 3', resolved: 42, score: 92, points: 630 },
    { rank: 3, name: 'Ward 2', resolved: 37, score: 88, points: 555 },
    { rank: 4, name: 'Ward 5', resolved: 31, score: 84, points: 465 },
    { rank: 5, name: 'Ward 4', resolved: 28, score: 81, points: 420 },
    { rank: 6, name: 'Ward 7', resolved: 24, score: 78, points: 360 },
    { rank: 7, name: 'Ward 6', resolved: 22, score: 75, points: 330 },
    { rank: 8, name: 'Ward 8', resolved: 19, score: 71, points: 285 },
    { rank: 9, name: 'Ward 9', resolved: 16, score: 68, points: 240 },
    { rank: 10, name: 'Ward 10', resolved: 12, score: 62, points: 180 },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>🏆 Scoreboard & Ranks</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Rank Snapshot Card */}
        <View style={styles.userRankCard}>
          <View style={styles.userRankHeader}>
            <View>
              <Text style={styles.userRankLabel}>Your Standing</Text>
              <Text style={styles.userRankName}>{user?.name || 'Citizen'}</Text>
            </View>
            <View style={styles.ecoPill}>
              <Text style={styles.ecoPillText}>{ecoPoints} pts</Text>
            </View>
          </View>
          <View style={styles.userRankStatsRow}>
            <View style={styles.rankStatBox}>
              <Text style={styles.rankStatVal}>#2</Text>
              <Text style={styles.rankStatLabel}>City Rank</Text>
            </View>
            <View style={styles.rankStatDivider} />
            <View style={styles.rankStatBox}>
              <Text style={styles.rankStatVal}>{userWardName}</Text>
              <Text style={styles.rankStatLabel}>Your Ward</Text>
            </View>
            <View style={styles.rankStatDivider} />
            <View style={styles.rankStatBox}>
              <Text style={[styles.rankStatVal, { color: tokens.colors.accent }]}>Top 5%</Text>
              <Text style={styles.rankStatLabel}>Tier</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher: Top Citizens vs Ward Leaderboard */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'citizens' && styles.activeTabBtn]}
            onPress={() => setTab('citizens')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'citizens' && styles.activeTabBtnText]}>
              👥 Top Citizens
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, tab === 'wards' && styles.activeTabBtn]}
            onPress={() => setTab('wards')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabBtnText, tab === 'wards' && styles.activeTabBtnText]}>
              🏙️ Ward Rankings
            </Text>
          </TouchableOpacity>
        </View>

        {/* CITIZENS VIEW */}
        {tab === 'citizens' && (
          <View style={styles.leaderboardCard}>
            <Text style={styles.sectionTitle}>Citywide Eco Champions</Text>
            <Text style={styles.sectionSubtitle}>Ranked by verified clean reports & eco contributions</Text>

            {citizensLeaderboard.map((item) => {
              const isFirst = item.rank === 1;
              const isSecond = item.rank === 2;
              const isThird = item.rank === 3;
              const isYou = item.isCurrent;

              return (
                <View
                  key={item.name}
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
                      <Text style={styles.rankBadgeText}>{item.badge}</Text>
                    </View>
                  </View>

                  <View style={styles.pointsCol}>
                    <Text style={styles.pointsText}>{item.points}</Text>
                    <Text style={styles.pointsUnit}>pts</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* WARDS VIEW */}
        {tab === 'wards' && (
          <View style={styles.leaderboardCard}>
            <Text style={styles.sectionTitle}>Cleanest Wards Leaderboard</Text>
            <Text style={styles.sectionSubtitle}>Updated weekly based on resolution time & garbage clearing</Text>

            {wardLeaderboard.map((ward) => {
              const isUserWard = userWardName.toLowerCase() === ward.name.toLowerCase();

              return (
                <View
                  key={ward.name}
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
                    <Text style={[styles.rankName, isUserWard && styles.currentUserName]}>
                      {ward.name} {isUserWard ? '(Your Ward)' : ''}
                    </Text>
                    <Text style={styles.rankWard}>
                      🧹 {ward.resolved} Cleanups Completed • Score: {ward.score}%
                    </Text>
                  </View>

                  <View style={styles.pointsCol}>
                    <Text style={styles.pointsText}>{ward.points}</Text>
                    <Text style={styles.pointsUnit}>pts</Text>
                  </View>
                </View>
              );
            })}
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
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
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
  userRankCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    ...tokens.shadow.sm,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  userRankLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
    textTransform: 'uppercase',
  },
  userRankName: {
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
  userRankStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  rankStatBox: {
    alignItems: 'center',
  },
  rankStatVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.text,
  },
  rankStatLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  rankStatDivider: {
    width: 1,
    backgroundColor: tokens.colors.border,
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
  leaderboardCard: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.sm,
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
    marginBottom: tokens.spacing.md,
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
});
