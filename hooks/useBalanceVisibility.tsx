import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type BalanceVisibilityContextValue = {
  /** Whether the customer balance is currently masked behind asterisks. */
  isBalanceHidden: boolean;
  /** Toggle between masked and visible balance states. */
  toggleBalanceVisibility: () => void;
  setBalanceHidden: React.Dispatch<React.SetStateAction<boolean>>;
};

const BalanceVisibilityContext = createContext<BalanceVisibilityContextValue | null>(null);

/**
 * Provides shared customer balance privacy state (hidden by default) across
 * customer screens so toggling visibility stays consistent during a session.
 */
export function BalanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isBalanceHidden, setBalanceHidden] = useState(true);

  const toggleBalanceVisibility = useCallback(() => {
    setBalanceHidden((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isBalanceHidden,
      toggleBalanceVisibility,
      setBalanceHidden,
    }),
    [isBalanceHidden, toggleBalanceVisibility],
  );

  return (
    <BalanceVisibilityContext.Provider value={value}>
      {children}
    </BalanceVisibilityContext.Provider>
  );
}

/**
 * Access customer balance visibility state and toggle handler.
 * Falls back to local default-hidden state if rendered outside the provider.
 */
export function useBalanceVisibility(): BalanceVisibilityContextValue {
  const ctx = useContext(BalanceVisibilityContext);
  const [localHidden, setLocalHidden] = useState(true);

  const toggleLocal = useCallback(() => {
    setLocalHidden((prev) => !prev);
  }, []);

  if (ctx) return ctx;

  return {
    isBalanceHidden: localHidden,
    toggleBalanceVisibility: toggleLocal,
    setBalanceHidden: setLocalHidden,
  };
}
