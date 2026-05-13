"use client"

import { ReactNode } from "react"
import { GameProvider } from "@/context/game-context"
import { GuideProvider } from "@/context/guide-context"
import { WagmiProviders } from "@/lib/wagmi-config"
import { NoSSRWrapper } from '@/components/no-ssr-wrapper'
import { ErrorBoundary } from '@/components/error-boundary'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <NoSSRWrapper fallback={<div>Loading...</div>}>
        <WagmiProviders>
          <GameProvider>
            <GuideProvider>
              {children}
            </GuideProvider>
          </GameProvider>
        </WagmiProviders>
      </NoSSRWrapper>
    </ErrorBoundary>
  )
}