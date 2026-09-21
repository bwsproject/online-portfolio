/**
 * IndexedDB + LocalStorage Unified Persistent Storage Engine
 * Provides resilient, high-capacity client storage for rich media and base64 images,
 * eliminating browser LocalStorage 5MB QuotaExceededError crashes while ensuring
 * instant persistence across page refreshes and browser reloads.
 */

const DB_NAME = 'berly_portfolio_db';
const DB_VERSION = 1;
const STORE_NAME = 'keyval_store';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const StorageEngine = {
  /**
   * Save an item persistently to IndexedDB with safe LocalStorage fallback
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);

    // 1. Always attempt IndexedDB first (can easily hold 50MB+ of media without quota crash)
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(serialized, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (idbErr) {
      console.warn('IndexedDB write error:', idbErr);
    }

    // 2. Mirror to LocalStorage if possible, safely catching QuotaExceededError
    try {
      localStorage.setItem(key, serialized);
    } catch (lsErr) {
      console.warn(`LocalStorage quota exceeded for key "${key}", safely preserved in IndexedDB.`, lsErr);
    }
  },

  /**
   * Get an item from IndexedDB, falling back to LocalStorage
   */
  async getItem<T>(key: string): Promise<T | null> {
    // 1. Try IndexedDB first
    try {
      const db = await openDB();
      const raw = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch (idbErr) {
      console.warn('IndexedDB read error, falling back to localStorage:', idbErr);
    }

    // 2. Fallback to LocalStorage
    try {
      const local = localStorage.getItem(key);
      if (local) {
        return JSON.parse(local) as T;
      }
    } catch (lsErr) {
      console.warn('LocalStorage read error:', lsErr);
    }

    return null;
  },

  /**
   * Remove an item from both stores
   */
  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (idbErr) {
      console.warn('IndexedDB delete error:', idbErr);
    }

    try {
      localStorage.removeItem(key);
    } catch (lsErr) {
      console.warn('LocalStorage delete error:', lsErr);
    }
  },
};
