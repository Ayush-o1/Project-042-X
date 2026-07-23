import { useSyncExternalStore } from 'react';

/**
 * These pixel values are the single source of truth for JS-driven breakpoint
 * logic (e.g. sidebar overlay mode). Keep in sync with the documented
 * breakpoint values in index.css section "1B. RESPONSIVE BREAKPOINTS" —
 * CSS custom properties cannot be referenced inside `@media` conditions, so
 * the two are necessarily separate, but must describe the same tiers.
 */
export const BREAKPOINTS = {
  laptop: 1440,
  smallLaptop: 1280,
  tabletLandscape: 1024,
  tabletPortrait: 768,
  mobile: 480,
} as const;

/** Subscribes to a CSS media query and returns whether it currently matches. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
