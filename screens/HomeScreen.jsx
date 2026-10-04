import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Sidebar from '../components/Sidebar';
import FileComplaintScreen from './FileComplaintScreen';
import MyComplaintsScreen from './MyComplaintsScreen';
import WastePickupScreen from './WastePickupScreen';
import RecycleScreen from './RecycleScreen';
import { getUserEcoPoints } from '../db/database';

export default function HomeScreen({ user, onLogout }) {
  // 'home' | 'complaint' | 'my_complaints' | 'waste_pickup' | 'recycle'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ecoPoints, setEcoPoints] = useState(0);

  const isCollector = user?.role === 'worker';

  useEffect(() => {
    if (user?.id && !isCollector) {
      loadEcoPoints();
    }
  }, [user, currentScreen]);

  const loadEcoPoints = async () => {
    try {
      const points = await getUserEcoPoints(user.id);
      setEcoPoints(points || 0);
    } catch (e) {
      console.error('Error fetching eco points:', e);
    }
  };

  // Screen Switcher for Citizen/User
  if (!isCollector) {
    if (currentScreen === 'complaint') {
      return (
        <>
          <FileComplaintScreen
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'my_complaints') {
      return (
        <>
          <MyComplaintsScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
            onGoToReport={() => setCurrentScreen('complaint')}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'waste_pickup') {
      return (
        <>
          <WastePickupScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }

    if (currentScreen === 'recycle') {
      return (
        <>
          <RecycleScreen
            user={user}
            onBackToHome={() => setCurrentScreen('home')}
            onOpenSidebar={() => setSidebarVisible(true)}
          />
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
            currentScreen={currentScreen}
            onNavigate={(screen) => setCurrentScreen(screen)}
            user={user}
            ecoPoints={ecoPoints}
            onLogout={onLogout}
          />
        </>
      );
    }
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar: Logout only in sidebar bottom for user */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          {!isCollector && (
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => setSidebarVisible(true)}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.appName}>SHODHINI</Text>
        </View>

        {/* Collector logout retained only for worker role */}
        {isCollector && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.roleBadge,
                isCollector ? styles.collectorBadge : styles.citizenBadge,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isCollector && { color: '#e65100' },
                ]}
              >
                {isCollector ? 'Garbage Collector' : 'Citizen / User'}
              </Text>
            </View>
          </View>

          <Text style={styles.welcomeText}>Welcome, {user?.name || 'User'}!</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username/Email:</Text>
            <Text style={styles.infoValue}>{user?.identifier || 'N/A'}</Text>
          </View>

          {isCollector && user?.area ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Operating Area:</Text>
              <Text style={styles.infoValue}>{user.area}</Text>
            </View>
          ) : null}
        </View>

        {/* Citizen-Only Sections */}
        {!isCollector && (
          <>
            {/* Eco Points Section */}
            <View style={styles.ecoPointsCard}>
              <View style={styles.ecoHeaderRow}>
                <View>
                  <Text style={styles.ecoTitle}>🌱 Your Eco Points</Text>
                  <Text style={styles.ecoPointsNumber}>{ecoPoints} pts</Text>
                </View>
                <View style={styles.ecoBadge}>
                  <Text style={styles.ecoBadgeText}>
                    {ecoPoints > 0 ? 'Eco Champion' : 'Level 1 Eco Citizen'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ecoSubtitle}>
                Earn points by reporting waste, recycling scrap & e-waste, and keeping your community clean.
              </Text>
            </View>

            {/* Sidebar Navigation Prompt Banner */}
            <View style={styles.sidebarPromptCard}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptIcon}>🧭</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promptTitle}>Looking for more services?</Text>
                  <Text style={styles.promptText}>
                    Open the sidebar menu (☰) to file complaints, request paid doorstep waste pickup, recycle e-waste, and track status.
                  </Text>
                </View>
              </View>

              <View style={styles.promptButtonRow}>
                <TouchableOpacity
                  style={styles.openSidebarBtn}
                  onPress={() => setSidebarVisible(true)}
                >
                  <Text style={styles.openSidebarBtnText}>Open Sidebar ☰</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.trackComplaintsQuickBtn}
                  onPress={() => setCurrentScreen('my_complaints')}
                >
                  <Text style={styles.trackComplaintsQuickText}>Track Status 📋</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Action: File / Report */}
            <View style={styles.actionCard}>
              <Text style={styles.sectionHeader}>Quick Actions</Text>
              <Text style={styles.sectionDesc}>
                Spot illegal waste dumping or overflowing municipal dustbins? Submit a quick report.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setCurrentScreen('complaint')}
              >
                <Text style={styles.actionButtonText}>📝 Report Waste / File Complaint</Text>
              </TouchableOpacity>
            </View>

            {/* Citizen Services Highlights */}
            <View style={styles.servicesGrid}>
              {/* Paid Doorstep Waste Pickup */}
              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('waste_pickup')}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>🚚</Text>
                  <View style={styles.paidMiniBadge}>
                    <Text style={styles.paidMiniBadgeText}>PAID</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Waste Pickup</Text>
                <Text style={styles.serviceTileDesc}>
                  No bins nearby? Book convenient doorstep collection.
                </Text>
              </TouchableOpacity>

              {/* Recycle & Scrap */}
              <TouchableOpacity
                style={styles.serviceTile}
                onPress={() => setCurrentScreen('recycle')}
              >
                <View style={styles.serviceTileHeader}>
                  <Text style={styles.serviceTileIcon}>♻️</Text>
                  <View style={styles.ecoMiniBadge}>
                    <Text style={styles.ecoMiniBadgeText}>+PTS</Text>
                  </View>
                </View>
                <Text style={styles.serviceTileTitle}>Recycle Scrap</Text>
                <Text style={styles.serviceTileDesc}>
                  Dispose of e-waste, metal, paper and earn bonus Eco Points.
                </Text>
              </TouchableOpacity>
            </View>

            {/* More Info About SHODHINI */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutHeader}>About SHODHINI</Text>
              <Text style={styles.aboutIntro}>
                SHODHINI is a community-driven smart waste management platform designed to connect active citizens with local sanitation workers and municipal teams for cleaner, greener cities.
              </Text>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📸</Text>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Prompt Waste Reporting</Text>
                  <Text style={styles.featureDesc}>
                    Citizens can quickly pinpoint and report waste hotspots with descriptions and location data.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🚚</Text>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Doorstep Waste Services</Text>
                  <Text style={styles.featureDesc}>
                    Paid doorstep collection for households without nearby public bins or needing bulk waste removal.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>♻️</Text>
                <View style={styles.featureTextWrapper}>
                  <Text style={styles.featureTitle}>Circular Recycling & Scrap</Text>
                  <Text style={styles.featureDesc}>
                    Specialized recycling for hazardous electronic waste, metals, plastics, and paper.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Garbage Collector Dashboard */}
        {isCollector && (
          <View style={styles.actionCard}>
            <Text style={styles.sectionHeader}>Worker Dashboard</Text>
            <Text style={styles.sectionDesc}>
              Assigned collection tasks and route updates for your operating zone ({user?.area || 'Assigned Zone'}) will appear here.
            </Text>
            <View style={styles.comingSoonBox}>
              <Text style={styles.comingSoonText}>Task management module arriving in Step 6</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Slide-out Sidebar Drawer */}
      {!isCollector && (
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          user={user}
          ecoPoints={ecoPoints}
          onLogout={onLogout}
        />
      )}
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
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerBtn: {
    padding: 6,
    marginRight: 10,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: '#2e7d32',
    fontWeight: 'bold',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
    width: 125,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#222',
    fontWeight: '600',
    flex: 1,
  },
  ecoPointsCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  ecoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ecoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  ecoPointsNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1b5e20',
    marginTop: 2,
  },
  ecoBadge: {
    backgroundColor: '#2e7d32',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  ecoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  ecoSubtitle: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  sidebarPromptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  promptIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  promptText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  promptButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  openSidebarBtn: {
    flex: 1,
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  openSidebarBtnText: {
    color: '#2e7d32',
    fontWeight: '700',
    fontSize: 13,
  },
  trackComplaintsQuickBtn: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  trackComplaintsQuickText: {
    color: '#1b5e20',
    fontWeight: '700',
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  servicesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  serviceTile: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTileIcon: {
    fontSize: 24,
  },
  paidMiniBadge: {
    backgroundColor: '#ffecb3',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  paidMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f57f17',
  },
  ecoMiniBadge: {
    backgroundColor: '#c8e6c9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  ecoMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1b5e20',
  },
  serviceTileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  serviceTileDesc: {
    fontSize: 11,
    color: '#666',
    lineHeight: 15,
  },
  aboutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: 8,
  },
  aboutIntro: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },
  comingSoonBox: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  comingSoonText: {
    color: '#e65100',
    fontSize: 13,
    fontWeight: '600',
  },
});
