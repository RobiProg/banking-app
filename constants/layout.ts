import { Platform } from 'react-native';
import { colors } from './colors';

/**
 * Shared screen options for the Stack navigators.
 * Header-hidden keeps the design clean across splash / auth / app groups.
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
 * 4pt Spacing Scale matching Figma Design System (§0).
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export type Spacing = keyof typeof spacing;

/**
 * Standard Border Radii
 */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export type Radius = keyof typeof radius;

/**
 * Subtle elevation & shadow system (never playful; corporate 1-2dp).
 */
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {
      shadowColor: '#0B1B2B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
  }),
} as const;

/**
 * Typography Tokens with responsive scales.
 */
export const typography = {
  display: { size: 36, weight: '700' as const },
  h1: { size: 24, weight: '700' as const },
  h2: { size: 18, weight: '600' as const },
  h3: { size: 16, weight: '600' as const },
  title: { size: 28, weight: '700' as const },
  subtitle: { size: 15, weight: '400' as const },
  body: { size: 15, weight: '400' as const },
  bodyBold: { size: 15, weight: '600' as const },
  button: { size: 15, weight: '600' as const },
  label: { size: 13, weight: '600' as const },
  caption: { size: 13, weight: '400' as const },
  helper: { size: 12, weight: '400' as const },
  micro: { size: 11, weight: '500' as const },
} as const;

export type TypographyRole = keyof typeof typography;
