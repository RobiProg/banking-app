import { useCallback, useEffect, useState } from 'react';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToMyNotifications,
} from '../services/notifications';
import type { Notification } from '../types/db';

type State = {
  notifications: Notification[];
  loading: boolean;
  errorMessage: string | null;
  unreadCount: number;
};

export function useNotifications(): State & {
  reload: () => Promise<void>;
  setRead: (id: string, isRead: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
} {
  const [state, setState] = useState<State>({
    notifications: [],
    loading: true,
    errorMessage: null,
    unreadCount: 0,
  });

  const reload = useCallback(async () => {
    const res = await listMyNotifications();
    setState({
      notifications: res.notifications,
      loading: false,
      errorMessage: res.errorMessage,
      unreadCount: res.notifications.filter((n) => !n.is_read).length,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    reload();
    unsubscribe = subscribeToMyNotifications(() => {
      if (cancelled) return;
      reload();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [reload]);

  const setRead = useCallback(
    async (id: string, isRead: boolean) => {
      // Optimistic update
      setState((s) => {
        const next = s.notifications.map((n) => (n.id === id ? { ...n, is_read: isRead } : n));
        return { ...s, notifications: next, unreadCount: next.filter((n) => !n.is_read).length };
      });
      const res = await markNotificationRead(id, isRead);
      if (res.errorMessage) {
        // Rollback by reloading from server
        reload();
      }
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    setState((s) => {
      const next = s.notifications.map((n) => ({ ...n, is_read: true }));
      return { ...s, notifications: next, unreadCount: 0 };
    });
    const res = await markAllNotificationsRead();
    if (res.errorMessage) reload();
  }, [reload]);

  return { ...state, reload, setRead, markAllRead };
}