import React, { useEffect } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { useProfile, isAdmin } from '../../hooks/useProfile';
import { useSession } from '../../hooks/useSession';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/auth/ScreenContainer';

import { signOut } from '../../services/auth';

/**
 * Gate for the customer area: must have a session, must have a
 * profile, and must NOT be admin (admins are sent to /(admin)).
 */
export default function CustomerLayout() {
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
          title="Almost there"
          message={errorMessage}
          onRetry={reload}
          retryLabel="Try again"
          onSecondaryAction={handleSignOut}
          secondaryLabel="Sign out"
        />
      </ScreenContainer>
    );
  }

  // Admins go to their own app.
  if (isAdmin(profile?.role)) {
    return <Redirect href={ROUTES.adminDashboard} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}