import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { tokens, useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function SupervisorDashboardScreen({ onBackToHome, onOpenSidebar, complaints = [], onUpdateStatus }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roi'); // 'roi' or 'approvals'
  const [stats, setStats] = useState({
    investment: '₹120,000',
    returns: '₹45,500',
    roi: '37.9%',
    levelOfService: '92%',
    avgReachableTime: '14 mins',
    avgTurnaroundTime: '42 mins',
    topCollectors: [],
  });

  useEffect(() => {
    // In a real production app, we would query Supabase for these live stats.
    // For now, we mock the dashboard data for demonstration.
    setTimeout(() => {
      setStats({
        investment: '₹12,45,000',
        returns: '₹4,30,500',
        roi: '34.5%',
        levelOfService: '94.2%',
        avgReachableTime: '12 mins',
        avgDeliveryTime: '45 mins',
        avgTurnaroundTime: '57 mins',
        topCollectors: [
          { name: 'Ramesh K.', class: 'A', score: 98 },
          { name: 'Suresh M.', class: 'A', score: 95 },
          { name: 'Vijay P.', class: 'B', score: 72 },
        ],
        ads: [
          'Goa State Pollution Control Board (WPCB)',
          'Department of Environment & Climate Change',
          'Goa Tourism Department',
          'Archaeological Survey of India (ASI)'
        ]
      });
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
          <Text style={styles.screenTitle}>📈 Supervisor & ROI</Text>
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

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'roi' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('roi')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'roi' && styles.tabBtnTextActive]}>Live Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'approvals' && styles.tabBtnActive]} 
              onPress={() => setActiveTab('approvals')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'approvals' && styles.tabBtnTextActive]}>Manual Approvals</Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'roi' && (
            <>
              <Text style={styles.sectionTitle}>Financials & ROI</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Investment</Text>
              <Text style={styles.statValue}>{stats.investment}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Revenue & Returns</Text>
              <Text style={styles.statValue}>{stats.returns}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current ROI</Text>
              <Text style={[styles.statValue, { color: '#32cd32' }]}>{stats.roi}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Live Efficiency & Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Level of Service</Text>
              <Text style={styles.statValue}>{stats.levelOfService}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Reachable Time</Text>
              <Text style={styles.statValue}>{stats.avgReachableTime}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Delivery Time</Text>
              <Text style={styles.statValue}>{stats.avgDeliveryTime}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Turnaround Time</Text>
              <Text style={styles.statValue}>{stats.avgTurnaroundTime}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Collector Rankings (A/B Class)</Text>
          <View style={styles.rankingCard}>
            {stats.topCollectors.map((gc, index) => (
              <View key={index} style={styles.gcRow}>
                <View style={styles.gcLeft}>
                  <Text style={styles.gcRank}>#{index + 1}</Text>
                  <Text style={styles.gcName}>{gc.name}</Text>
                </View>
                <View style={styles.gcRight}>
                  <View style={[styles.classPill, gc.class === 'A' ? styles.classA : styles.classB]}>
                    <Text style={styles.classText}>Class {gc.class}</Text>
                  </View>
                  <Text style={styles.gcScore}>{gc.score} pts</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Income Advertisement Partners</Text>
          <View style={styles.adCard}>
            <Text style={styles.adDesc}>Approaching the following departments for app sponsorship:</Text>
            {stats.ads.map((ad, i) => (
              <Text key={i} style={styles.adItem}>• {ad}</Text>
            ))}
          </View>

            </>
          )}

          {activeTab === 'approvals' && (
            <View style={styles.approvalsContainer}>
              <Text style={styles.sectionTitle}>Images Awaiting Manual Approval</Text>
              
              {complaints.filter(c => c.status === 'Completed').length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>👍</Text>
                  <Text style={styles.emptyTitle}>All caught up!</Text>
                  <Text style={styles.emptySub}>No GC images awaiting supervisor review.</Text>
                </View>
              ) : (
                complaints.filter(c => c.status === 'Completed').map(c => (
                  <View key={c.id} style={styles.approvalCard}>
                    <Text style={styles.approvalCategory}>{c.category}</Text>
                    <Text style={styles.approvalLocation}>📍 {c.location}</Text>
                    
                    <View style={styles.imagesRow}>
                      <View style={styles.imageCol}>
                        <Text style={styles.imageLabel}>Reported (Before)</Text>
                        {c.citizen_image_base64 ? (
                          <Image source={{ uri: `data:image/jpeg;base64,${c.citizen_image_base64}` }} style={styles.reviewImg} />
                        ) : (
                          <View style={styles.noImgBox}><Text style={styles.noImgText}>No Image</Text></View>
                        )}
                      </View>
                      <View style={styles.imageCol}>
                        <Text style={styles.imageLabel}>Collector (After)</Text>
                        {c.collector_image_base64 ? (
                          <Image source={{ uri: `data:image/jpeg;base64,${c.collector_image_base64}` }} style={styles.reviewImg} />
                        ) : (
                          <View style={styles.noImgBox}><Text style={styles.noImgText}>No Image</Text></View>
                        )}
                      </View>
                    </View>

                    <View style={styles.approvalActions}>
                      <TouchableOpacity 
                        style={styles.approveBtn} 
                        onPress={() => onUpdateStatus(c.id, 'Verified')}
                      >
                        <Text style={styles.approveBtnText}>✅ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectBtn}
                        onPress={() => {
                          Alert.alert('Reject Work', 'Are you sure you want to reject this cleanup?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', onPress: () => onUpdateStatus(c.id, 'In Progress') }
                          ]);
                        }}
                      >
                        <Text style={styles.rejectBtnText}>❌ Reject (Rework)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

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
  scrollContent: { padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 12, color: colors.muted, fontSize: tokens.typography.size.sm },
  sectionTitle: { fontSize: tokens.typography.size.md, fontFamily: tokens.typography.family.extrabold, color: colors.text, marginTop: tokens.spacing.xl, marginBottom: tokens.spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  statBox: {
    width: '48%', backgroundColor: colors.surface, padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: tokens.spacing.sm,
  },
  statLabel: { fontSize: tokens.typography.size.xs, color: colors.muted, marginBottom: 4 },
  statValue: { fontSize: tokens.typography.size.lg, fontFamily: tokens.typography.family.extrabold, color: colors.text },
  rankingCard: { backgroundColor: colors.surface, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: colors.border, padding: tokens.spacing.md },
  gcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: tokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  gcLeft: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  gcRank: { fontSize: tokens.typography.size.sm, fontFamily: tokens.typography.family.bold, color: colors.muted },
  gcName: { fontSize: tokens.typography.size.sm, fontFamily: tokens.typography.family.bold, color: colors.text },
  gcRight: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  classPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  classA: { backgroundColor: 'rgba(50,205,50,0.1)' },
  classB: { backgroundColor: 'rgba(255,165,0,0.1)' },
  classText: { fontSize: 10, fontFamily: tokens.typography.family.bold, color: colors.text },
  gcScore: { fontSize: tokens.typography.size.sm, color: colors.muted },
  adCard: { backgroundColor: 'rgba(65, 105, 225, 0.05)', borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: 'rgba(65, 105, 225, 0.2)', padding: tokens.spacing.md },
  adDesc: { fontSize: tokens.typography.size.sm, color: colors.text, marginBottom: tokens.spacing.sm, fontStyle: 'italic' },
  adItem: { fontSize: tokens.typography.size.sm, color: colors.accent, fontFamily: tokens.typography.family.bold, marginBottom: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: tokens.radius.full, padding: 4, marginBottom: tokens.spacing.lg, borderWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: tokens.radius.full },
  tabBtnActive: { backgroundColor: colors.accent },
  tabBtnText: { color: colors.muted, fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.sm },
  tabBtnTextActive: { color: isDark ? '#000' : '#fff' },
  approvalsContainer: { flex: 1 },
  emptyBox: { padding: tokens.spacing.xl, alignItems: 'center', backgroundColor: colors.surface, borderRadius: tokens.radius.lg },
  emptyIcon: { fontSize: 32, marginBottom: tokens.spacing.sm },
  emptyTitle: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.bold, color: colors.text },
  emptySub: { fontSize: tokens.typography.size.xs, color: colors.muted },
  approvalCard: { backgroundColor: colors.surface, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: colors.border, padding: tokens.spacing.md, marginBottom: tokens.spacing.md },
  approvalCategory: { fontSize: tokens.typography.size.base, fontFamily: tokens.typography.family.bold, color: colors.text },
  approvalLocation: { fontSize: tokens.typography.size.xs, color: colors.muted, marginBottom: tokens.spacing.md },
  imagesRow: { flexDirection: 'row', gap: tokens.spacing.sm, marginBottom: tokens.spacing.md },
  imageCol: { flex: 1 },
  imageLabel: { fontSize: tokens.typography.size.xs, fontFamily: tokens.typography.family.bold, color: colors.muted, marginBottom: 4, textAlign: 'center' },
  reviewImg: { width: '100%', height: 120, borderRadius: tokens.radius.md, backgroundColor: '#eee' },
  noImgBox: { width: '100%', height: 120, borderRadius: tokens.radius.md, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  noImgText: { fontSize: tokens.typography.size.xs, color: colors.muted },
  approvalActions: { flexDirection: 'row', gap: tokens.spacing.sm },
  approveBtn: { flex: 1, backgroundColor: 'rgba(50,205,50,0.15)', paddingVertical: 10, borderRadius: tokens.radius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(50,205,50,0.5)' },
  approveBtnText: { color: '#2e8b57', fontFamily: tokens.typography.family.bold },
  rejectBtn: { flex: 1, backgroundColor: 'rgba(255,68,68,0.15)', paddingVertical: 10, borderRadius: tokens.radius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,68,68,0.5)' },
  rejectBtnText: { color: '#ff4444', fontFamily: tokens.typography.family.bold },
});
