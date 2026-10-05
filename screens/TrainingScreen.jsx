import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function TrainingScreen({ onBackToHome, onOpenSidebar }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>📚 Training Hub</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Welcome to SHODHINI Training</Text>
        <Text style={styles.headerSubtitle}>Guidelines for Garbage Collectors & Supervisors</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ 1. Service Level Agreements (SLA)</Text>
          <Text style={styles.cardText}>
            • <Text style={styles.bold}>3-Minute Acknowledgement:</Text> When a citizen requests a doorstep pickup, you have exactly 3 minutes to ACCEPT or REJECT the job.{"\n"}
            • <Text style={styles.bold}>1-Hour Resolution:</Text> Once you Accept a job, you must reach the destination and complete the pickup within 1 hour.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📸 2. Verification Protocol</Text>
          <Text style={styles.cardText}>
            • <Text style={styles.bold}>Public Waste:</Text> You must upload an "After" photo showing the cleared area. Our AI (and Supervisors) will verify the cleanliness.{"\n"}
            • <Text style={styles.bold}>Doorstep Pickups:</Text> Just tap "Mark Picked Up" once collected. Make sure to collect payment via UPI/Cash if the user didn't use Eco Points.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⭐ 3. GC Ranking System</Text>
          <Text style={styles.cardText}>
            • <Text style={styles.bold}>A-Class Collector:</Text> Consistently meets the 1-Hour SLA, high AI verification success rate, and no unresolved complaints.{"\n"}
            • <Text style={styles.bold}>B-Class Collector:</Text> Frequently misses the 3-minute acknowledgement window or has delayed pickups.
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: { padding: tokens.spacing.lg },
  headerTitle: { fontSize: tokens.typography.size.xl, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: tokens.typography.size.sm, color: colors.muted, marginBottom: tokens.spacing.xl },
  card: {
    backgroundColor: colors.surface,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.xl,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.bold, color: colors.accent, marginBottom: tokens.spacing.sm },
  cardText: { fontSize: tokens.typography.size.sm, color: colors.text, lineHeight: 22 },
  bold: { fontFamily: tokens.typography.family.bold, color: colors.text },
});
