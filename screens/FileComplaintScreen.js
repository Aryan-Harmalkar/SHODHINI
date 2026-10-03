import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function FileComplaintScreen({ onBackToHome, onOpenSidebar }) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>File a Complaint</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Report Waste & File Complaint</Text>
          <Text style={styles.cardDesc}>
            This screen will allow citizens to categorize waste, describe the issue, capture photos, and provide location coordinates.
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming up in Step 3</Text>
          </View>

          <TouchableOpacity style={styles.homeBtn} onPress={onBackToHome}>
            <Text style={styles.homeBtnText}>← Back to Home</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 22,
    color: '#2e7d32',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#fff3e0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  badgeText: {
    color: '#e65100',
    fontWeight: '600',
    fontSize: 13,
  },
  homeBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  homeBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
