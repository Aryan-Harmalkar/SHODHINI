import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import HomeScreen from './screens/HomeScreen';
import AuthScreen from './screens/AuthScreen';
import { initDatabase, getCurrentUser, logoutUser, updateUserPushToken } from './db/database';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { ThemeProvider, useTheme } from './lib/theme';

function MainAppShell() {
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const { isDark, colors } = useTheme();

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Attempt push notification registration if user is authenticated
        if (user?.id) {
          registerForPushNotificationsAsync().then((token) => {
            if (token) {
              updateUserPushToken(user.id, token);
            }
          });
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setInitializing(false);
      }
    }
    setup();
  }, []);

  const handleAuthSuccess = async (user) => {
    setCurrentUser(user);
    if (user?.id) {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await updateUserPushToken(user.id, token);
        }
      } catch (err) {
        console.warn('Push registration error on auth:', err);
      }
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  if (initializing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading SHODHINI...</Text>
      </View>
    );
  }

  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={
        isWeb
          ? [styles.webOuterCanvas, isDark && styles.webOuterCanvasDark]
          : [styles.nativeContainer, { backgroundColor: colors.background }]
      }
    >
      <View
        style={
          isWeb
            ? [styles.mobileFrame, isDark && styles.mobileFrameDark]
            : [styles.nativeContainer, { backgroundColor: colors.background }]
        }
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {currentUser ? (
            <HomeScreen user={currentUser} onLogout={handleLogout} />
          ) : (
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webOuterCanvas: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    paddingVertical: 16,
  },
  webOuterCanvasDark: {
    backgroundColor: '#020617',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 440,
    height: '96vh',
    maxHeight: 900,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 8,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  mobileFrameDark: {
    backgroundColor: '#090d16',
    borderColor: '#1e293b',
    shadowOpacity: 0.6,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
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
