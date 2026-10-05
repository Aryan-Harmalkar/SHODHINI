import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform, Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Ethereal Glass (Dark) & Soft Structuralism (Light)
export const lightColors = {
  background: '#fafafa', // Silver-grey/white
  surface: '#ffffff',
  card: '#ffffff',
  border: 'rgba(0, 0, 0, 0.05)',
  borderFocus: '#171717',
  text: '#171717',
  textSecondary: '#525252',
  muted: '#737373',
  accent: '#171717', // High contrast accent
  accentHover: '#262626',
  accentLight: 'rgba(0, 0, 0, 0.03)',
  danger: '#e11d48',
  dangerLight: '#ffe4e6',
  warning: '#d97706',
  warningLight: '#fef3c7',
  inputBg: '#fafafa',
  headerBg: '#fafafa',
  subtle: '#f5f5f5',
  modalOverlay: 'rgba(255, 255, 255, 0.8)', // Glass overlay
};

export const darkColors = {
  background: '#050505', // Ethereal OLED Black
  surface: '#0a0a0a',
  card: '#0a0a0a',
  border: 'rgba(255, 255, 255, 0.1)',
  borderFocus: '#ffffff',
  text: '#f5f5f5',
  textSecondary: '#a3a3a3',
  muted: '#737373',
  accent: '#ffffff',
  accentHover: '#f5f5f5',
  accentLight: 'rgba(255, 255, 255, 0.05)',
  danger: '#f43f5e',
  dangerLight: 'rgba(225, 29, 72, 0.15)',
  warning: '#fbbf24',
  warningLight: 'rgba(217, 119, 6, 0.15)',
  inputBg: '#0a0a0a',
  headerBg: '#050505',
  subtle: '#121212',
  modalOverlay: 'rgba(0, 0, 0, 0.8)', // Glass overlay
};

export const tokens = {
  colors: { ...lightColors },
  typography: {
    family: {
      regular: 'PlusJakartaSans_400Regular',
      medium: 'PlusJakartaSans_500Medium',
      semibold: 'PlusJakartaSans_600SemiBold',
      bold: 'PlusJakartaSans_700Bold',
      extrabold: 'PlusJakartaSans_800ExtraBold',
    },
    size: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 20,
      xl: 24,
      xxl: 36, // Massive typography
      xxxl: 48,
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
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64, // Macro-whitespace
    xxl: 96,
  },
  radius: {
    sm: 8,
    md: 16,
    lg: 24,  // Inner core radius
    xl: 32,  // Outer shell radius
    full: 9999,
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 24,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.06,
      shadowRadius: 48,
      elevation: 8,
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
        document.body.style.backgroundColor = isDark ? '#050505' : '#fafafa';
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
