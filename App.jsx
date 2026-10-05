import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';

import HomeScreen from './screens/HomeScreen';
import AuthScreen from './screens/AuthScreen';
import { initDatabase, getCurrentUser, logoutUser, updateUserPushToken } from './db/database';
import { registerForPushNotificationsAsync } from './lib/notifications';
import { ThemeProvider, useTheme } from './lib/theme';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';

function MainAppShell() {
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();

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
        <Image
          source={require('./assets/logo.png')}
          style={{ width: 140, height: 140, marginBottom: 16 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading SHODHINI...</Text>
      </View>
    );
  }

  const isWebDesktop = Platform.OS === 'web' && width > 768;

  return (
    <View style={[styles.nativeContainer, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {currentUser ? (
          <HomeScreen user={currentUser} onLogout={handleLogout} />
        ) : (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

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
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    paddingVertical: 16,
  },
  webOuterCanvasDark: {
    backgroundColor: '#050505',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 440,
    height: '96vh',
    maxHeight: 900,
    backgroundColor: '#ffffff',
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 8,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.08,
    shadowRadius: 48,
    elevation: 24,
  },
  mobileFrameDark: {
    backgroundColor: '#0a0a0a',
    borderColor: 'rgba(255,255,255,0.05)',
    shadowOpacity: 0.4,
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
