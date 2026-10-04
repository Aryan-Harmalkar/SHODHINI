import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
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
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.drawer}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.appTitle}>SHODHINI</Text>
              <Text style={styles.userGreeting}>Hello, {user?.name || 'Citizen'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Eco Points Highlight in Sidebar */}
          <TouchableOpacity
            style={styles.ecoPointsBox}
            activeOpacity={0.8}
            onPress={() => {
              onNavigate('rewards');
              onClose();
            }}
          >
            <View>
              <Text style={styles.ecoPointsLabel}>🌱 Eco Points</Text>
              <Text style={styles.ecoPointsSub}>Tap to redeem rewards</Text>
            </View>
            <Text style={styles.ecoPointsVal}>{ecoPoints} pts →</Text>
          </TouchableOpacity>

          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {/* 1. Home */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'home' && styles.activeMenuItem]}
              onPress={() => { onNavigate('home'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🏠</Text>
              <Text style={[styles.menuText, currentScreen === 'home' && styles.activeMenuText]}>Home</Text>
            </TouchableOpacity>

            {/* 2. File a Complaint */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'complaint' && styles.activeMenuItem]}
              onPress={() => { onNavigate('complaint'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>📝</Text>
              <View style={styles.menuItemCol}>
                <Text style={[styles.menuText, currentScreen === 'complaint' && styles.activeMenuText]}>
                  File a Complaint
                </Text>
                <Text style={styles.menuItemSub}>Report waste hotspots in your ward</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Complaints & Details (Track Status) */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'my_complaints' && styles.activeMenuItem]}
              onPress={() => { onNavigate('my_complaints'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>📋</Text>
              <View style={styles.menuItemCol}>
                <Text style={[styles.menuText, currentScreen === 'my_complaints' && styles.activeMenuText]}>
                  My Complaints & Status
                </Text>
                <Text style={styles.menuItemSub}>Live tracking & points earned</Text>
              </View>
            </TouchableOpacity>

            {/* 4. Request Garbage Collector (Doorstep Pickup) */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'waste_pickup' && styles.activeMenuItem]}
              onPress={() => { onNavigate('waste_pickup'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🚚</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'waste_pickup' && styles.activeMenuText]}>
                    Request Garbage Collector
                  </Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidPillText}>DOORSTEP</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>Direct collection for areas without bins</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Scoreboard & Leaderboard */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'scoreboard' && styles.activeMenuItem]}
              onPress={() => { onNavigate('scoreboard'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🏆</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'scoreboard' && styles.activeMenuText]}>
                    Scoreboard & Rankings
                  </Text>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>RANKS</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>Citywide Champions & Ward rankings</Text>
              </View>
            </TouchableOpacity>

            {/* 6. Rewards Hub: Redeem Points & Coupons */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'rewards' && styles.activeMenuItem]}
              onPress={() => { onNavigate('rewards'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🎁</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'rewards' && styles.activeMenuText]}>
                    Rewards & Coupons
                  </Text>
                  <View style={styles.ecoPill}>
                    <Text style={styles.ecoPillText}>REDEEM</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>Redeem points, coupons & points earned</Text>
              </View>
            </TouchableOpacity>

            {/* Sub-menu items for Rewards: Redeem points, Use coupons, Points earned */}
            <View style={styles.subMenuList}>
              <TouchableOpacity
                style={styles.subMenuItem}
                onPress={() => { onNavigate('rewards_redeem'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.subMenuBullet}>↳</Text>
                <Text style={styles.subMenuText}>Redeem Points</Text>
                <Text style={styles.subMenuTag}>Catalog</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subMenuItem}
                onPress={() => { onNavigate('rewards_coupons'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.subMenuBullet}>↳</Text>
                <Text style={styles.subMenuText}>Use Coupons / Earned</Text>
                <Text style={styles.subMenuTag}>Codes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.subMenuItem}
                onPress={() => { onNavigate('rewards_history'); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.subMenuBullet}>↳</Text>
                <Text style={styles.subMenuText}>Points Earned</Text>
                <Text style={styles.subMenuTag}>History</Text>
              </TouchableOpacity>
            </View>

            {/* 7. Recycle & Scrap */}
            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'recycle' && styles.activeMenuItem]}
              onPress={() => { onNavigate('recycle'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>♻️</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'recycle' && styles.activeMenuText]}>
                    Recycle & Scrap
                  </Text>
                  <View style={styles.ecoPill}>
                    <Text style={styles.ecoPillText}>+PTS</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>E-waste, metal, paper & plastics</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Logout Button */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => { onClose(); onLogout(); }} activeOpacity={0.7}>
              <Text style={styles.logoutText}>🚪 Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  drawer: {
    width: '85%',
    maxWidth: 330,
    backgroundColor: tokens.colors.background,
    height: '100%',
    ...tokens.shadow.md,
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingTop: tokens.spacing.xxl,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appTitle: {
    fontSize: tokens.typography.size.xl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.background,
    letterSpacing: 0.5,
  },
  userGreeting: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.background,
    opacity: 0.9,
    marginTop: tokens.spacing.xs,
    fontWeight: tokens.typography.weight.medium,
  },
  closeBtn: {
    padding: tokens.spacing.xs,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: tokens.colors.background,
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
  },
  ecoPointsBox: {
    backgroundColor: tokens.colors.background,
    margin: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderFocus,
    ...tokens.shadow.sm,
  },
  ecoPointsLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.accent,
  },
  ecoPointsSub: {
    fontSize: 10,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  ecoPointsVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    minHeight: 52,
  },
  activeMenuItem: {
    backgroundColor: tokens.colors.accent + '15',
  },
  menuIcon: {
    fontSize: tokens.typography.size.lg,
    marginRight: tokens.spacing.md,
  },
  menuItemCol: { flex: 1 },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
  },
  activeMenuText: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  menuItemSub: {
    fontSize: 11,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  paidPill: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.sm,
  },
  paidPillText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.muted,
  },
  rankPill: {
    backgroundColor: '#fef3c7',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.sm,
  },
  rankPillText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
    color: '#d97706',
  },
  ecoPill: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.sm,
  },
  ecoPillText: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  subMenuList: {
    marginLeft: 38,
    marginRight: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
    paddingLeft: tokens.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: tokens.colors.border,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  subMenuBullet: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.accent,
    marginRight: 6,
    fontWeight: tokens.typography.weight.bold,
  },
  subMenuText: {
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.text,
    flex: 1,
  },
  subMenuTag: {
    fontSize: 9,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.muted,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
  },
  logoutBtn: {
    backgroundColor: tokens.colors.danger + '10',
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  logoutText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
  },
});
