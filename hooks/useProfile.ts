import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSessionWithProfile } from '../services/auth';
import type { Profile, UserRole } from '../types/db';

type State = {
  profile: Profile | null;
  loading: boolean;
  errorMessage: string | null;
};

/**
 * Loads the signed-in user's profile row from `public.profiles`.
 * Used by the splash router and `(customer|admin)/_layout.tsx` to
 * decide which home group to show.
 */
export function useProfile(): State & { reload: () => Promise<void> } {
  const [state, setState] = useState<State>({
    profile: null,
    loading: true,
    errorMessage: null,
  });

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const result = await getSessionWithProfile();
    if (result.user === null) {
      setState({ profile: null, loading: false, errorMessage: null });
      return;
    }
    if (result.profile === null) {
      setState({ profile: null, loading: false, errorMessage: result.errorMessage });
      return;
    }
    setState({ profile: result.profile, loading: false, errorMessage: null });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

/**
 * Live-subscribe to changes on the current user's profile row. Useful
 * for the profile tab so that role or email changes (admin promotion)
 * are reflected without a manual refresh.
 */
export function useProfileRealtime(): State {
  const [state, setState] = useState<State>({
    profile: null,
    loading: true,
    errorMessage: null,
  });

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const result = await getSessionWithProfile();
      if (cancelled) return;
      if (!result.user) {
        setState({ profile: null, loading: false, errorMessage: null });
        return;
      }
      if (!result.profile) {
        setState({ profile: null, loading: false, errorMessage: result.errorMessage });
        return;
      }
      setState({ profile: result.profile, loading: false, errorMessage: null });

      // Subscribe to changes on this profile row.
      const channelId = `profile:${result.user.id}:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${result.user.id}` },
          (payload) => {
            setState((s) => ({ ...s, profile: payload.new as Profile }));
          },
        )
        .subscribe();
    }

    load();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === 'admin';
}