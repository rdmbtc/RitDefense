"use client";

import dynamic from 'next/dynamic';

const WagmiConfig = dynamic(() => import('wagmi').then(mod => mod.WagmiConfig), { ssr: false });
const QueryClientProvider = dynamic(() => import('@tanstack/react-query').then(mod => mod.QueryClientProvider), { ssr: false });

import { ReactNode, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';

function WagmiInnerProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 10 } },
  }));

  const wagmiConfig = {
    chains: [{
      id: 1979,
      name: 'Ritual Testnet',
      network: 'ritual-testnet',
      nativeCurrency: { decimals: 18, name: 'RITUAL', symbol: 'RITUAL' },
      rpcUrls: { default: { http: ['https://rpc.ritualfoundation.org'] } },
      blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.ritualfoundation.org' } },
      testnet: true,
    }],
    connectors: [injected({ target: 'metaMask' })],
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig as any}>
        {children}
      </WagmiConfig>
    </QueryClientProvider>
  );
}

export function WagmiProviders({ children }: { children: ReactNode }) {
  return <WagmiInnerProvider>{children}</WagmiInnerProvider>;
}