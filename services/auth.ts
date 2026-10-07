import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth service. Wraps the Supabase client so screens stay declarative
 * and free of raw Supabase error strings.
 */

export type SignInParams = {
  email: string;
  password: string;
};

export type SignUpParams = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
};

export type AuthResult = {
  user: User | null;
  session: Session | null;
  errorMessage: string | null;
};

/**
 * Translate raw Supabase auth errors into messages we are willing to
 * show in the UI. Anything we don't recognise falls back to a generic
 * message so we never leak DB / network internals.
 */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email before logging in.';
  }
  if (m.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (m.includes('password should be')) {
    return 'Password does not meet the strength requirements.';
  }
  return 'Something went wrong. Please try again.';
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[auth] getSession:', error.message);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] getSession threw:', err);
    return null;
  }
}

export async function signIn({ email, password }: SignInParams): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { user: null, session: null, errorMessage: mapAuthError(error.message) };
    }
    return {
      user: data.user ?? null,
      session: data.session ?? null,
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] signIn threw:', err);
    return {
      user: null,
      session: null,
      errorMessage: 'Something went wrong. Please try again.',
    };
  }
}

export async function signUp({
  fullName,
  phone,
  email,
  password,
}: SignUpParams): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Stash the additional fields in user_metadata so we can use them
        // later when we create the `profiles` row (Phase 6).
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });
    if (error) {
      return { user: null, session: null, errorMessage: mapAuthError(error.message) };
    }
    return {
      user: data.user ?? null,
      session: data.session ?? null,
      errorMessage: null,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] signUp threw:', err);
    return {
      user: null,
      session: null,
      errorMessage: 'Something went wrong. Please try again.',
    };
  }
}

export async function signOut(): Promise<{ errorMessage: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { errorMessage: mapAuthError(error.message) };
    }
    return { errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] signOut threw:', err);
    return { errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[auth] getCurrentUser:', error.message);
      return null;
    }
    return data.user ?? null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] getCurrentUser threw:', err);
    return null;
  }
}