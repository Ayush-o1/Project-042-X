import { memo } from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export const CustomEdge = memo(({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isIncoming = data?.isIncoming;
  const isOutgoing = data?.isOutgoing;
  const isDimmed = data?.isDimmed;
  // Set for ~400ms right after a new focus is selected, on edges leaving
  // the new center — the one deliberate moment motion is used to draw the
  // eye along the dependency chain. Everything else is static at rest.
  const isPulsing = data?.pulse;

  let strokeColor = 'var(--border-focus)';
  let strokeWidth = 1.5;

  if (isOutgoing) {
    strokeColor = 'var(--accent)';
    strokeWidth = 2;
  } else if (isIncoming) {
    strokeColor = 'var(--color-success)';
    strokeWidth = 2;
  }

  if (isDimmed) {
    strokeColor = 'var(--border-focus)';
    strokeWidth = 1;
  }

  const customStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
    opacity: isDimmed ? 0.1 : 1,
    transition: 'stroke 200ms ease, stroke-width 200ms ease, opacity 300ms ease',
  };

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={customStyle}
      className={isPulsing ? 'react-flow__edge-path edge-pulse-once' : 'react-flow__edge-path'}
    />
  );
});

CustomEdge.displayName = 'CustomEdge';
