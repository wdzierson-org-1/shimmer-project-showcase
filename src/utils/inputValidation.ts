/**
 * Input validation utilities for enhanced security
 */

import DOMPurify from 'dompurify';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

/**
 * Validates and sanitizes HTML content
 */
export function validateAndSanitizeHTML(input: string): ValidationResult {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  if (input.length > 100000) { // 100KB limit
    return { isValid: false, error: 'Content too long (max 100KB)' };
  }

  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Validates project title
 */
export function validateProjectTitle(title: string): ValidationResult {
  if (typeof title !== 'string') {
    return { isValid: false, error: 'Title must be a string' };
  }

  const trimmed = title.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Title is required' };
  }

  if (trimmed.length > 200) {
    return { isValid: false, error: 'Title too long (max 200 characters)' };
  }

  // Basic XSS protection - no script tags or javascript:
  if (/<script|javascript:|data:|vbscript:/i.test(trimmed)) {
    return { isValid: false, error: 'Invalid characters in title' };
  }

  return { isValid: true, sanitizedValue: trimmed };
}

/**
 * Validates client name
 */
export function validateClientName(client: string): ValidationResult {
  if (typeof client !== 'string') {
    return { isValid: false, error: 'Client name must be a string' };
  }

  const trimmed = client.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Client name is required' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Client name too long (max 100 characters)' };
  }

  // Basic XSS protection
  if (/<script|javascript:|data:|vbscript:/i.test(trimmed)) {
    return { isValid: false, error: 'Invalid characters in client name' };
  }

  return { isValid: true, sanitizedValue: trimmed };
}

/**
 * Validates URL
 */
export function validateURL(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: true, sanitizedValue: '' }; // URLs are optional
  }

  if (typeof url !== 'string') {
    return { isValid: false, error: 'URL must be a string' };
  }

  const trimmed = url.trim();

  if (trimmed.length > 2048) {
    return { isValid: false, error: 'URL too long (max 2048 characters)' };
  }

  try {
    const urlObj = new URL(trimmed);
    
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    return { isValid: true, sanitizedValue: trimmed };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates year
 */
export function validateYear(year: number): ValidationResult {
  if (typeof year !== 'number' || isNaN(year)) {
    return { isValid: false, error: 'Year must be a valid number' };
  }

  const currentYear = new Date().getFullYear();
  const minYear = 1900;

  if (year < minYear || year > currentYear + 5) {
    return { isValid: false, error: `Year must be between ${minYear} and ${currentYear + 5}` };
  }

  return { isValid: true, sanitizedValue: year.toString() };
}

/**
 * Validates tags array
 */
export function validateTags(tags: string[]): ValidationResult {
  if (!Array.isArray(tags)) {
    return { isValid: false, error: 'Tags must be an array' };
  }

  if (tags.length > 20) {
    return { isValid: false, error: 'Too many tags (max 20)' };
  }

  const sanitizedTags: string[] = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { isValid: false, error: 'Each tag must be a string' };
    }

    const trimmed = tag.trim();
    
    if (trimmed.length === 0) {
      continue; // Skip empty tags
    }

    if (trimmed.length > 50) {
      return { isValid: false, error: 'Tag too long (max 50 characters)' };
    }

    // Basic XSS protection
    if (/<script|javascript:|data:|vbscript:/i.test(trimmed)) {
      return { isValid: false, error: 'Invalid characters in tag' };
    }

    sanitizedTags.push(trimmed);
  }

  return { isValid: true, sanitizedValue: sanitizedTags as any };
}

/**
 * Rate limiting for user actions
 */
export class RateLimiter {
  private static attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  static isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if within limits
    if (record.count >= maxAttempts) {
      return false;
    }
    
    // Increment counter
    record.count++;
    record.lastAttempt = now;
    return true;
  }
  
  static getRemainingTime(key: string, windowMs: number = 60000): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, windowMs - elapsed);
  }
}