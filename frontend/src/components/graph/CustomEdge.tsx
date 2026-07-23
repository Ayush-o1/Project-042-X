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

  let strokeColor = 'var(--border-focus)';
  let strokeWidth = 1.5;
  let animationClass = '';

  if (isOutgoing) {
    strokeColor = 'var(--accent)';
    strokeWidth = 2;
    animationClass = 'animated-edge-outgoing';
  } else if (isIncoming) {
    strokeColor = 'var(--color-success)';
    strokeWidth = 2;
    animationClass = 'animated-edge-incoming';
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
    transition: 'all 300ms ease',
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={customStyle} 
        className={animationClass ? 'react-flow__edge-path ' + animationClass : 'react-flow__edge-path'} 
      />
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
