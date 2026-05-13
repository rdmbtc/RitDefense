"use client";

import { useAccount } from 'wagmi';

export function useCrossAppAccount() {
  const { address, isConnected, chain } = useAccount();

  return {
    walletAddress: address,
    isAuthenticated: isConnected,
    chain: chain,
  };
}