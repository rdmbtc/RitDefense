"use client";

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';

interface WalletState {
  address: string | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connected: false,
  connect: () => {},
  disconnect: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

function WalletProviderInner({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Check if already connected on mount
    if (typeof window !== 'undefined') {
      const eth = (window as any).ethereum;
      if (eth?.selectedAddress) {
        setAddress(eth.selectedAddress);
        setConnected(true);
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

      const handleChainChanged = () => {
        window.location.reload();
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
    <WalletContext.Provider value={{ address, connected, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

function ProvidersInner({ children }: { children: ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}

export { ProvidersInner };