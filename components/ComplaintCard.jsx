import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { tokens } from '../lib/theme';

export default function ComplaintCard({ item, updatingId, onUpdateStatus }) {
  const isCompleted = item.status === 'Completed';
  const isInProgress = item.status === 'In Progress' || item.status === 'Assigned';
  const isUpdating = updatingId === item.id;

  const getStatusColor = () => {
    if (isCompleted) return tokens.colors.accent;
    if (isInProgress) return '#d97706';
    return '#0284c7';
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

        <View style={[styles.badge, { backgroundColor: getStatusColor() + '15' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {item.status || 'Submitted'}
          </Text>
        </View>
      </View>

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
              onPress={() => onUpdateStatus(item.id, 'Completed')}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.doneBtnText}>✅ Mark Cleaned & Done</Text>
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
          <ActivityIndicator size="small" color={tokens.colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
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
    color: tokens.colors.text,
  },
  date: {
    fontSize: 10,
    color: tokens.colors.muted,
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
  description: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
    lineHeight: 18,
  },
  metaRow: {
    marginBottom: 2,
  },
  metaVal: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
  },
  actionRow: {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.xs,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.accent,
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
    backgroundColor: tokens.colors.accent,
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
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
