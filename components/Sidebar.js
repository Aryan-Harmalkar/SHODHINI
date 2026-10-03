import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';

export default function Sidebar({
  visible,
  onClose,
  currentScreen,
  onNavigate,
  user,
  ecoPoints = 0,
  onLogout,
}) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop to tap to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Sidebar Drawer */}
        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.appTitle}>SHODHINI</Text>
              <Text style={styles.userGreeting}>
                Hello, {user?.name || 'Citizen'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Eco Points preview in sidebar */}
          <View style={styles.ecoPointsBox}>
            <Text style={styles.ecoPointsLabel}>🌱 Eco Points</Text>
            <Text style={styles.ecoPointsVal}>{ecoPoints} pts</Text>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {/* 1. Home */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentScreen === 'home' && styles.activeMenuItem,
              ]}
              onPress={() => {
                onNavigate('home');
                onClose();
              }}
            >
              <Text style={styles.menuIcon}>🏠</Text>
              <Text
                style={[
                  styles.menuText,
                  currentScreen === 'home' && styles.activeMenuText,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>

            {/* 2. File a Complaint */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentScreen === 'complaint' && styles.activeMenuItem,
              ]}
              onPress={() => {
                onNavigate('complaint');
                onClose();
              }}
            >
              <Text style={styles.menuIcon}>📝</Text>
              <Text
                style={[
                  styles.menuText,
                  currentScreen === 'complaint' && styles.activeMenuText,
                ]}
              >
                File a Complaint
              </Text>
            </TouchableOpacity>

            {/* 3. Complaints & Details (Track Status) */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentScreen === 'my_complaints' && styles.activeMenuItem,
              ]}
              onPress={() => {
                onNavigate('my_complaints');
                onClose();
              }}
            >
              <Text style={styles.menuIcon}>📋</Text>
              <Text
                style={[
                  styles.menuText,
                  currentScreen === 'my_complaints' && styles.activeMenuText,
                ]}
              >
                Complaints & Details
              </Text>
            </TouchableOpacity>

            {/* 4. Request Waste Pickup (Paid Doorstep Delivery/Collection) */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentScreen === 'waste_pickup' && styles.activeMenuItem,
              ]}
              onPress={() => {
                onNavigate('waste_pickup');
                onClose();
              }}
            >
              <Text style={styles.menuIcon}>🚚</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text
                    style={[
                      styles.menuText,
                      currentScreen === 'waste_pickup' && styles.activeMenuText,
                    ]}
                  >
                    Request Waste Pickup
                  </Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidPillText}>PAID</Text>
                  </View>
                </View>
                <Text style={styles.menuItemSub}>For areas without dustbins</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Recycle (E-Waste, Metal & more) */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                currentScreen === 'recycle' && styles.activeMenuItem,
              ]}
              onPress={() => {
                onNavigate('recycle');
                onClose();
              }}
            >
              <Text style={styles.menuIcon}>♻️</Text>
              <View style={styles.menuItemCol}>
                <View style={styles.menuItemRow}>
                  <Text
                    style={[
                      styles.menuText,
                      currentScreen === 'recycle' && styles.activeMenuText,
                    ]}
                  >
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

          {/* Bottom Only Logout Option */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <Text style={styles.logoutText}>🚪 Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 18,
    backgroundColor: '#2e7d32',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  userGreeting: {
    fontSize: 14,
    color: '#c8e6c9',
    marginTop: 4,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ecoPointsBox: {
    backgroundColor: '#e8f5e9',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  ecoPointsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  ecoPointsVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b5e20',
  },
  menuList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  activeMenuItem: {
    backgroundColor: '#e8f5e9',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemCol: {
    flex: 1,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  activeMenuText: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  paidPill: {
    backgroundColor: '#ffecb3',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  paidPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f57f17',
  },
  ecoPill: {
    backgroundColor: '#c8e6c9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  ecoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1b5e20',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  logoutBtn: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#c62828',
    fontSize: 15,
    fontWeight: '700',
  },
});
