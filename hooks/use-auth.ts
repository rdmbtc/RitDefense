import { useState, useCallback } from 'react';
import { useWallet } from '@/components/client-providers';

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
  const { address } = useWallet();
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

      if (isSessionValid(playerAddress)) {
        const cachedToken = localStorage.getItem(`session_${playerAddress}`)!;
        setState(prev => ({ ...prev, sessionToken: cachedToken, isAuthenticating: false }));
        return cachedToken;
      }

      if (!address) {
        throw new Error('Please connect your wallet first');
      }

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