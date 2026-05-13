"use client";

import { useQuery } from "@tanstack/react-query";
import { api, apiEndpoints } from "../lib/api";
import { PlayerScoreResponse } from "../types";

export function usePlayerTotalScore(
  walletAddress: string | null,
  gameStarted: boolean,
  gameOver: boolean
) {
  const shouldRefetch = gameStarted && !gameOver;

  return useQuery({
    queryKey: ["playerTotalScore", walletAddress],
    queryFn: async (): Promise<PlayerScoreResponse> => {
      if (!walletAddress) {
        throw new Error("No wallet address provided");
      }

      const { data } = await api.post<PlayerScoreResponse>(
        apiEndpoints.getPlayerTotalScore,
        {
          walletAddress,
        }
      );

      return data;
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 30, // Cache for 30 seconds to reduce API calls
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on rate limit errors (429)
      if (error?.response?.status === 429) {
        console.warn('Rate limit hit, not retrying');
        return false;
      }
      // Only retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchInterval: shouldRefetch ? 15000 : false, // Reduced from 5s to 15s
    refetchIntervalInBackground: false, // Don't refetch in background to reduce load
  });
}
