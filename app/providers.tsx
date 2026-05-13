"use client"

import { ReactNode, useEffect, useState } from "react"
import { GameProvider } from "@/context/game-context"
import { GuideProvider } from "@/context/guide-context"
import { defineChain } from 'viem'
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
      webSocket: [process.env.NEXT_PUBLIC_RITUAL_WS_URL ?? 'wss://rpc.ritualfoundation.org/ws'],
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

// Wagmi config with Injected Connector (MetaMask, Rabby, etc.)
const wagmiConfig = {
  chains: [ritualTestnet],
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
}

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [hasInitialized, setHasInitialized] = useState(false)

  // Add debug logging for context initialization
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true)
      console.log("[Providers] Client-side providers initialized");

      // Log configuration warnings in development
      if (process.env.NODE_ENV === 'development') {
        if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
          console.warn('⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect features may not work properly.')
        }
        if (!process.env.NEXT_PUBLIC_RITUAL_RPC_URL) {
          console.warn('⚠️ NEXT_PUBLIC_RITUAL_RPC_URL is not set. Using default RPC.')
        }
      }
    }
  }, []); // Empty dependency array to prevent re-initialization

  // Client-side only configuration (SSR disabled)
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