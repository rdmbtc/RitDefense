"use client";

import { useMutation } from "@tanstack/react-query";
import { api, apiEndpoints } from "../lib/api";
import { GAME_CONFIG } from "../lib/game-config";

interface OnchainScoreSubmissionRequest {
  walletAddress: string;
  score: number;
  transactionCount: number;
  timestamp?: number;
}

interface OnchainScoreSubmissionResponse {
  success: boolean;
  message?: string;
  transactionHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  gameId?: string;
  leaderboardUrl?: string;
  error?: string;
  details?: string;
}

export function useOnchainScoreSubmission() {
  return useMutation({
    mutationFn: async (data: OnchainScoreSubmissionRequest): Promise<OnchainScoreSubmissionResponse> => {
      const response = await api.post<OnchainScoreSubmissionResponse>(
        apiEndpoints.submitScoreOnchain,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        console.log('Score submitted on-chain successfully:', {
          transactionHash: data.transactionHash,
          blockNumber: data.blockNumber,
          gasUsed: data.gasUsed,
          gameId: data.gameId
        });
      } else {
        console.error('On-chain score submission failed:', data.error);
      }
    },
    onError: (error) => {
      console.error('Error submitting score on-chain:', error);
    },
  });
}

// Utility hook to submit score with automatic retry logic
export function useOnchainScoreSubmissionWithRetry() {
  const mutation = useOnchainScoreSubmission();

  const submitWithRetry = async (
    walletAddress: string,
    score: number,
    transactionCount: number,
    maxRetries: number = 3,
    timestamp?: number
  ) => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await mutation.mutateAsync({
          walletAddress,
          score,
          transactionCount,
          timestamp: timestamp || Date.now()
        });
        
        if (result.success) {
          return result;
        } else {
          // If we get a response but it failed, don't retry as the transaction may have been processed
          // Only retry on network/API errors, not blockchain transaction failures
          console.error('On-chain submission failed (no retry):', result.error);
          throw new Error(result.error || 'Blockchain transaction failed');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Only retry on network/connection errors, not on blockchain transaction errors
        const isNetworkError = error instanceof Error && (
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('500')
        );
        
        if (!isNetworkError) {
          console.error('Non-retryable error:', error);
          throw lastError;
        }
        
        console.warn(`Network error on attempt ${attempt}, will retry:`, error);
      }
      
      // Wait before retry (exponential backoff) - only for network errors
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  };

  return {
    ...mutation,
    submitWithRetry,
    isSubmitting: mutation.isPending
  };
}