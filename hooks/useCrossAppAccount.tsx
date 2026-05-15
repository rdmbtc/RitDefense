"use client";

import { useWallet } from '@/components/client-providers';

export function useCrossAppAccount() {
  const { address, connected } = useWallet();

  return {
    walletAddress: address,
    isAuthenticated: connected,
  };
}