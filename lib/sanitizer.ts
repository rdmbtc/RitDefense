import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(
  dirty: string,
  options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    stripTags?: boolean;
  }
): string {
  // Default configuration for security
  const config: any = {
    ALLOWED_TAGS: options?.allowedTags || [
      'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'
    ],
    ALLOWED_ATTR: options?.allowedAttributes || [
      'class', 'id', 'style'
    ],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true
  };

  // Strip all tags if requested
  if (options?.stripTags) {
    config.ALLOWED_TAGS = [];
    config.KEEP_CONTENT = true;
  }

  return DOMPurify.sanitize(dirty, config) as unknown as string;
}

/**
 * Sanitizes user input text by removing all HTML tags
 * @param input - User input string
 * @returns Plain text without HTML tags
 */
export function sanitizeUserInput(input: string): string {
  return sanitizeHtml(input, { stripTags: true });
}

/**
 * Sanitizes URLs to prevent javascript: and data: schemes
 * @param url - URL string to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  // Remove any potential XSS vectors
  const cleaned = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (cleaned.startsWith('javascript:') || 
      cleaned.startsWith('data:') || 
      cleaned.startsWith('vbscript:') ||
      cleaned.includes('<script')) {
    return '';
  }

  // Allow only http, https, and relative URLs
  if (cleaned.startsWith('http://') || 
      cleaned.startsWith('https://') || 
      cleaned.startsWith('/') ||
      cleaned.startsWith('./') ||
      cleaned.startsWith('../')) {
    return url.trim();
  }

  return '';
}

/**
 * Validates and sanitizes wallet addresses
 * @param address - Wallet address string
 * @returns Sanitized address or empty string if invalid
 */
export function sanitizeWalletAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    return '';
  }

  // Remove any HTML tags and scripts
  const cleaned = sanitizeUserInput(address);
  
  // Basic wallet address validation (Ethereum format)
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (walletRegex.test(cleaned)) {
    return cleaned;
  }

  return '';
}

/**
 * Configuration for DOMPurify in different contexts
 */
export const SANITIZER_CONFIGS = {
  // For user-generated content (comments, descriptions)
  USER_CONTENT: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
  },
  
  // For rich text content (if needed)
  RICH_TEXT: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'div', 'span', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  },
  
  // Strict mode - no HTML allowed
  STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }
};