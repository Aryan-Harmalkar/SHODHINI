import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';

export default function HomeScreen({ user, onLogout }) {
  const handleReportWaste = () => {
    Alert.alert('Report Waste', 'Report feature will be added in Step 3.');
  };

  const isCollector = user?.role === 'worker';

  return (
    <View style={styles.container}>
      {/* Top Bar / Logout */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>SHODHINI</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* User Profile Card */}
        {user ? (
          <View style={styles.userCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, isCollector ? styles.collectorBadge : styles.citizenBadge]}>
                <Text style={styles.roleBadgeText}>
                  {isCollector ? 'Garbage Collector' : 'Citizen / User'}
                </Text>
              </View>
            </View>

            <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username/Email:</Text>
              <Text style={styles.infoValue}>{user.identifier}</Text>
            </View>

            {isCollector && user.area ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Operating Area:</Text>
                <Text style={styles.infoValue}>{user.area}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Action Section */}
        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>
            {isCollector
              ? 'View tasks and manage collection in your area (Coming soon)'
              : 'Report unattended waste or overflowing bins'}
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleReportWaste}>
            <Text style={styles.buttonText}>Report waste</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2e7d32',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c62828',
  },
  logoutBtnText: {
    color: '#c62828',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  citizenBadge: {
    backgroundColor: '#e8f5e9',
  },
  collectorBadge: {
    backgroundColor: '#fff3e0',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e7d32',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b5e20',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    width: 130,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#222',
    fontWeight: '600',
    flex: 1,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
