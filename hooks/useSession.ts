import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '../services/auth';

/**
 * Reactive session state. Returns the current Supabase session and
 * re-renders whenever the user signs in / out / token refreshes.
 *
 * Usage:
 *   const { session, loading } = useSession();
 *   if (loading) return <LoadingState />;
 *   if (!session) router.replace(ROUTES.login);
 */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setLoading(false);
      });

    const unsubscribe = onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}