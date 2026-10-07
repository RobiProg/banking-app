/**
 * Centralised route paths.
 *
 * Routes are typed by Expo Router at compile time, but keeping them as
 * string constants here avoids sprinkling stringly-typed paths across
 * screens and makes renames a single-file change.
 */
export const ROUTES = {
  splash: '/',
  login: '/(auth)/login',
  register: '/(auth)/register',
  app: '/(app)',
} as const;