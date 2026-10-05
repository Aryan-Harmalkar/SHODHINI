import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function ComplaintCard({ item, updatingId, onUpdateStatus, onVerifyCleanup }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const isCompleted = item.status === 'Completed';
  const isInProgress = item.status === 'In Progress' || item.status === 'Assigned';
  const isUpdating = updatingId === item.id;
  const isAdminReview =
    item.status === 'Pending Admin' ||
    Boolean(item.description && item.description.includes('[PENDING ADMIN CROSS-VERIFICATION'));

  const getStatusColor = () => {
    if (isCompleted) return colors.accent;
    if (isAdminReview || isInProgress) return isDark ? '#fbbf24' : '#d97706';
    return isDark ? '#38bdf8' : '#0284c7';
  };

  const getStatusLabel = () => {
    if (isCompleted) return 'Completed';
    if (isAdminReview) return '🛡️ Admin Review';
    if (isInProgress) return 'In Progress';
    return item.status || 'Submitted';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.category}>{item.category || 'General Waste'}</Text>
          <Text style={styles.date}>
            {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: getStatusColor() + (isDark ? '25' : '15') }]}>
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      {isAdminReview && (
        <View style={styles.adminReviewBanner}>
          <Text style={styles.adminReviewBannerText}>
            🛡️ Low AI confidence (&lt;20%). Held for Municipal Admin cross-verification.
          </Text>
        </View>
      )}

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaVal}>📍 {item.location}</Text>
      </View>

      {item.citizenName && (
        <View style={styles.metaRow}>
          <Text style={styles.metaVal}>
            👤 {item.citizenName} {item.citizenPhone ? `(${item.citizenPhone})` : ''}
          </Text>
        </View>
      )}

      {/* Contextual Single Action Button */}
      {!isCompleted ? (
        <View style={styles.actionRow}>
          {!isInProgress ? (
            <TouchableOpacity
              style={[styles.primaryBtn, isUpdating && styles.btnDisabled]}
              disabled={isUpdating}
              onPress={() => onUpdateStatus(item.id, 'In Progress')}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
              ) : (
                <Text style={styles.primaryBtnText}>Accept Job</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.doneBtn, isUpdating && styles.btnDisabled]}
              disabled={isUpdating}
              onPress={() => {
                if (onVerifyCleanup) {
                  onVerifyCleanup(item);
                } else {
                  onUpdateStatus(item.id, 'Completed');
                }
              }}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
              ) : (
                <Text style={styles.doneBtnText}>📸 Verify Cleanup</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.completedBadgeRow}>
          <Text style={styles.completedBadgeText}>✓ Resolved & Cleared</Text>
        </View>
      )}

      {isUpdating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const getStyles = (colors, isDark) =>
  StyleSheet.create({
    card: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
      borderRadius: tokens.radius.xl,
      padding: 6,
      marginBottom: tokens.spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.sm,
      borderTopLeftRadius: tokens.radius.lg,
      borderTopRightRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      paddingBottom: tokens.spacing.xs,
    },
    headerText: {
      flex: 1,
    },
    category: {
      fontSize: tokens.typography.size.base,
      fontFamily: tokens.typography.family.bold,
      color: colors.text,
      letterSpacing: -0.5,
    },
    date: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
      fontFamily: tokens.typography.family.medium,
    },
    badge: {
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
    },
    badgeText: {
      fontSize: 10,
      fontFamily: tokens.typography.family.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    adminReviewBanner: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: 10,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    adminReviewBannerText: {
      fontSize: 11,
      color: isDark ? '#fcd34d' : '#92400e',
      fontFamily: tokens.typography.family.medium,
    },
    description: {
      fontSize: tokens.typography.size.sm,
      color: colors.textSecondary,
      marginBottom: tokens.spacing.sm,
      lineHeight: 20,
      paddingHorizontal: tokens.spacing.md,
    },
    metaRow: {
      marginBottom: tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.md,
    },
    metaVal: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
      fontFamily: tokens.typography.family.medium,
    },
    actionRow: {
      paddingTop: tokens.spacing.sm,
      borderBottomLeftRadius: tokens.radius.lg,
      borderBottomRightRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: isDark ? '#000' : '#ffffff',
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      letterSpacing: 0.5,
    },
    doneBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBtnText: {
      color: isDark ? '#000' : '#ffffff',
      fontSize: tokens.typography.size.sm,
      fontFamily: tokens.typography.family.bold,
      letterSpacing: 0.5,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    completedBadgeRow: {
      paddingTop: tokens.spacing.xs,
      borderBottomLeftRadius: tokens.radius.lg,
      borderBottomRightRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
    },
    completedBadgeText: {
      fontSize: tokens.typography.size.sm,
      color: colors.accent,
      fontFamily: tokens.typography.family.bold,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(5, 5, 5, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: tokens.radius.xl,
    },
  });
