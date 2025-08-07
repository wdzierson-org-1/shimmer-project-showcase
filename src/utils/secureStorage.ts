/**
 * Secure client-side storage utilities
 */

/**
 * Secure wrapper for localStorage with encryption and validation
 */
export class SecureStorage {
  private static readonly prefix = 'secure_';
  private static readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Simple XOR encryption for basic obfuscation
   * Note: This is not cryptographically secure, just prevents casual inspection
   */
  private static encrypt(data: string): string {
    const key = 'lovable_portfolio_key';
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  private static decrypt(encryptedData: string): string {
    try {
      const data = atob(encryptedData);
      const key = 'lovable_portfolio_key';
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch {
      return '';
    }
  }

  /**
   * Securely store data with expiration
   */
  static setItem(key: string, value: any, ttl?: number): void {
    try {
      const now = Date.now();
      const expiry = ttl ? now + ttl : now + this.maxAge;
      
      const item = {
        value,
        expiry,
        timestamp: now
      };
      
      const serialized = JSON.stringify(item);
      const encrypted = this.encrypt(serialized);
      
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      console.warn('Failed to store secure item:', error);
    }
  }

  /**
   * Securely retrieve data with expiration check
   */
  static getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;

      const decrypted = this.decrypt(encrypted);
      if (!decrypted) return null;

      const item = JSON.parse(decrypted);
      
      // Check expiration
      if (Date.now() > item.expiry) {
        this.removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn('Failed to retrieve secure item:', error);
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove secure item
   */
  static removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Clear all secure items
   */
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if an item exists and is not expired
   */
  static hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get remaining TTL for an item in milliseconds
   */
  static getTTL(key: string): number {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return 0;

      const decrypted = this.decrypt(encrypted);
      if (!decrypted) return 0;

      const item = JSON.parse(decrypted);
      return Math.max(0, item.expiry - Date.now());
    } catch {
      return 0;
    }
  }
}

/**
 * Session-specific storage that clears when tab/window closes
 */
export class SecureSessionStorage {
  private static readonly prefix = 'session_secure_';

  static setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify({
        value,
        timestamp: Date.now()
      });
      
      sessionStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.warn('Failed to store session item:', error);
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      return parsed.value;
    } catch (error) {
      console.warn('Failed to retrieve session item:', error);
      this.removeItem(key);
      return null;
    }
  }

  static removeItem(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  static clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}