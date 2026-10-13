import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types/db';

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
  branchId?: string | null;
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
/**
 * Translate raw Supabase auth errors into messages we are willing to
 * show in the UI. Anything we don't recognise falls back to a generic
 * message so we never leak DB / network internals.
 *
 * Exported because other services (profiles, accounts, transactions,
 * notifications, admin) reuse this mapper for non-RPC Supabase errors.
 */
export function mapAuthError(message: string): string {
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
  if (
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('failed to fetch') ||
    m.includes('aborted') ||
    m.includes('internal error')
  ) {
    return "We couldn't reach the server. Check your connection and try again.";
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
  branchId,
}: SignUpParams): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          ...(branchId ? { branch_id: branchId } : {}),
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

/**
 * Send password reset email via Supabase Auth (FR-AUTH-04, TC-19).
 */
export async function resetPasswordForEmail(
  email: string,
): Promise<{ ok: boolean; errorMessage: string | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      return { ok: false, errorMessage: mapAuthError(error.message) };
    }
    return { ok: true, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] resetPasswordForEmail threw:', err);
    return { ok: false, errorMessage: 'Something went wrong. Please try again.' };
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

/**
 * Result of a profile lookup. We deliberately return both the profile
 * and the underlying auth user so screens / layouts can react to either.
 */
export type ProfileLookup = {
  user: User | null;
  profile: Profile | null;
  errorMessage: string | null;
};

/**
 * Fetch the current auth user AND their profile row in one call.
 * Used by splash routing and `(customer|admin)/_layout.tsx` to decide
 * which home area to show.
 *
 * If the user is signed in but no profile row exists yet (e.g. the
 * trigger hasn't fired), we surface a friendly error rather than
 * silently treating them as anonymous.
 */
export async function getSessionWithProfile(): Promise<ProfileLookup> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { user: null, profile: null, errorMessage: null };
    }
    const user = userData.user;

    // 1. Initial profile fetch
    let { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      return { user, profile: profile as Profile, errorMessage: null };
    }

    // 2. Self-healing attempt 1: Call ensure_user_profile RPC (from 0006 migration)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('ensure_user_profile');
      if (!rpcErr && rpcData) {
        return { user, profile: rpcData as Profile, errorMessage: null };
      }
    } catch {
      // ignore RPC absence fallback to direct insert
    }

    // 3. Self-healing attempt 2: Direct insert (RLS allows own insert)
    try {
      const fullName =
        (user.user_metadata?.full_name as string) ||
        (user.email ? user.email.split('@')[0] : 'Customer');
      const phone = (user.user_metadata?.phone as string) || null;

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: fullName,
          email: user.email,
          phone,
          role: 'customer',
        },
        { onConflict: 'id' },
      );

      // Also ensure savings account exists
      const { data: existingAcct } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingAcct) {
        await supabase.from('accounts').insert({
          user_id: user.id,
          account_type: 'savings',
          balance: 0,
          status: 'active',
        });
      }
    } catch {
      // ignore
    }

    // 4. Re-query profile after self-healing attempts
    const refetch = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (refetch.data) {
      return { user, profile: refetch.data as Profile, errorMessage: null };
    }

    // 5. Brief retry in case of database trigger race condition on signup
    await new Promise((r) => setTimeout(r, 600));
    const finalCheck = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (finalCheck.data) {
      return { user, profile: finalCheck.data as Profile, errorMessage: null };
    }

    if (profileErr) {
      return {
        user,
        profile: null,
        errorMessage: 'We could not load your profile. Please try again.',
      };
    }

    return {
      user,
      profile: null,
      errorMessage:
        'Your profile could not be loaded. Please run migration 0006_fix_missing_profiles.sql in the Supabase SQL editor.',
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auth] getSessionWithProfile threw:', err);
    return {
      user: null,
      profile: null,
      errorMessage: 'Something went wrong. Please try again.',
    };
  }
}

/**
 * Subscribe to auth state changes. Used by `useSession` so the app
 * reacts to login/logout without manual refreshes.
 */
export function onAuthStateChange(
  cb: (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED', session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      cb(event, session);
    }
  });
  return () => {
    data.subscription.unsubscribe();
  };
}