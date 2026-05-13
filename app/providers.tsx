"use client"

import { ReactNode, useEffect, useState, useMemo } from "react"
import { GameProvider } from "@/context/game-context"
import { GuideProvider } from "@/context/guide-context"
import { defineChain, http } from 'viem'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import { NoSSRWrapper } from '@/components/no-ssr-wrapper'
import { ErrorBoundary } from '@/components/error-boundary'

// Define Ritual Testnet chain configuration
const ritualTestnet = defineChain({
  id: 1979,
  name: 'Ritual Testnet',
  network: 'ritual-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'RITUAL',
    symbol: 'RITUAL',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? 'https://rpc.ritualfoundation.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Ritual Explorer',
      url: 'https://explorer.ritualfoundation.org'
    },
  },
  testnet: true,
})

export function Providers({ children }: { children: ReactNode }) {
  const [hasInitialized, setHasInitialized] = useState(false)

  // Create client-side only QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
      },
    },
  }))

  // Create wagmi config client-side only
  const wagmiConfig = useMemo(() => {
    const chainWithTransport = defineChain({
      ...ritualTestnet,
      transports: {
        [ritualTestnet.id]: http(),
      },
    });

    return {
      chains: [chainWithTransport],
      connectors: [
        injected({
          target: 'metaMask',
        }),
      ],
    };
  }, [])

  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      console.log("[Providers] Client-side providers initialized");

      if (process.env.NODE_ENV === 'development') {
        if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
          console.warn('⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set.')
        }
        if (!process.env.NEXT_PUBLIC_RITUAL_RPC_URL) {
          console.warn('⚠️ NEXT_PUBLIC_RITUAL_RPC_URL is not set.')
        }
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <NoSSRWrapper fallback={<div>Loading...</div>}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig as any}>
            <GameProvider>
              <GuideProvider>
                {children}
              </GuideProvider>
            </GameProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </NoSSRWrapper>
    </ErrorBoundary>
  )
}