import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import type { Profile } from '../types/db';

export type UpdateProfileParams = {
  full_name?: string;
  phone?: string | null;
};

export type ProfileServiceResult = {
  profile: Profile | null;
  errorMessage: string | null;
};

/**
 * Update the signed-in user's editable profile fields.
 * Only `full_name` and `phone` are exposed to the form; RLS also
 * guards `role` and `email` against client-side changes.
 */
export async function updateMyProfile(
  patch: UpdateProfileParams,
): Promise<ProfileServiceResult> {
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return { profile: null, errorMessage: 'You are not signed in.' };
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userData.user.id)
      .select('*')
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[profiles] updateMyProfile:', error.message);
      return { profile: null, errorMessage: mapAuthError(error.message) };
    }
    return { profile: data as Profile, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[profiles] updateMyProfile threw:', err);
    return { profile: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}