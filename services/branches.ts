import { supabase } from '../lib/supabase';
import { mapAuthError } from './auth';
import type { Branch } from '../types/db';

export type BranchResult = {
  branches: Branch[];
  errorMessage: string | null;
};

/**
 * Fetch all active branches for registration and customer reference.
 * (FR-BR-01, FR-BR-02)
 */
export async function listActiveBranches(): Promise<BranchResult> {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('district', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { branches: [], errorMessage: mapAuthError(error.message) };
    }

    return { branches: (data as Branch[]) ?? [], errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[branches] listActiveBranches threw:', err);
    return { branches: [], errorMessage: 'Failed to load branches. Please try again.' };
  }
}

/**
 * Fetch all branches (including inactive) for administrative oversight.
 * (FR-ADM-06)
 */
export async function listAllBranches(): Promise<BranchResult> {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('district', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { branches: [], errorMessage: mapAuthError(error.message) };
    }

    return { branches: (data as Branch[]) ?? [], errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[branches] listAllBranches threw:', err);
    return { branches: [], errorMessage: 'Failed to load branches. Please try again.' };
  }
}

export type CreateBranchParams = {
  branchCode: string;
  name: string;
  district: string;
  address?: string | null;
  routingCode?: string | null;
  isActive?: boolean;
};

/**
 * Create a new branch (Admin only).
 */
export async function createBranch(
  params: CreateBranchParams,
): Promise<{ branch: Branch | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        branch_code: params.branchCode.trim().toUpperCase(),
        name: params.name.trim(),
        district: params.district.trim(),
        address: params.address?.trim() ?? null,
        routing_code: params.routingCode?.trim() ?? null,
        is_active: params.isActive ?? true,
      })
      .select('*')
      .single();

    if (error) {
      return { branch: null, errorMessage: mapAuthError(error.message) };
    }

    return { branch: data as Branch, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[branches] createBranch threw:', err);
    return { branch: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}

/**
 * Toggle or update branch details (Admin only).
 */
export async function updateBranch(
  id: string,
  updates: Partial<Omit<Branch, 'id' | 'created_at'>>,
): Promise<{ branch: Branch | null; errorMessage: string | null }> {
  try {
    const { data, error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return { branch: null, errorMessage: mapAuthError(error.message) };
    }

    return { branch: data as Branch, errorMessage: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[branches] updateBranch threw:', err);
    return { branch: null, errorMessage: 'Something went wrong. Please try again.' };
  }
}
