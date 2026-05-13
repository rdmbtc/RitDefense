"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiEndpoints } from "../lib/api";
import {
  EndGameSessionRequest,
  StartGameSessionRequest,
  StartGameSessionResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from "../types";

export function useGameSession(gameSessionToken: string | null) {
  const queryClient = useQueryClient();

  const startGameSession = useMutation({
    mutationFn: async (
      data: StartGameSessionRequest
    ): Promise<StartGameSessionResponse> => {
      const response = await api.post<StartGameSessionResponse>(
        apiEndpoints.startGameSession,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries when session starts
      queryClient.invalidateQueries({ queryKey: ["playerTotalScore"] });
    },
  });

  const endGameSession = useMutation({
    mutationFn: async (data: EndGameSessionRequest): Promise<void> => {
      if (!gameSessionToken) {
        throw new Error("No session token available");
      }
      await api.post(apiEndpoints.endGameSession, data, {
        headers: {
          Authorization: `Bearer ${gameSessionToken}`,
        },
      });
    },
    onSuccess: () => {
      // Invalidate related queries when session ends
      queryClient.invalidateQueries({ queryKey: ["playerTotalScore"] });
    },
  });

  const submitScore = useMutation({
    mutationFn: async (
      data: SubmitScoreRequest
    ): Promise<SubmitScoreResponse> => {
      if (!gameSessionToken) {
        throw new Error("No session token available");
      }
      
      console.log("Submitting score with data:", data);
      console.log("Using session token:", gameSessionToken);
      
      try {
        const response = await api.post<SubmitScoreResponse>(
          apiEndpoints.submitScore,
          data,
          {
            headers: {
              Authorization: `Bearer ${gameSessionToken}`,
            },
          }
        );
        
        console.log("Score submission response:", response.data);
        return response.data;
      } catch (error: any) {
        console.error("Score submission error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });

        // Handle 401 Unauthorized - token might be expired
        if (error.response?.status === 401) {
          console.log("Token expired, attempting to refresh session...");
          
          // Try to start a new session if we have wallet address
          if (data.player) {
            try {
              console.log("Starting new game session for token refresh...");
              const newSessionResponse = await api.post<StartGameSessionResponse>(
                apiEndpoints.startGameSession,
                { walletAddress: data.player }
              );
              
              if (newSessionResponse.data?.sessionToken) {
                console.log("New session created, retrying score submission...");
                
                // Update the data with new session info
                const updatedData = {
                  ...data,
                  sessionId: newSessionResponse.data.sessionId
                };
                
                // Retry with new token
                const retryResponse = await api.post<SubmitScoreResponse>(
                  apiEndpoints.submitScore,
                  updatedData,
                  {
                    headers: {
                      Authorization: `Bearer ${newSessionResponse.data.sessionToken}`,
                    },
                  }
                );
                
                console.log("Score submission successful after token refresh:", retryResponse.data);
                
                // Trigger a callback to update the session token in the parent component
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('sessionTokenRefreshed', {
                    detail: {
                      sessionToken: newSessionResponse.data.sessionToken,
                      sessionId: newSessionResponse.data.sessionId
                    }
                  }));
                }
                
                return retryResponse.data;
              }
            } catch (refreshError: any) {
              console.error("Failed to refresh session:", refreshError);
              throw new Error("Session expired and refresh failed. Please restart the game.");
            }
          }
        }
        
        throw new Error(`Submission failed: ${error.response?.data?.error || error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate player score queries when score is submitted
      queryClient.invalidateQueries({ queryKey: ["playerTotalScore"] });
    },
  });

  return {
    startGameSession,
    endGameSession,
    submitScore,
  };
}
