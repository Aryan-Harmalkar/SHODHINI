import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { tokens } from '../lib/theme';

export default function Sidebar({
  visible,
  onClose,
  currentScreen,
  onNavigate,
  user,
  ecoPoints = 0,
  onLogout,
  isCollector = false,
}) {
  const isWorker = isCollector || user?.role === 'worker';
  const slideAnim = useRef(new Animated.Value(-290)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-290);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Drawer Content — Strictly contained inside the mobile frame */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Minimal Drawer Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userRole}>
              {isWorker ? 'Sanitation Worker' : 'Citizen'} • {user?.area || (user?.area_id ? `Ward ${user.area_id}` : 'Ward 1')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Status / Points Strip */}
        {isWorker ? (
          <View style={styles.workerStatusStrip}>
            <View style={styles.dutyDot} />
            <Text style={styles.workerStatusText}>Active Duty • {user?.area || 'Ward 1'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.ecoPointsStrip}
            activeOpacity={0.7}
            onPress={() => {
              onNavigate('rewards');
              onClose();
            }}
          >
            <Text style={styles.ecoPointsText}>🌱 {ecoPoints} Eco Points</Text>
            <Text style={styles.ecoPointsArrow}>Redeem →</Text>
          </TouchableOpacity>
        )}

        {/* Menu Items List */}
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {isWorker ? (
            /* COLLECTOR MENU */
            <>
              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'home' && styles.activeMenuItem]}
                onPress={() => { onNavigate('home'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🏠</Text>
                <Text style={[styles.menuText, currentScreen === 'home' && styles.activeMenuText]}>
                  Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'collector_tasks_available' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_tasks_available'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🔔</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_tasks_available' && styles.activeMenuText]}>
                  Tasks Available
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'collector_tasks_pending' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_tasks_pending'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>⏳</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_tasks_pending' && styles.activeMenuText]}>
                  Pending Tasks
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'collector_track_location' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_track_location'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📍</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_track_location' && styles.activeMenuText]}>
                  Track Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'collector_tasks_completed' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_tasks_completed'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>✅</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_tasks_completed' && styles.activeMenuText]}>
                  Completed Tasks
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'scoreboard' && styles.activeMenuItem]}
                onPress={() => { onNavigate('scoreboard'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🏆</Text>
                <Text style={[styles.menuText, currentScreen === 'scoreboard' && styles.activeMenuText]}>
                  Ward Scoreboard
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* CITIZEN MENU */
            <>
              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'home' && styles.activeMenuItem]}
                onPress={() => { onNavigate('home'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🏠</Text>
                <Text style={[styles.menuText, currentScreen === 'home' && styles.activeMenuText]}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'complaint' && styles.activeMenuItem]}
                onPress={() => { onNavigate('complaint'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📸</Text>
                <Text style={[styles.menuText, currentScreen === 'complaint' && styles.activeMenuText]}>
                  Report Waste
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'my_complaints' && styles.activeMenuItem]}
                onPress={() => { onNavigate('my_complaints'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📋</Text>
                <Text style={[styles.menuText, currentScreen === 'my_complaints' && styles.activeMenuText]}>
                  My Complaints
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'scoreboard' && styles.activeMenuItem]}
                onPress={() => { onNavigate('scoreboard'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🏆</Text>
                <Text style={[styles.menuText, currentScreen === 'scoreboard' && styles.activeMenuText]}>
                  Scoreboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, (currentScreen === 'rewards' || currentScreen.startsWith('rewards_')) && styles.activeMenuItem]}
                onPress={() => { onNavigate('rewards'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🎁</Text>
                <Text style={[styles.menuText, (currentScreen === 'rewards' || currentScreen.startsWith('rewards_')) && styles.activeMenuText]}>
                  Rewards & Coupons
                </Text>
              </TouchableOpacity>

              {/* Indented Sub-items */}
              <View style={styles.subMenuList}>
                <TouchableOpacity
                  style={styles.subMenuItem}
                  onPress={() => { onNavigate('rewards_redeem'); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subMenuDot}>•</Text>
                  <Text style={styles.subMenuText}>Redeem Points</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subMenuItem}
                  onPress={() => { onNavigate('rewards_coupons'); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subMenuDot}>•</Text>
                  <Text style={styles.subMenuText}>My Coupons</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subMenuItem}
                  onPress={() => { onNavigate('rewards_history'); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.subMenuDot}>•</Text>
                  <Text style={styles.subMenuText}>Points History</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'waste_pickup' && styles.activeMenuItem]}
                onPress={() => { onNavigate('waste_pickup'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🚚</Text>
                <Text style={[styles.menuText, currentScreen === 'waste_pickup' && styles.activeMenuText]}>
                  Doorstep Pickup
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'recycle' && styles.activeMenuItem]}
                onPress={() => { onNavigate('recycle'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>♻️</Text>
                <Text style={[styles.menuText, currentScreen === 'recycle' && styles.activeMenuText]}>
                  Scrap Recycling
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        {/* Minimal Drawer Footer */}
        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { onClose(); onLogout(); }} activeOpacity={0.7}>
            <Text style={styles.logoutText}>🚪 Log Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    width: '78%',
    maxWidth: 290,
    backgroundColor: tokens.colors.background,
    height: '100%',
    paddingTop: 16,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
    ...tokens.shadow.md,
    zIndex: 10000,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
  },
  userRole: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 1,
  },
  closeBtn: {
    padding: tokens.spacing.xs,
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: tokens.typography.size.base,
    color: tokens.colors.muted,
  },
  workerStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent + '10',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.sm,
  },
  dutyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.colors.accent,
    marginRight: 6,
  },
  workerStatusText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  ecoPointsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.accent + '10',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.sm,
  },
  ecoPointsText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.accent,
  },
  ecoPointsArrow: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.semibold,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    marginBottom: 2,
  },
  activeMenuItem: {
    backgroundColor: tokens.colors.accent + '15',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: tokens.spacing.sm,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.colors.text,
  },
  activeMenuText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  subMenuList: {
    paddingLeft: 34,
    marginBottom: 4,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.xs,
  },
  subMenuDot: {
    fontSize: tokens.typography.size.base,
    color: tokens.colors.muted,
    marginRight: tokens.spacing.xs,
  },
  subMenuText: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    fontWeight: tokens.typography.weight.medium,
  },
  drawerFooter: {
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
  },
  logoutText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.danger,
  },
});
