/**
 * Centralised route paths.
 *
 * Routes are typed by Expo Router at compile time, but keeping them as
 * string constants here avoids sprinkling stringly-typed paths across
 * screens and makes renames a single-file change.
 */
export const ROUTES = {
  // Public / auth
  splash: '/',
  login: '/(auth)/login',
  register: '/(auth)/register',

  // Customer app
  customer: '/(customer)',
  home: '/(customer)',
  transactions: '/(customer)/transactions',
  notifications: '/(customer)/notifications',
  profile: '/(customer)/profile',
  account: '/(customer)/account',
  deposit: '/(customer)/deposit',
  withdraw: '/(customer)/withdraw',
  sendMoney: '/(customer)/send-money',
  transactionDetails: '/(customer)/transaction-details', // [id] appended at runtime

  // Admin app
  admin: '/(admin)',
  adminDashboard: '/(admin)',
  adminUsers: '/(admin)/users',
  adminAccounts: '/(admin)/accounts',
  adminTransactions: '/(admin)/transactions',
  adminUserDetails: '/(admin)/user-details', // [id] appended at runtime
} as const;

export function transactionDetailsPath(id: string): string {
  return `/(customer)/transaction-details?id=${encodeURIComponent(id)}`;
}

export function adminUserDetailsPath(id: string): string {
  return `/(admin)/user-details?id=${encodeURIComponent(id)}`;
}