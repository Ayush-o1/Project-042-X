import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** Tracks an element's content-box size via ResizeObserver — used by the
 *  Architecture treemap, which needs real pixel dimensions to compute its
 *  layout (percentage-based CSS can't feed a squarify algorithm). */
export function useElementSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      setSize(box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
