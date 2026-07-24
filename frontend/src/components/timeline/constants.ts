export type RowDensity = 'comfortable' | 'compact';

/** Base (collapsed) row heights per density mode — the gutter's SVG is sized
 *  to exactly this, regardless of whether a commit row is expanded, so lane
 *  dots stay vertically centered on the collapsed row content and expanded
 *  detail renders as extra space below the gutter's base segment. */
export const ROW_HEIGHT: Record<RowDensity, number> = {
  comfortable: 56,
  compact: 40,
};

export const HEADER_ROW_HEIGHT = 36;
