/**
 * Pure validation helpers used by the auth screens.
 *
 * Keep these free of React / Supabase imports so they can be unit-tested
 * and reused anywhere (forms, services).
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isValidEmail(value: string): boolean {
  if (!value) return false;
  return EMAIL_REGEX.test(value.trim());
}

export type PasswordValidation = {
  ok: boolean;
  message?: string;
};

/**
 * Supabase requires a minimum of 6 characters by default. We enforce 8 to
 * encourage slightly stronger passwords for the educational demo without
 * overcomplicating UX.
 */
export function validatePassword(value: string): PasswordValidation {
  if (!value) {
    return { ok: false, message: 'Password is required.' };
  }
  if (value.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  return { ok: true };
}

export function passwordsMatch(a: string, b: string): boolean {
  return a.length > 0 && a === b;
}

export function isValidPhone(value: string): boolean {
  // Loose check: at least 7 digits, allowing spaces, +, dashes, parentheses.
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function clearFieldError<K extends string>(
  errors: Partial<Record<K, string>>,
  key: K,
): Partial<Record<K, string>> {
  if (!errors[key]) return errors;
  return { ...errors, [key]: undefined };
}