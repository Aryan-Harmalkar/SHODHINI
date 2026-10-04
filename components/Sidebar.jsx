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
  ecoPoints,
  onLogout,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.appTitle}>SHODHINI</Text>
              <Text style={styles.userGreeting}>Hello, {user?.name || 'Citizen'}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ecoPointsBox}>
            <Text style={styles.ecoPointsLabel}>🌱 Eco Points</Text>
            <Text style={styles.ecoPointsVal}>{ecoPoints} pts</Text>
          </View>

          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.menuIcon}>📝</Text>
              <Text style={[styles.menuText, currentScreen === 'complaint' && styles.activeMenuText]}>File a Complaint</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'my_complaints' && styles.activeMenuItem]}
              onPress={() => { onNavigate('my_complaints'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={[styles.menuText, currentScreen === 'my_complaints' && styles.activeMenuText]}>Complaints & Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'waste_pickup' && styles.activeMenuItem]}
              onPress={() => { onNavigate('waste_pickup'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🚚</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'waste_pickup' && styles.activeMenuText]}>Request Waste Pickup</Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidPillText}>PAID</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>For areas without dustbins</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, currentScreen === 'recycle' && styles.activeMenuItem]}
              onPress={() => { onNavigate('recycle'); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>♻️</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text style={[styles.menuText, currentScreen === 'recycle' && styles.activeMenuText]}>Recycle & Scrap</Text>
                  <View style={styles.ecoPill}>
                    <Text style={styles.ecoPillText}>+PTS</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>E-waste, metal, paper & plastics</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

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
    width: '80%',
    maxWidth: 320,
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
  },
  ecoPointsLabel: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.accent,
  },
  ecoPointsVal: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    minHeight: 48,
  },
  activeMenuItem: {
    backgroundColor: tokens.colors.accent + '10',
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
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
    marginTop: 2,
  },
  paidPill: {
    backgroundColor: tokens.colors.surface,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.sm,
  },
  paidPillText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.muted,
  },
  ecoPill: {
    backgroundColor: tokens.colors.accent + '20',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: tokens.radius.sm,
  },
  ecoPillText: {
    fontSize: 10,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
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
