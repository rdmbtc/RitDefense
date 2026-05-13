"use client";

import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { injected } from 'wagmi/connectors';

export function WagmiProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 },
    },
  }));

  const wagmiConfig = useMemo(() => {
    return {
      chains: [{
        id: 1979,
        name: 'Ritual Testnet',
        network: 'ritual-testnet',
        nativeCurrency: { decimals: 18, name: 'RITUAL', symbol: 'RITUAL' },
        rpcUrls: {
          default: { http: ['https://rpc.ritualfoundation.org'] },
        },
        blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.ritualfoundation.org' } },
        testnet: true,
      }],
      connectors: [injected({ target: 'metaMask' })],
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig as any}>
        {children}
      </WagmiConfig>
    </QueryClientProvider>
  );
}