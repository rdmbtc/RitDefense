"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, apiEndpoints } from "../lib/api";
import { UserData } from "../types";

export function useUsername(walletAddress: string | null) {
  const query = useQuery({
    queryKey: ["username", walletAddress],
    queryFn: async (): Promise<UserData | null> => {
      if (!walletAddress) {
        return null;
      }

      try {
        const { data } = await api.post<UserData>(
          apiEndpoints.checkWallet,
          {
            walletAddress,
          }
        );
        return data;
      } catch (error: any) {
        // Handle 404 (no username found) as a valid state, not an error
        if (error.response?.status === 404) {
          console.log('No username found for wallet:', walletAddress);
          return { hasUsername: false, user: null };
        }
        // Re-throw other errors
        throw error;
      }
    },
    staleTime: Infinity,
    enabled: !!walletAddress,
    refetchInterval: false,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (no username found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
  });

  // Stop refetching when username is found
  useEffect(() => {
    if (query.data?.hasUsername && query.data?.user?.username) {
      console.log(
        "Username found, disabling refetch interval:",
        query.data.user.username
      );
    }
  }, [query.data]);

  return query;
}
