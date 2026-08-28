import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, StaticColors, type AppColors } from '@/constants/colors';

/**
 * Dark-first theme. Defaults to dark, but the user can pick Auto / Light / Dark
 * in Settings — `mode` is persisted and "auto" follows the OS. Consumers always
 * read `colors` from useTheme(), never a palette directly.
 */
export type ThemeScheme = 'dark' | 'light';
export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'pataskills_theme_mode';

interface ThemeValue {
  scheme: ThemeScheme;
  isDark: boolean;
  colors: AppColors;
  /** Theme-independent tokens (glass, selection, brand one-offs). */
  staticColors: typeof StaticColors;
  /** User preference (auto/light/dark). */
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children, defaultMode = 'dark' }: { children: ReactNode; defaultMode?: ThemeMode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'auto' || v === 'light' || v === 'dark') setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const scheme: ThemeScheme = mode === 'auto' ? (system === 'light' ? 'light' : 'dark') : mode;

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: scheme === 'dark' ? DarkColors : LightColors,
      staticColors: StaticColors,
      mode,
      setMode,
    }),
    [scheme, mode, setMode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
