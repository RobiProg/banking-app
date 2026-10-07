/**
 * SmartBank visual identity.
 *
 * Plain colors only (no theme objects yet) to keep things simple.
 * Later phases can layer a full theme system on top of these.
 */
export const colors = {
  primary: '#0A6BD3',
  primaryDark: '#0856A8',
  primaryLight: '#E6F0FB',

  background: '#FFFFFF',
  surface: '#F5F7FA',
  border: '#E2E6EB',

  text: '#0B1B2B',
  textMuted: '#6B7280',
  textOnPrimary: '#FFFFFF',

  error: '#D32F2F',
  errorBg: '#FDECEC',
  errorLight: '#FCE8E6',
  warning: '#ED6C02',
  success: '#2E7D32',
  successBg: '#E6F4EA',
  successLight: '#E6F4EA',
} as const;

export type ColorKey = keyof typeof colors;