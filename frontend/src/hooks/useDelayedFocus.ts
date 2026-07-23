import { useEffect } from 'react';

const AUTOFOCUS_DELAY_MS = 50;

/**
 * Focuses `ref` shortly after `isActive` becomes true — the delay gives a
 * just-mounted modal's opening animation a moment to finish before focus
 * moves. Every modal (Settings, Session History, Compare Snapshots, Command
 * Palette) uses this to focus its close button or primary input on open.
 */
export function useDelayedFocus(ref: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => ref.current?.focus(), AUTOFOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isActive, ref]);
}
