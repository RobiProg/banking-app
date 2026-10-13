import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { ScreenContainer } from '../../components/auth/ScreenContainer';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { useProfile, isAdmin } from '../../hooks/useProfile';
import { useSession } from '../../hooks/useSession';
import { ROUTES } from '../../constants/routes';

import { useRouter } from 'expo-router';
import { signOut } from '../../services/auth';

/**
 * Admin gate. Must be signed in AND have role='admin'.
 * Non-admins are redirected to the customer dashboard.
 */
export default function AdminLayout() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { profile, loading: profileLoading, errorMessage, reload } = useProfile();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.replace(ROUTES.login);
  }

  if (sessionLoading || profileLoading || signingOut) {
    return (
      <ScreenContainer scrollable={false} centered>
        <LoadingState label="Loading…" />
      </ScreenContainer>
    );
  }

  if (!session) {
    return <Redirect href={ROUTES.login} />;
  }

  if (errorMessage && !profile) {
    return (
      <ScreenContainer scrollable={false} centered>
        <ErrorState
          title="Admin area unavailable"
          message={errorMessage}
          onRetry={reload}
          retryLabel="Try again"
          onSecondaryAction={handleSignOut}
          secondaryLabel="Sign out"
        />
      </ScreenContainer>
    );
  }

  if (!isAdmin(profile?.role)) {
    return <Redirect href={ROUTES.customer} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}