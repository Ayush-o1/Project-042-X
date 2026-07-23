import { useEffect, useRef, useState } from 'react';

const PREFIX = '042x:';

/**
 * Same contract as useState, but the value is read from and written back to
 * localStorage under `042x:<key>`, so it survives reloads. Used for durable
 * user preferences (sidebar collapse, graph filter defaults) — never for
 * analysis data itself, which already has its own IndexedDB session engine.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const storageKey = PREFIX + key;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Avoids re-reading defaultValue's identity on every render triggering a
  // write; only `value` changes should persist.
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  useEffect(() => {
    try {
      localStorage.setItem(storageKeyRef.current, JSON.stringify(value));
    } catch {
      // Storage full or unavailable (e.g. private browsing) — preference
      // just won't persist across reloads, nothing else depends on it.
    }
  }, [value]);

  return [value, setValue];
}
