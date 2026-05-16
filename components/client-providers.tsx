"use client";

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';

interface WalletState {
  address: string | null;
  connected: boolean;
  chainId: number | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connected: false,
  chainId: null,
  connect: () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function WalletProviderInner({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    // Check if already connected on mount
    if (typeof window !== 'undefined') {
      const eth = (window as any).ethereum;
      if (eth?.selectedAddress) {
        setAddress(eth.selectedAddress);
        setConnected(true);
      }
      // Read initial chain id (best-effort)
      if (eth?.request) {
        eth
          .request({ method: 'eth_chainId' })
          .then((hex: string) => {
            try {
              setChainId(parseInt(hex, 16));
            } catch {
              /* ignore */
            }
          })
          .catch(() => {
            /* ignore */
          });
      }

      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        } else {
          setAddress(null);
          setConnected(false);
        }
      };

      // Track chain id WITHOUT reloading the page. Reloading mid-flow
      // (e.g. while the user was about to sign a meta-tx) wipes state and
      // looks like a "submit just refreshed the page" bug.
      const handleChainChanged = (hex: string) => {
        try {
          setChainId(parseInt(hex, 16));
        } catch {
          /* ignore malformed */
        }
      };

      if (eth?.on) {
        eth.on('accountsChanged', handleAccountsChanged);
        eth.on('chainChanged', handleChainChanged);
      }

      return () => {
        if (eth?.removeListener) {
          eth.removeListener('accountsChanged', handleAccountsChanged);
          eth.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const connect = async () => {
    try {
      const eth = (window as any).ethereum;
      if (eth) {
        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        }
        try {
          const hex: string = await eth.request({ method: 'eth_chainId' });
          setChainId(parseInt(hex, 16));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setConnected(false);
  };

  return (
    <WalletContext.Provider value={{ address, connected, chainId, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

function ProvidersInner({ children }: { children: ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}

export { ProvidersInner };