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