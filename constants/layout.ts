import { colors } from './colors';

/**
 * Shared screen options for the Stack navigators.
 *
 * Header-hidden keeps the design clean across splash / auth / app groups;
 * the per-group layouts override `animation` only where it matters.
 */
export const STACK_DEFAULTS = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'fade',
} as const;

export const AUTH_STACK_OPTIONS = {
  ...STACK_DEFAULTS,
  animation: 'slide_from_right',
} as const;

export const APP_STACK_OPTIONS = {
  ...STACK_DEFAULTS,
} as const;

/**
 * Spacing scale. Use these tokens instead of raw numbers so screens stay
 * visually consistent and rhythm is easy to adjust in one place.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export type Spacing = keyof typeof spacing;

/**
 * Typography tokens. Maps a semantic role to a font size + weight so
 * titles, labels, and helper text stay consistent across screens.
 */
export const typography = {
  title: { size: 28, weight: '700' as const },
  subtitle: { size: 15, weight: '400' as const },
  label: { size: 13, weight: '600' as const },
  body: { size: 15, weight: '400' as const },
  helper: { size: 12, weight: '400' as const },
  caption: { size: 12, weight: '400' as const },
} as const;

export type TypographyRole = keyof typeof typography;