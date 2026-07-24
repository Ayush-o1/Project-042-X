export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Squarified treemap (Bruls, Huizing & van Wijk) — lays out rectangles
 * whose areas are proportional to `items[i].value`, keeping aspect ratios
 * close to square instead of degenerating into thin slivers the way a
 * naive slice-and-dice layout does on skewed data (a repo with one huge
 * folder and a dozen tiny ones is the common case here). Returns rects in
 * the same order as `items`.
 */
export function computeTreemap(items: { value: number }[], width: number, height: number): TreemapRect[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  const total = items.reduce((sum, item) => sum + Math.max(item.value, 0.0001), 0);
  const scale = (width * height) / total;
  const values = items.map(item => Math.max(item.value, 0.0001) * scale);

  const order = values.map((_, i) => i).sort((a, b) => values[b] - values[a]);
  let remainingIdx = order;
  let remainingValues = order.map(i => values[i]);

  const result: TreemapRect[] = new Array(items.length);

  const worst = (row: number[], shortSide: number): number => {
    const rowSum = row.reduce((a, b) => a + b, 0);
    const rowMax = Math.max(...row);
    const rowMin = Math.min(...row);
    return Math.max(
      (shortSide * shortSide * rowMax) / (rowSum * rowSum),
      (rowSum * rowSum) / (shortSide * shortSide * rowMin),
    );
  };

  let x = 0, y = 0, w = width, h = height;

  while (remainingValues.length > 0) {
    const shortSide = Math.min(w, h);
    let row = [remainingValues[0]];
    let i = 1;
    while (i < remainingValues.length) {
      const candidate = [...row, remainingValues[i]];
      if (worst(row, shortSide) >= worst(candidate, shortSide)) {
        row = candidate;
        i++;
      } else {
        break;
      }
    }
    const rowIdxs = remainingIdx.slice(0, row.length);
    const rowSum = row.reduce((a, b) => a + b, 0);

    if (w >= h) {
      const stripWidth = rowSum / h;
      let cy = y;
      row.forEach((v, k) => {
        const rectHeight = v / stripWidth;
        result[rowIdxs[k]] = { x, y: cy, width: stripWidth, height: rectHeight };
        cy += rectHeight;
      });
      x += stripWidth;
      w -= stripWidth;
    } else {
      const stripHeight = rowSum / w;
      let cx = x;
      row.forEach((v, k) => {
        const rectWidth = v / stripHeight;
        result[rowIdxs[k]] = { x: cx, y, width: rectWidth, height: stripHeight };
        cx += rectWidth;
      });
      y += stripHeight;
      h -= stripHeight;
    }

    remainingIdx = remainingIdx.slice(row.length);
    remainingValues = remainingValues.slice(row.length);
  }

  return result;
}
