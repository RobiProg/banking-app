import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import type { Notification } from '../types/db';

export type NotificationsResult = {
  notifications: Notification[];
  errorMessage: string | null;
};

export async function listMyNotifications(
  limit = 100,
): Promise<NotificationsResult> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { notifications: [], errorMessage: mapAuthError(error.message) };
    }
    return { notifications: (data as Notification[]) ?? [], errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[notifications] listMyNotifications threw:', err);
    return { notifications: [], errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function markNotificationRead(
  id: string,
  isRead: boolean,
): Promise<{ errorMessage: string | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: isRead })
      .eq('id', id);
    if (error) return { errorMessage: mapAuthError(error.message) };
    return { errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[notifications] markNotificationRead threw:', err);
    return { errorMessage: 'Something went wrong. Please try again.' };
  }
}

export async function markAllNotificationsRead(): Promise<{ errorMessage: string | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (error) return { errorMessage: mapAuthError(error.message) };
    return { errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[notifications] markAllNotificationsRead threw:', err);
    return { errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Subscribe to new notifications for the signed-in user.
 */
export function subscribeToMyNotifications(
  cb: (n: Notification) => void,
): () => void {
  const channelId = `notifications:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => cb(payload.new as Notification),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}