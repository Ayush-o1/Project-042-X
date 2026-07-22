/** Shared deterministic author → color mapping used by the git timeline and insights. */
export const AUTHOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6'
];

export function hashAuthor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AUTHOR_PALETTE[Math.abs(h) % AUTHOR_PALETTE.length];
}
