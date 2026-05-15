"use client";

import { ReactNode, useState } from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { defineChain } from 'viem';

// Define Ritual Testnet chain using viem's defineChain for better type safety
const ritualTestnet = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  nativeCurrency: { name: 'RITUAL', symbol: 'RITUAL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.ritualfoundation.org'] },
    public: { http: ['https://rpc.ritualfoundation.org'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.ritualfoundation.org' },
  },
  testnet: true,
});

// Create Wagmi config
export const config = createConfig({
  chains: [ritualTestnet],
  connectors: [injected()],
  transports: {
    [ritualTestnet.id]: http(),
  },
  ssr: true, // Enable SSR support in Wagmi
});

export function WagmiProviders({ children }: { children: ReactNode }) {
  // Initialize QueryClient inside the component to ensure it's created once per session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { 
      queries: { 
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: 1,
      } 
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
