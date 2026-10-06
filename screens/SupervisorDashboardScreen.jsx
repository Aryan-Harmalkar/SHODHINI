import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function SupervisorDashboardScreen({ onBackToHome, onOpenSidebar }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    investmentAndReturn: '₹12,45,000 / ₹4,30,500',
    levelOfService: '94.2%',
    reachableTime: '12 mins',
    deliveryTime: '45 mins',
    turnAroundTime: '57 mins',
  });

  useEffect(() => {
    // Mock the dashboard data for demonstration
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>📈 ROI Dashboard</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity style={styles.themeToggleBtn} onPress={toggleTheme} activeOpacity={0.7}>
            <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome} activeOpacity={0.7}>
            <Text style={styles.backHomeText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loaderText}>Loading live analytics...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Live Efficiency & Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Investment & Return</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.investmentAndReturn}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Level of Service</Text>
              <Text style={styles.statValue}>{stats.levelOfService}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Reachable Time</Text>
              <Text style={styles.statValue}>{stats.reachableTime}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Delivery Time</Text>
              <Text style={styles.statValue}>{stats.deliveryTime}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Turn around Time</Text>
              <Text style={styles.statValue}>{stats.turnAroundTime}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm,
    backgroundColor: colors.headerBg || colors.background,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { padding: tokens.spacing.xs, marginRight: tokens.spacing.sm },
  menuIcon: { fontSize: tokens.typography.size.lg, color: colors.text, fontFamily: tokens.typography.family.bold },
  screenTitle: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.extrabold, color: colors.accent },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  themeToggleBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  themeToggleIcon: { fontSize: 16 },
  backHomeBtn: { paddingVertical: 6, paddingHorizontal: tokens.spacing.sm, borderRadius: tokens.radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  backHomeText: { color: colors.text, fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.family.semibold },
  scrollContent: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xxl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: colors.muted, fontSize: tokens.typography.size.sm },
  sectionTitle: { fontSize: tokens.typography.size.md, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginTop: tokens.spacing.xl, marginBottom: tokens.spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  statBox: {
    width: '48%', backgroundColor: colors.surface, padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: tokens.spacing.sm
  },
  statLabel: { fontSize: tokens.typography.size.xs, color: colors.muted, marginBottom: 4, fontFamily: tokens.typography.family.semibold },
  statValue: { fontSize: tokens.typography.size.base, color: colors.text, fontFamily: tokens.typography.family.extrabold },
});
