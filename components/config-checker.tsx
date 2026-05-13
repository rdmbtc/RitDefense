"use client";

import { useEffect } from 'react';

export function ConfigChecker() {
  useEffect(() => {
    // Check for required environment variables or configurations
    const recommendedEnvVars = [
      'NEXT_PUBLIC_RITUAL_RPC_URL',
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
    ];

    const missingVars = recommendedEnvVars.filter(varName => {
      const value = process.env[varName];
      return !value || value === 'undefined';
    });

    if (missingVars.length > 0) {
      console.warn('Missing recommended environment variables:', missingVars);
    }
  }, []);

  // This component doesn't render anything visible
  return null;
}