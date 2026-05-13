import React from 'react';

/**
 * CSRF Token Management Utility
 * Handles fetching, storing, and including CSRF tokens in API requests
 */

interface CSRFTokenResponse {
  csrfToken: string;
  expires: string;
}

class CSRFManager {
  private token: string | null = null;
  private expires: Date | null = null;
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.NODE_ENV === "production" 
    ? process.env.NEXT_PUBLIC_API_URL || "https://inland-grete-mondefense-9eee18bb.koyeb.app/"
    : process.env.NEXT_PUBLIC_DEV_API_URL || "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches a new CSRF token from the server
   */
  async fetchToken(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFTokenResponse = await response.json();
      this.token = data.csrfToken;
      this.expires = new Date(data.expires);
      
      return this.token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  /**
   * Gets the current CSRF token, fetching a new one if needed
   */
  async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.expires && new Date() < this.expires) {
      return this.token;
    }

    // Fetch a new token
    return await this.fetchToken();
  }

  /**
   * Clears the stored token (useful for logout)
   */
  clearToken(): void {
    this.token = null;
    this.expires = null;
  }

  /**
   * Creates headers object with CSRF token
   */
  async getHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...additionalHeaders
    };
  }

  /**
   * Enhanced fetch wrapper that automatically includes CSRF token
   */
  async secureFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const method = options.method?.toUpperCase() || 'GET';
    
    // Only add CSRF token for state-changing operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const headers = await this.getHeaders(
        options.headers as Record<string, string> || {}
      );
      
      options.headers = headers;
    }

    // Always include credentials for session management
    options.credentials = 'include';

    try {
      const response = await fetch(url, options);
      
      // If we get a CSRF error, try to refresh token and retry once
      if (response.status === 403) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.code === 'CSRF_INVALID' || errorData.code === 'CSRF_MISSING') {
          console.warn('CSRF token invalid, refreshing and retrying...');
          this.clearToken();
          
          // Retry with new token
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const newHeaders = await this.getHeaders(
              options.headers as Record<string, string> || {}
            );
            options.headers = newHeaders;
          }
          
          return await fetch(url, options);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Secure fetch error:', error);
      throw error;
    }
  }

  /**
   * Convenience method for POST requests with CSRF protection
   */
  async post(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.secureFetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * Convenience method for PUT requests with CSRF protection
   */
  async put(url: string, data: any, options: RequestInit = {}): Promise<Response> {
    return this.secureFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * Convenience method for DELETE requests with CSRF protection
   */
  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.secureFetch(url, {
      method: 'DELETE',
      ...options
    });
  }
}

// Create a singleton instance
const csrfManager = new CSRFManager(
  process.env.NODE_ENV === 'production' 
    ? 'https://inland-grete-mondefense-9eee18bb.koyeb.app/api' 
    : '/api'
);

export { CSRFManager, csrfManager };
export default csrfManager;

/**
 * React hook for CSRF token management
 */
export function useCSRF() {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const newToken = await csrfManager.fetchToken();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch CSRF token');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshToken();
  }, []);

  return {
    token,
    loading,
    error,
    refreshToken,
    secureFetch: csrfManager.secureFetch.bind(csrfManager),
    post: csrfManager.post.bind(csrfManager),
    put: csrfManager.put.bind(csrfManager),
    delete: csrfManager.delete.bind(csrfManager)
  };
}