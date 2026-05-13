"use client";

import axios from "axios";
import { addSignatureToHeaders } from "../utils/signature";

// CSRF Token Management
class CSRFManager {
  private token: string | null = null;
  private expires: Date | null = null;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
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

// Create CSRF manager instance
const baseURL = process.env.NODE_ENV === "production" 
  ? process.env.NEXT_PUBLIC_API_URL || "https://inland-grete-mondefense-9eee18bb.koyeb.app/"
  : process.env.NEXT_PUBLIC_DEV_API_URL || "http://localhost:3001";

const csrfManager = new CSRFManager(baseURL);

// Create axios instance with base configuration
export const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true, // Include cookies for session management
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
        // Continue without token - let the server handle the error
      }
    }
    
    // Add request signature for score submission endpoints
    if (config.url?.includes('/submit-score') && config.data) {
      try {
        const signedHeaders = addSignatureToHeaders(config.data, config.headers as Record<string, string>);
        config.headers = signedHeaders as any;
      } catch (error) {
        console.error('Failed to generate request signature:', error);
        // Continue without signature - server will handle as optional
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
        
        // Retry the request with a new token
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
    
    // Handle other common errors
    if (error.response?.status === 401) {
      console.error("Unauthorized request");
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  checkWallet: "/api/check-wallet",
  getPlayerTotalScore: "/api/get-player-total-score",
  startGameSession: "/api/start-game-session",
  endGameSession: "/api/end-game-session",
  submitScore: "/api/submit-score",
  submitScoreOnchain: "/api/submit-score-onchain",
  leaderBoard: "/api/leaderboard",
  playerRank: "/api/leaderboard/rank",
} as const;
