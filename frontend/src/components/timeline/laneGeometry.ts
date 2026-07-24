const LANE_WIDTH = 16;
const LANE_START_X = 10;

/** X-coordinate for a given lane, in the coordinate space every row's
 *  gutter SVG shares. */
export const laneX = (lane: number): number => LANE_START_X + lane * LANE_WIDTH;

/** Total pixel width the gutter needs to render every lane touched anywhere
 *  in the timeline — must be computed once from the full row set (not per
 *  row) so every row's SVG shares the same coordinate space and lanes line
 *  up as stable vertical columns from row to row. */
export function laneGutterWidth(totalLanes: number): number {
  return LANE_START_X * 2 + Math.max(totalLanes, 1) * LANE_WIDTH;
}
