import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { tokens } from '../lib/theme';

export default function ComplaintCard({ item, updatingId, onUpdateStatus }) {
  const isCompleted = item.status === 'Completed';
  const isInProgress = item.status === 'In Progress';
  const isAssigned = item.status === 'Assigned';
  const isUpdating = updatingId === item.id;

  const getStatusColor = () => {
    if (isCompleted) return tokens.colors.accent;
    if (isInProgress) return '#f59e0b'; // amber
    return tokens.colors.muted;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.category}>{item.category || 'General Waste'}</Text>
          <Text style={styles.date}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : 'Just now'}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {item.status || 'Submitted'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaKey}>📍 Location:</Text>
        <Text style={styles.metaVal}>{item.location}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaKey}>👤 Citizen:</Text>
        <Text style={styles.metaVal}>
          {item.citizenName} {item.citizenPhone ? `(${item.citizenPhone})` : ''}
        </Text>
      </View>

      <View style={styles.divider} />
      <Text style={styles.actionLabel}>Update Status:</Text>

      <View style={styles.actionGroup}>
        <TouchableOpacity
          style={[styles.pill, isAssigned && styles.pillActive]}
          disabled={isUpdating || isAssigned || isCompleted}
          onPress={() => onUpdateStatus(item.id, 'Assigned')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillLabel, isAssigned && styles.pillLabelActive]}>
            📌 Assigned
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, isInProgress && styles.pillActive]}
          disabled={isUpdating || isInProgress || isCompleted}
          onPress={() => onUpdateStatus(item.id, 'In Progress')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillLabel, isInProgress && styles.pillLabelActive]}>
            ⏳ In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, isCompleted && styles.pillCompletedActive]}
          disabled={isUpdating || isCompleted}
          onPress={() => onUpdateStatus(item.id, 'Completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillLabel, isCompleted && styles.pillLabelCompletedActive]}>
            {isCompleted ? '✓ Completed' : '✅ Mark Done'}
          </Text>
        </TouchableOpacity>
      </View>

      {isUpdating && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color={tokens.colors.accent} />
          <Text style={styles.overlayText}>Updating...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    ...tokens.shadow.md,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  category: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  date: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.full,
    marginLeft: tokens.spacing.sm,
  },
  badgeText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
  },
  description: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.xs,
  },
  metaKey: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    width: 90,
  },
  metaVal: {
    flex: 1,
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.weight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: tokens.spacing.md,
  },
  actionLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    textTransform: 'uppercase',
    fontWeight: tokens.typography.weight.semibold,
    marginBottom: tokens.spacing.sm,
  },
  actionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  pill: {
    flex: 1,
    minWidth: 90,
    minHeight: 44,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.xs,
  },
  pillActive: {
    backgroundColor: tokens.colors.accent + '15',
    borderColor: tokens.colors.accent,
  },
  pillCompletedActive: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  pillLabel: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.semibold,
  },
  pillLabelActive: {
    color: tokens.colors.accent,
  },
  pillLabelCompletedActive: {
    color: tokens.colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  overlayText: {
    marginLeft: tokens.spacing.sm,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
});
