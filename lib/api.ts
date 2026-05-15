"use client";

import axios from "axios";
import { addSignatureToHeaders } from "../utils/signature";

// CSRF Token Management
class CSRFManager {
  private token: string | null = null;
  private expires: Date | null = null;

  async fetchToken(): Promise<string> {
    try {
      const response = await fetch(`/api/proxy/csrf-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      this.token = data.csrfToken;
      this.expires = new Date(data.expires);
      
      return this.token!;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  async getToken(): Promise<string> {
    if (this.token && this.expires && new Date() < this.expires) {
      return this.token;
    }
    return await this.fetchToken();
  }

  clearToken(): void {
    this.token = null;
    this.expires = null;
  }
}

// Use local proxy for all requests to avoid CORS
const baseURL = ""; 
const csrfManager = new CSRFManager();

// Create axios instance with base configuration
export const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add CSRF tokens and signatures
api.interceptors.request.use(
  async (config) => {
    // Add CSRF token for state-changing operations
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      try {
        const token = await csrfManager.getToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
      }
    }
    
    // Add request signature for score submission endpoints
    if (config.url?.includes('/submit-score') && config.data) {
      try {
        const signedHeaders = addSignatureToHeaders(config.data, config.headers as Record<string, string>);
        config.headers = signedHeaders as any;
      } catch (error) {
        console.error('Failed to generate request signature:', error);
      }
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  async (error) => {
    // Handle CSRF token errors
    if (error.response?.status === 403) {
      const errorData = error.response?.data;
      if (errorData?.code === 'CSRF_INVALID' || errorData?.code === 'CSRF_MISSING') {
        console.warn('CSRF token invalid, refreshing and retrying...');
        csrfManager.clearToken();
        
        try {
          const token = await csrfManager.getToken();
          error.config.headers['X-CSRF-Token'] = token;
          return api.request(error.config);
        } catch (retryError) {
          console.error('Failed to retry request with new CSRF token:', retryError);
          return Promise.reject(error);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints updated to use local proxy routes
export const apiEndpoints = {
  checkWallet: "/api/proxy/check-wallet",
  getPlayerTotalScore: "/api/proxy/get-player-total-score",
  startGameSession: "/api/proxy/start-game-session",
  endGameSession: "/api/proxy/end-game-session",
  submitScore: "/api/proxy/submit-score",
  submitScoreOnchain: "/api/proxy/submit-score-onchain",
  leaderBoard: "/api/proxy/leaderboard",
  playerRank: "/api/proxy/leaderboard/rank",
} as const;
