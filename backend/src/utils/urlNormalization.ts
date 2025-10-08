/**
 * URL Normalization Utilities
 * Handles automatic URL normalization for Guest Blog Sites
 */

/**
 * Normalizes a URL input according to the following rules:
 * - If no protocol is specified, defaults to https://
 * - If http:// is explicitly provided, preserves it
 * - If https:// is explicitly provided, preserves it
 * - Validates the final URL format
 */
export const normalizeUrl = (input: string): string => {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid URL input');
  }

  // Trim whitespace
  const trimmed = input.trim();
  
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }

  // Check if URL already has a protocol
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  
  let normalizedUrl: string;
  
  if (hasProtocol) {
    // User explicitly provided protocol, preserve it
    normalizedUrl = trimmed;
  } else {
    // No protocol provided, default to https://
    normalizedUrl = `https://${trimmed}`;
  }

  // Validate the final URL format
  try {
    const urlObj = new URL(normalizedUrl);
    
    // Ensure it has a valid hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      throw new Error('Invalid hostname');
    }
    
    // Ensure hostname contains at least one dot (domain.tld)
    if (!urlObj.hostname.includes('.')) {
      throw new Error('Invalid domain format');
    }
    
    // Return the normalized URL
    return urlObj.toString();
  } catch (error) {
    throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validates if a URL is properly formatted after normalization
 */
export const validateNormalizedUrl = (url: string): boolean => {
  try {
    normalizeUrl(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extracts domain from a URL (for display purposes)
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url; // Return original if parsing fails
  }
};

/**
 * Examples of normalization:
 * - "example.com" → "https://example.com"
 * - "http://example.com" → "http://example.com" (preserved)
 * - "https://example.com" → "https://example.com" (preserved)
 * - "www.example.com" → "https://www.example.com"
 * - "example.com/path" → "https://example.com/path"
 */
