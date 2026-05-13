import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface AuthState {
  isAuthenticating: boolean;
  sessionToken: string | null;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  authenticate: (playerAddress: string) => Promise<string>;
  clearSession: () => void;
  isSessionValid: (playerAddress: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const { address } = useAccount();
  const [state, setState] = useState<AuthState>({
    isAuthenticating: false,
    sessionToken: null,
    error: null
  });

  const isSessionValid = useCallback((playerAddress: string): boolean => {
    const cachedToken = localStorage.getItem(`session_${playerAddress}`);
    const cachedExpiry = localStorage.getItem(`session_${playerAddress}_expiry`);

    if (!cachedToken || !cachedExpiry) {
      return false;
    }

    return Date.now() < parseInt(cachedExpiry);
  }, []);

  const authenticate = useCallback(async (playerAddress: string): Promise<string> => {
    try {
      setState(prev => ({ ...prev, isAuthenticating: true, error: null }));

      // Check if we have a valid cached session token
      if (isSessionValid(playerAddress)) {
        const cachedToken = localStorage.getItem(`session_${playerAddress}`)!;
        setState(prev => ({ ...prev, sessionToken: cachedToken, isAuthenticating: false }));
        return cachedToken;
      }

      // Check if wallet is connected
      if (!address) {
        throw new Error('Please connect your wallet first');
      }

      // TODO: Implement proper wallet-based authentication for Ritual
      throw new Error('Authentication not yet implemented - connect wallet and try again');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isAuthenticating: false
      }));
      throw new Error(errorMessage);
    }
  }, [address, isSessionValid]);

  const clearSession = useCallback(() => {
    setState({
      isAuthenticating: false,
      sessionToken: null,
      error: null
    });

    // Clear all cached sessions
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('session_')) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  return {
    ...state,
    authenticate,
    clearSession,
    isSessionValid
  };
}