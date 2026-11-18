/**
 * SmartBank Visual Design Tokens
 * Aligned with Figma Design System Specification (§0).
 *
 * Brand primary: #0A6BD3 (corporate blue, trust + stability)
 * High contrast, WCAG AA compliant.
 */
export const colors = {
  // Brand Primary & Variations
  primary: '#0A6BD3',
  primaryDark: '#0856A8',
  primaryLight: '#E6F0FB',
  primaryMuted: '#B3D4F9',

  // Surfaces & Backgrounds
  background: '#FFFFFF',
  surface: '#F5F7FA',
  surfaceRaised: '#FFFFFF',
  surfaceSubtle: '#F0F3F7',

  // Borders & Dividers
  border: '#E2E6EB',
  borderStrong: '#CBD5E1',
  borderFocus: '#0A6BD3',

  // Typography & Content
  text: '#0B1B2B',
  textPrimary: '#0B1B2B',
  textSecondary: '#6B7280',
  textMuted: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Semantic Status: Error
  error: '#D32F2F',
  errorBg: '#FDECEC',
  errorLight: '#FCE8E6',
  errorBorder: '#F5A9A9',

  // Semantic Status: Warning
  warning: '#ED6C02',
  warningBg: '#FFF4E5',
  warningLight: '#FFF4E5',
  warningBorder: '#FFD19A',

  // Semantic Status: Success
  success: '#2E7D32',
  successBg: '#E6F4EA',
  successLight: '#E6F4EA',
  successBorder: '#A3D9A5',

  // Financial Category & Accent Colors
  accentNavy: '#0F2942',
  accentBlue: '#0284C7',
  accentPurple: '#7C3AED',
  accentTeal: '#0D9488',
  accentEmerald: '#059669',
  accentAmber: '#D97706',

  // Splash Screen & Brand Gradient
  splashGradient: ['#062A54', '#08488E', '#0A6BD3'] as readonly [string, string, string],
  splashAccentCyan: '#38BDF8',
  splashAccentAmber: '#F59E0B',
} as const;

export const SPLASH_GRADIENT = colors.splashGradient;

export type ColorKey = keyof typeof colors;
