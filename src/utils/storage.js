/**
 * Utility to completely clear all client-side storage sections:
 * - localStorage
 * - sessionStorage
 * - document.cookie (client-accessible cookies)
 * - CacheStorage (if available)
 */
export const clearAllStorage = () => {
  // 1. Clear localStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }

  // 2. Clear sessionStorage
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
    console.warn('Failed to clear sessionStorage:', e);
  }

  // 3. Clear non-HttpOnly client cookies
  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to clear cookies:', e);
  }

  // 4. Clear CacheStorage (service worker / browser caches)
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      window.caches.keys().then((names) => {
        names.forEach((name) => {
          window.caches.delete(name);
        });
      }).catch((e) => {
        console.warn('Failed to clear CacheStorage:', e);
      });
    }
  } catch (e) {
    console.warn('Failed to clear CacheStorage:', e);
  }
};
