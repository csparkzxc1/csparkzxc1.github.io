import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { kvGet, kvSet, KV_KEYS } from '../db/kv';
import {
  scaleText,
  DEFAULT_TEXT_STEP,
  parseTextStep,
  TEXT_SCALES,
  THEMES,
  type Scheme,
  type ThemeColors,
  type ThemeMode,
} from './theme';

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: Scheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  /** Step on the text size slider (index into TEXT_SCALES). */
  textStep: number;
  /** Multiplier applied to every font size (1 = normal). */
  textScale: number;
  setTextStep: (step: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [textStep, setTextStepState] = useState(DEFAULT_TEXT_STEP);
  const [system, setSystem] = useState<Scheme>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    let active = true;
    kvGet(KV_KEYS.themeMode)
      .then((v) => {
        if (active && (v === 'system' || v === 'light' || v === 'dark')) setModeState(v);
      })
      .catch((e) => console.warn('[theme] load failed', e));
    kvGet(KV_KEYS.textSize)
      .then((v) => {
        if (active) setTextStepState(parseTextStep(v));
      })
      .catch((e) => console.warn('[theme] text size load failed', e));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const scheme: Scheme = mode === 'system' ? system : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors: THEMES[scheme],
      setMode: (next) => {
        setModeState(next);
        kvSet(KV_KEYS.themeMode, next).catch((e) => console.warn('[theme] save failed', e));
      },
      textStep,
      textScale: TEXT_SCALES[textStep],
      setTextStep: (next) => {
        setTextStepState(next);
        kvSet(KV_KEYS.textSize, String(next)).catch((e) => console.warn('[theme] save failed', e));
      },
    }),
    [mode, scheme, textStep]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Builds a StyleSheet from the active colors and text size, rebuilt only when
 * they change.
 */
export function useThemedStyles<T>(factory: (c: ThemeColors, scheme: Scheme) => T): T {
  const { colors, scheme, textScale } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => scaleText(factory(colors, scheme), textScale), [colors, scheme, textScale]);
}
