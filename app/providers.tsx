"use client"

import { ReactNode, useState, useEffect } from "react"
import { GameProvider } from "@/context/game-context"
import { GuideProvider } from "@/context/guide-context"
import { ProvidersInner } from "@/components/client-providers"
import { ErrorBoundary } from "@/components/error-boundary"
import { WagmiProviders } from "@/lib/wagmi-config"

function ClientInit({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ClientInit>
        <WagmiProviders>
          <ProvidersInner>
            <GameProvider>
              <GuideProvider>
                {children}
              </GuideProvider>
            </GameProvider>
          </ProvidersInner>
        </WagmiProviders>
      </ClientInit>
    </ErrorBoundary>
  );
}