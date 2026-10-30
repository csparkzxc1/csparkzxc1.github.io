/**
 * Semantic color tokens. Components read these through useTheme() so light and
 * dark stay in sync; the medicine tag colors (COLOR_TAGS) are the same in both.
 */
export type Scheme = 'light' | 'dark';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceMuted: string;
  inputBg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  line: string;
  brand: string;
  brandSoft: string;
  brandBorder: string;
  onBrand: string;
  success: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  chipBorder: string;
  shadow: string;
  overlay: string;
}

const light: ThemeColors = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EBEEF6',
  inputBg: '#F4F6FB',
  text: '#1A1D2B',
  textMuted: '#8A91A8',
  textFaint: '#A9B0C5',
  line: '#E5E8F0',
  brand: '#4A6CF7',
  brandSoft: '#EDF1FE',
  brandBorder: '#DCE3FD',
  onBrand: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  warningText: '#92400E',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  chipBorder: '#DDE1EA',
  shadow: '#3F4A7E',
  overlay: 'rgba(0,0,0,0.4)',
};

const dark: ThemeColors = {
  bg: '#0B0D14',
  surface: '#161A26',
  surfaceMuted: '#232838',
  inputBg: '#1E2333',
  text: '#F3F5FA',
  textMuted: '#9AA1B5',
  textFaint: '#5D6479',
  line: '#2A3042',
  brand: '#6B86FF',
  brandSoft: 'rgba(107,134,255,0.16)',
  brandBorder: 'rgba(107,134,255,0.35)',
  onBrand: '#FFFFFF',
  success: '#34D399',
  warning: '#FBBF24',
  warningSoft: 'rgba(251,191,36,0.12)',
  warningText: '#FCD34D',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.16)',
  chipBorder: '#323A50',
  shadow: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
};

export const THEMES: Record<Scheme, ThemeColors> = { light, dark };

/** Soft card shadow; dark mode relies on surface contrast instead. */
export function cardShadow(c: ThemeColors, scheme: Scheme) {
  return scheme === 'dark'
    ? { borderWidth: 1, borderColor: c.line }
    : {
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 2,
      };
}

// ─── Text size ──────────────────────────────────────────────────────────────

/**
 * In-app text size as a step on a slider, applied on top of the iOS/Android
 * system text size. Step 1 is the normal size.
 */
export const TEXT_SCALES = [0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6] as const;
export const DEFAULT_TEXT_STEP = 1;

/** Reads a saved step; older versions saved 'normal' / 'large' / 'xlarge'. */
export function parseTextStep(saved: string | null): number {
  const legacy: Record<string, number> = { normal: 1, large: 3, xlarge: 5 };
  if (!saved) return DEFAULT_TEXT_STEP;
  if (saved in legacy) return legacy[saved];
  const n = Number(saved);
  return Number.isInteger(n) && n >= 0 && n < TEXT_SCALES.length ? n : DEFAULT_TEXT_STEP;
}

/**
 * Enlarges every fontSize/lineHeight in a style sheet object, so one setting
 * reaches all screens built with useThemedStyles.
 */
export function scaleText<T>(styles: T, scale: number): T {
  if (scale === 1 || !styles || typeof styles !== 'object') return styles;
  const out: Record<string, unknown> = {};
  for (const [key, style] of Object.entries(styles as Record<string, unknown>)) {
    if (!style || typeof style !== 'object' || Array.isArray(style)) {
      out[key] = style;
      continue;
    }
    const s = { ...(style as Record<string, unknown>) };
    if (typeof s.fontSize === 'number') s.fontSize = Math.round(s.fontSize * scale);
    if (typeof s.lineHeight === 'number') s.lineHeight = Math.round(s.lineHeight * scale);
    out[key] = s;
  }
  return out as T;
}
