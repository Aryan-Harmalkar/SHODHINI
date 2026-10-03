import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import AuthScreen from './screens/AuthScreen';
import { initDatabase, getCurrentUser, logoutUser } from './db/database';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setInitializing(false);
      }
    }
    setup();
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  if (initializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingText}>Loading SHODHINI...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {currentUser ? (
        <HomeScreen user={currentUser} onLogout={handleLogout} />
      ) : (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
});
