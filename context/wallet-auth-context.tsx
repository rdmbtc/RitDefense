"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalletAuthContextType {
  isConnected: boolean;
  walletAddress: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isLoading: boolean;
  isOnCorrectNetwork: boolean;
}

const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

export function WalletAuthProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState(true);

  const connect = async () => {
    setIsLoading(true);
    try {
      // Mock wallet connection logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsConnected(true);
      setWalletAddress('0x1234567890abcdef1234567890abcdef12345678');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
  };

  const value: WalletAuthContextType = {
    isConnected,
    walletAddress,
    connect,
    disconnect,
    isLoading,
    isOnCorrectNetwork,
  };

  return (
    <WalletAuthContext.Provider value={value}>
      {children}
    </WalletAuthContext.Provider>
  );
}

export function useWalletAuth() {
  const context = useContext(WalletAuthContext);
  if (context === undefined) {
    throw new Error('useWalletAuth must be used within a WalletAuthProvider');
  }
  return context;
}