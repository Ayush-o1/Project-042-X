const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
];
const DANGER = hexToRgb('#f87171');
const WARNING = hexToRgb('#fbbf24');
const SUCCESS = hexToRgb('#34d399');

/** Continuous green→amber→red gradient for a 0–100 health score — shared by
 *  the Architecture treemap and the focus canvas's node coloring so a
 *  folder's color and its files' colors read as the same scale. */
export function healthToColor(score: number): string {
  const t = Math.max(0, Math.min(100, score)) / 100;
  const [from, to] = t >= 0.5 ? [WARNING, SUCCESS] : [DANGER, WARNING];
  const localT = t >= 0.5 ? (t - 0.5) * 2 : t * 2;
  return `rgb(${lerp(from[0], to[0], localT)}, ${lerp(from[1], to[1], localT)}, ${lerp(from[2], to[2], localT)})`;
}
