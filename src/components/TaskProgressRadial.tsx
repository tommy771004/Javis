import React, { useRef } from 'react';
import { clampTaskProgress, resolveRadialProgressFromPoint } from '../services/hermesDashboardInteractions';

interface TaskProgressRadialProps {
  progress: number;
  disabled?: boolean;
  onChange: (progress: number) => void;
  onDragStart?: () => void;
  onDragEnd?: (progress: number) => void | Promise<void>;
}

function polarToCartesian(cx: number, cy: number, radius: number, progress: number) {
  const angle = (progress / 100) * Math.PI * 2 - Math.PI / 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function describeArc(cx: number, cy: number, radius: number, progress: number) {
  if (progress <= 0) {
    return '';
  }

  if (progress >= 100) {
    return [
      `M ${cx} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`,
      `A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius}`,
    ].join(' ');
  }

  const start = polarToCartesian(cx, cy, radius, 0);
  const end = polarToCartesian(cx, cy, radius, progress);
  const largeArcFlag = progress > 50 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function TaskProgressRadial({
  progress,
  disabled = false,
  onChange,
  onDragStart,
  onDragEnd,
}: TaskProgressRadialProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);
  const latestProgressRef = useRef(clampTaskProgress(progress));

  latestProgressRef.current = clampTaskProgress(progress);

  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!svgRef.current) {
      return latestProgressRef.current;
    }

    const rect = svgRef.current.getBoundingClientRect();
    const nextProgress = resolveRadialProgressFromPoint({
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      clientX,
      clientY,
      step: 5,
    });

    latestProgressRef.current = nextProgress;
    onChange(nextProgress);
    return nextProgress;
  };

  const finishDrag = async () => {
    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    await onDragEnd?.(latestProgressRef.current);
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 120"
      className={`h-[72px] w-[72px] ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        isDraggingRef.current = true;
        svgRef.current?.setPointerCapture(event.pointerId);
        onDragStart?.();
        updateFromPointer(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (!isDraggingRef.current || disabled) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        updateFromPointer(event.clientX, event.clientY);
      }}
      onPointerUp={async (event) => {
        if (disabled) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        svgRef.current?.releasePointerCapture(event.pointerId);
        await finishDrag();
      }}
      onPointerCancel={async () => {
        await finishDrag();
      }}
    >
      <circle cx="60" cy="60" r="44" fill="rgba(2, 13, 6, 0.75)" stroke="rgba(6, 78, 59, 0.7)" strokeWidth="8" />
      <path
        d={describeArc(60, 60, 44, clampTaskProgress(progress))}
        fill="none"
        stroke="rgba(16, 185, 129, 0.95)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle
        cx={polarToCartesian(60, 60, 44, clampTaskProgress(progress)).x}
        cy={polarToCartesian(60, 60, 44, clampTaskProgress(progress)).y}
        r="5"
        fill="rgba(167, 243, 208, 0.95)"
        stroke="rgba(6, 95, 70, 0.8)"
        strokeWidth="2"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-emerald-300 text-[18px] font-bold">
        {clampTaskProgress(progress)}%
      </text>
      <text x="60" y="73" textAnchor="middle" className="fill-emerald-600 text-[7px] uppercase tracking-[0.24em] font-bold">
        Drag Sync
      </text>
    </svg>
  );
}
