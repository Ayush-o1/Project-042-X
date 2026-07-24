import { memo } from 'react';
import { laneColor } from './commitLanes';
import { laneX, laneGutterWidth } from './laneGeometry';

interface LaneGutterProps {
  /** This row's own lane. */
  lane: number;
  /** Other lanes with a lineage passing straight through this row's full
   *  height — rendered as a plain vertical line, no dot. */
  throughLanes: number[];
  /** Extra parent lanes a merge commit's dot connects down into, beyond the
   *  one its own lane continues into. */
  mergeIntoLanes?: number[];
  /** Whether this row's own lane continues into the row below (false for a
   *  root commit, or the oldest row in a filtered/capped window). */
  continuesBelow: boolean;
  /** Whether this row has anything to draw at its own lane at all — false
   *  for an expanded (non-collapsed) day header, which is a pure label with
   *  no commit of its own; its lane is drawn as a plain through-line instead. */
  showOwnDot: boolean;
  /** Collapsed day headers render as a diamond (a marker standing in for
   *  many commits) instead of a single commit's circle. */
  shape?: 'circle' | 'diamond';
  totalLanes: number;
  rowHeight: number;
}

/** Renders one row's slice of the branch-lane gutter. Adjacent rows'
 *  segments line up into a continuous graph purely because every row uses
 *  the same fixed lane → x-position mapping — there is no layout algorithm
 *  deciding position, which is deliberate: see the timeline redesign's
 *  finding that letting a generic graph layout choose x-position is what
 *  broke the previous implementation's branch visualization. */
export const LaneGutter = memo(({
  lane, throughLanes, mergeIntoLanes = [], continuesBelow, showOwnDot,
  shape = 'circle', totalLanes, rowHeight,
}: LaneGutterProps) => {
  const width = laneGutterWidth(totalLanes);
  const half = rowHeight / 2;
  const ownX = laneX(lane);
  const ownColor = laneColor(lane);

  return (
    <svg
      width={width}
      height={rowHeight}
      viewBox={`0 0 ${width} ${rowHeight}`}
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {throughLanes.map(l => (
        <line
          key={`through-${l}`}
          x1={laneX(l)} x2={laneX(l)} y1={0} y2={rowHeight}
          stroke={laneColor(l)} strokeWidth={2} opacity={0.5}
        />
      ))}

      {!showOwnDot && (
        <line x1={ownX} x2={ownX} y1={0} y2={rowHeight} stroke={ownColor} strokeWidth={2} opacity={0.5} />
      )}

      {showOwnDot && (
        <>
          <line x1={ownX} x2={ownX} y1={0} y2={half} stroke={ownColor} strokeWidth={2} />
          {continuesBelow && (
            <line x1={ownX} x2={ownX} y1={half} y2={rowHeight} stroke={ownColor} strokeWidth={2} />
          )}
          {mergeIntoLanes.map(l => (
            <path
              key={`merge-${l}`}
              d={`M ${ownX} ${half} C ${ownX} ${rowHeight}, ${laneX(l)} ${half}, ${laneX(l)} ${rowHeight}`}
              fill="none" stroke={ownColor} strokeWidth={2}
            />
          ))}
          {shape === 'diamond' ? (
            <rect
              x={ownX - 5} y={half - 5} width={10} height={10}
              transform={`rotate(45 ${ownX} ${half})`}
              fill={ownColor} stroke="var(--bg-app)" strokeWidth={2}
            />
          ) : (
            <circle cx={ownX} cy={half} r={5} fill={ownColor} stroke="var(--bg-app)" strokeWidth={2} />
          )}
        </>
      )}
    </svg>
  );
});

LaneGutter.displayName = 'LaneGutter';
