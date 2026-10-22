// Ultra-lightweight Cookie & Storage Optimizer for Maria AI
// Enforces ~1 byte / data micro-footprint to prevent HTTP header bloat and ensure lightning-fast website performance.

export const MICRO_COOKIE_KEYS = {
  VERSION: 'v',     // '1' (1 byte)
  THEME_FLAG: 't',  // '0' = light, '1' = dark (1 byte)
  AUDIO_READY: 'a', // '1' (1 byte)
} as const;

/**
 * Clean up bloated cookies and enforce 1-byte micro cookies
 */
export function optimizeCookies(): void {
  if (typeof document === 'undefined') return;

  try {
    const rawCookies = document.cookie;
    if (!rawCookies) {
      // Set initial 1-byte marker cookie
      document.cookie = `${MICRO_COOKIE_KEYS.VERSION}=1; path=/; max-age=31536000; SameSite=Lax`;
      return;
    }

    const cookiePairs = rawCookies.split(';');
    for (const pair of cookiePairs) {
      const parts = pair.trim().split('=');
      const name = parts[0]?.trim();
      const val = parts[1]?.trim() || '';

      // If a cookie has more than 16 bytes of value and is not a critical auth cookie, prune it
      if (val.length > 16 && !name.startsWith('__Host-') && !name.startsWith('__Secure-')) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    }

    // Ensure lean 1-byte version cookie is present
    document.cookie = `${MICRO_COOKIE_KEYS.VERSION}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    // Fail silently
  }
}

/**
 * Set an ultra-lightweight micro cookie (value strictly clamped to 1 byte)
 */
export function setMicroCookie(key: string, value: string): void {
  if (typeof document === 'undefined') return;
  try {
    // Strictly limit value to 1 character (1 byte)
    const singleByteVal = String(value || '1').slice(0, 1);
    document.cookie = `${key.slice(0, 4)}=${singleByteVal}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

/**
 * Read a micro cookie value
 */
export function getMicroCookie(key: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const prefix = `${key.slice(0, 4)}=`;
    const pairs = document.cookie.split(';');
    for (const p of pairs) {
      const trimmed = p.trim();
      if (trimmed.startsWith(prefix)) {
        return trimmed.substring(prefix.length).slice(0, 1);
      }
    }
  } catch {}
  return null;
}

/**
 * Prune bloated localStorage entries (like old temporary base64 files or verbose logs)
 */
export function pruneLocalStorageBloat(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // If any lingering key has huge data (> 50KB) and is not essential settings
      if (key !== 'maria_settings' && key !== 'maria_theme') {
        const item = localStorage.getItem(key);
        if (item && item.length > 50000) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
