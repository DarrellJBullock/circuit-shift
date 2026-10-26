import type { SignalColor } from '@/engine';

export const colors = {
  background: '#0B1220',
  backgroundRaised: '#111B2E',
  tile: '#17263D',
  tileLocked: '#132034',
  tileEdge: '#22385A',
  // ≥ 3:1 against both tile fills (WCAG 1.4.11): unpowered wires are essential graphics.
  wireIdle: '#5675A0',
  electricity: '#37DDF7',
  secondary: '#A67AF8',
  source: '#F8B84E',
  error: '#F87171',
  text: '#F1F7FF',
  textMuted: '#9DB0CB',
  blocked: '#0E1828',
  blockedHatch: '#1C2B44',
} as const;

export const signalColor: Readonly<Record<SignalColor, string>> = {
  cyan: colors.electricity,
  violet: colors.secondary,
};

export const signalName: Readonly<Record<SignalColor, string>> = {
  cyan: 'cyan',
  violet: 'violet',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20 } as const;

/** Minimum touch target in points (Apple HIG). */
export const MIN_TOUCH = 44;

export const type = {
  title: { fontSize: 34, fontWeight: '800' as const, letterSpacing: 4, color: colors.text },
  heading: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  caption: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
};

export const motion = {
  rotateMs: 180,
  propagateStepMs: 40,
  fadeMs: 220,
  /** Time for a flow pulse to travel one cell. */
  flowCellMs: 650,
  burstMs: 1100,
  hintHoldMs: 1100,
} as const;

/**
 * Dynamic Type caps (maxFontSizeMultiplier). Body text scales fully; dense,
 * fixed-layout labels are capped so the largest accessibility sizes cannot
 * push the board or controls off screen.
 */
export const fontScale = { display: 1.2, dense: 1.4, control: 1.6 } as const;
