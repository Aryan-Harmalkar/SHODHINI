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
                <ActivityIndicator size="small" color="#ffffff" />
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
                <ActivityIndicator size="small" color="#ffffff" />
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
      backgroundColor: colors.card,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      marginBottom: tokens.spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: tokens.spacing.xs,
    },
    headerText: {
      flex: 1,
    },
    category: {
      fontSize: tokens.typography.size.sm,
      fontWeight: tokens.typography.weight.bold,
      color: colors.text,
    },
    date: {
      fontSize: 10,
      color: colors.muted,
      marginTop: 1,
    },
    badge: {
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: 3,
      borderRadius: tokens.radius.full,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: tokens.typography.weight.bold,
    },
    adminReviewBanner: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
      borderRadius: tokens.radius.sm,
      padding: 6,
      marginBottom: tokens.spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    adminReviewBannerText: {
      fontSize: 10,
      color: isDark ? '#fcd34d' : '#92400e',
      fontWeight: tokens.typography.weight.medium,
    },
    description: {
      fontSize: tokens.typography.size.xs,
      color: colors.text,
      marginBottom: tokens.spacing.sm,
      lineHeight: 18,
    },
    metaRow: {
      marginBottom: 2,
    },
    metaVal: {
      fontSize: tokens.typography.size.xs,
      color: colors.muted,
    },
    actionRow: {
      marginTop: tokens.spacing.sm,
      paddingTop: tokens.spacing.xs,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 8,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      color: '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    doneBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 8,
      borderRadius: tokens.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBtnText: {
      color: '#ffffff',
      fontSize: tokens.typography.size.xs,
      fontWeight: tokens.typography.weight.bold,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    completedBadgeRow: {
      marginTop: tokens.spacing.xs,
      paddingTop: tokens.spacing.xs,
    },
    completedBadgeText: {
      fontSize: 11,
      color: colors.accent,
      fontWeight: tokens.typography.weight.semibold,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
