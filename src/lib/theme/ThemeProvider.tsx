import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import {
  APPEARANCE_KEY,
  palettes,
  type AppearanceMode,
  type ColorScheme,
  type Palette,
} from '@/constants/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type ThemeValue = {
  colors: Palette;
  scheme: ColorScheme;
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

function isMode(value: string | null): value is AppearanceMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function resolveScheme(mode: AppearanceMode, osDark: boolean): ColorScheme {
  if (mode === 'system') return osDark ? 'dark' : 'light';
  return mode;
}

function useOsDark(): boolean {
  const native = useColorScheme();
  const [webDark, setWebDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return native === 'dark';
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setWebDark(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (Platform.OS === 'web') return;
      setWebDark(Appearance.getColorScheme() === 'dark');
    });
    return () => sub.remove();
  }, []);

  if (Platform.OS === 'web') return webDark;
  return native === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const osDark = useOsDark();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(APPEARANCE_KEY);
        if (!cancelled && isMode(stored)) setModeState(stored);
      } finally {
        if (!cancelled) {
          setReady(true);
          void SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: AppearanceMode) => {
    setModeState(next);
    void AsyncStorage.setItem(APPEARANCE_KEY, next);
  }, []);

  const scheme = resolveScheme(mode, osDark);
  const colors = palettes[scheme];

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.backgroundColor = colors.bg;
    document.documentElement.style.color = colors.ink;
    if (document.body) {
      document.body.style.backgroundColor = colors.bg;
      document.body.style.color = colors.ink;
    }
  }, [scheme, colors.bg, colors.ink]);

  const value = useMemo<ThemeValue>(
    () => ({ colors, scheme, mode, setMode }),
    [colors, scheme, mode, setMode],
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
