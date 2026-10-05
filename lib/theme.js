import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const lightColors = {
  background: '#ffffff',
  surface: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  borderFocus: '#16a34a',
  text: '#0f172a',
  textSecondary: '#475569',
  muted: '#64748b',
  accent: '#16a34a',
  accentHover: '#15803d',
  accentLight: '#dcfce7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  inputBg: '#ffffff',
  headerBg: '#ffffff',
  subtle: '#f1f5f9',
};

export const darkColors = {
  background: '#090d16',
  surface: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  borderFocus: '#22c55e',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  muted: '#94a3b8',
  accent: '#22c55e',
  accentHover: '#16a34a',
  accentLight: '#064e3b',
  danger: '#f87171',
  dangerLight: '#450a0a',
  warning: '#fbbf24',
  warningLight: '#451a03',
  inputBg: '#1e293b',
  headerBg: '#0f172a',
  subtle: '#1e293b',
};

export const tokens = {
  colors: { ...lightColors },
  typography: {
    size: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

const THEME_STORAGE_KEY = 'shodhini_theme_preference';

async function getStoredTheme() {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(THEME_STORAGE_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function setStoredTheme(mode) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
      return;
    }
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  colors: lightColors,
  tokens,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
          Object.assign(tokens.colors, stored === 'dark' ? darkColors : lightColors);
          return stored;
        }
      } catch {}
    }
    const system = Appearance?.getColorScheme?.();
    const initial = system === 'dark' ? 'dark' : 'light';
    Object.assign(tokens.colors, initial === 'dark' ? darkColors : lightColors);
    return initial;
  });

  useEffect(() => {
    getStoredTheme().then((stored) => {
      if (stored === 'dark' || stored === 'light') {
        setThemeState(stored);
        Object.assign(tokens.colors, stored === 'dark' ? darkColors : lightColors);
      }
    });
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    Object.assign(tokens.colors, newTheme === 'dark' ? darkColors : lightColors);
    setStoredTheme(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        document.body.style.backgroundColor = isDark ? '#020617' : '#f1f5f9';
      } catch {}
    }
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, tokens, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
