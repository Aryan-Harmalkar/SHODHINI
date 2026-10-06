import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { tokens, useTheme } from '../lib/theme';

export default function Sidebar({
  visible,
  onClose,
  currentScreen,
  onNavigate,
  user,
  ecoPoints = 0,
  onLogout,
  isCollector = false,
  isDutyOnline = true,
  onToggleDuty,
  isDesktopStatic = false,
}) {
  const isWorker = isCollector || user?.role === 'worker';
  const [slideAnim] = useState(() => new Animated.Value(-290));
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const { isDark, colors, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const drawerContent = (
    <>
        {/* Minimal Drawer Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/leaf-icon.png')}
              style={styles.drawerLogo}
              resizeMode="contain"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userRole}>
                {isWorker ? 'Sanitation Worker' : 'Citizen'}
              </Text>
            </View>
          </View>
          {!isDesktopStatic && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Status / Points Strip */}
        {isWorker ? (
          <TouchableOpacity
            style={[
              styles.workerStatusStrip,
              isDutyOnline ? styles.workerStatusStripOnline : styles.workerStatusStripOffline,
            ]}
            onPress={onToggleDuty}
            activeOpacity={0.7}
          >
            <View style={[styles.dutyDot, isDutyOnline ? styles.dutyDotOnline : styles.dutyDotOffline]} />
            <Text style={[styles.workerStatusText, isDutyOnline ? styles.workerStatusTextOnline : styles.workerStatusTextOffline]}>
              {isDutyOnline ? '🟢 On Duty (Online)' : '⚪ Off Duty (Offline)'}
            </Text>
            {onToggleDuty && (
              <View style={styles.dutyPillMini}>
                <Text style={styles.dutySwitchHint}>{isDutyOnline ? 'Go Off' : 'Go On'}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ecoPointsStrip}
            activeOpacity={0.7}
            onPress={() => {
              onNavigate('waste_pickup');
              onClose();
            }}
          >
            <Text style={styles.ecoPointsText}>🌱 {ecoPoints} Eco Points</Text>
            <Text style={styles.ecoPointsArrow}>Use for Pickup →</Text>
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
                style={[styles.menuItem, currentScreen === 'collector_tasks' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_tasks_available'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🗑️</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_tasks' && styles.activeMenuText]}>
                  Public Waste Tasks
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'collector_pickups' && styles.activeMenuItem]}
                onPress={() => { onNavigate('collector_pickups'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>🚚</Text>
                <Text style={[styles.menuText, currentScreen === 'collector_pickups' && styles.activeMenuText]}>
                  Doorstep Pickups
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'supervisor_dashboard' && styles.activeMenuItem]}
                onPress={() => { onNavigate('supervisor_dashboard'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📈</Text>
                <Text style={[styles.menuText, currentScreen === 'supervisor_dashboard' && styles.activeMenuText]}>
                  ROI Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'training' && styles.activeMenuItem]}
                onPress={() => { onNavigate('training'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📚</Text>
                <Text style={[styles.menuText, currentScreen === 'training' && styles.activeMenuText]}>
                  Training Hub
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
                style={[styles.menuItem, currentScreen === 'supervisor_dashboard' && styles.activeMenuItem]}
                onPress={() => { onNavigate('supervisor_dashboard'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📈</Text>
                <Text style={[styles.menuText, currentScreen === 'supervisor_dashboard' && styles.activeMenuText]}>
                  ROI Dashboard
                </Text>
              </TouchableOpacity>



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

              {/* <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'recycle' && styles.activeMenuItem]}
                onPress={() => { onNavigate('recycle'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>♻️</Text>
                <Text style={[styles.menuText, currentScreen === 'recycle' && styles.activeMenuText]}>
                  Scrap Recycling
                </Text>
              </TouchableOpacity> */}
            </>
          )}
        </ScrollView>

        {/* Theme Mode Toggle Row */}
        <View style={styles.themeRow}>
          <Text style={styles.themeLabel}>
            {isDark ? '🌙 Dark Mode' : '☀️ Day Mode'}
          </Text>
          <TouchableOpacity
            style={styles.themeToggleBtn}
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityLabel={isDark ? "Switch to Day Mode" : "Switch to Dark Mode"}
          >
            <View
              style={[
                styles.themeTogglePill,
                !isDark && styles.themeTogglePillActiveLight,
              ]}
            >
              <Text style={styles.themePillIcon}>☀️</Text>
            </View>
            <View
              style={[
                styles.themeTogglePill,
                isDark && styles.themeTogglePillActiveDark,
              ]}
            >
              <Text style={styles.themePillIcon}>🌙</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Minimal Drawer Footer */}
        <View style={styles.drawerFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { onClose(); onLogout(); }} activeOpacity={0.7}>
            <Text style={styles.logoutText}>🚪 Log Out</Text>
          </TouchableOpacity>
        </View>
    </>
  );

  if (isDesktopStatic) {
    return (
      <View style={[styles.drawer, { width: '100%' }]}>
        {drawerContent}
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {drawerContent}
      </Animated.View>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
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
    backgroundColor: colors.surface,
    height: '100%',
    paddingTop: 16,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...tokens.shadow.md,
    zIndex: 10000,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: tokens.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: tokens.spacing.xs,
  },
  drawerLogo: {
    width: 32,
    height: 32,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: colors.text,
  },
  userRole: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
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
    color: colors.muted,
  },
  workerStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.sm,
    borderWidth: 1,
  },
  workerStatusStripOnline: {
    backgroundColor: isDark ? 'rgba(34,197,94,0.16)' : '#ecfdf5',
    borderColor: isDark ? 'rgba(34,197,94,0.35)' : '#a7f3d0',
  },
  workerStatusStripOffline: {
    backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9',
    borderColor: isDark ? 'rgba(148,163,184,0.25)' : '#cbd5e1',
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dutyDotOnline: {
    backgroundColor: '#22c55e',
  },
  dutyDotOffline: {
    backgroundColor: isDark ? '#94a3b8' : '#64748b',
  },
  workerStatusText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    flex: 1,
  },
  workerStatusTextOnline: {
    color: isDark ? '#4ade80' : '#15803d',
  },
  workerStatusTextOffline: {
    color: colors.muted,
  },
  dutyPillMini: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  dutySwitchHint: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  ecoPointsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accent + '20',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.sm,
  },
  ecoPointsText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.bold,
    color: colors.accent,
  },
  ecoPointsArrow: {
    fontSize: tokens.typography.size.xs,
    color: colors.accent,
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
    backgroundColor: colors.accent + (isDark ? '25' : '15'),
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
    color: colors.text,
  },
  activeMenuText: {
    color: colors.accent,
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
    color: colors.muted,
    marginRight: tokens.spacing.xs,
  },
  subMenuText: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
    fontWeight: tokens.typography.weight.medium,
  },
  drawerFooter: {
    paddingTop: tokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: tokens.spacing.xs,
  },
  themeLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: colors.text,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
  },
  themeTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTogglePillActiveLight: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  themeTogglePillActiveDark: {
    backgroundColor: '#090d16',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  themePillIcon: {
    fontSize: 12,
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
    color: colors.danger,
  },
});
