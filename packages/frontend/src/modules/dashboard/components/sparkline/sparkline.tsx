import clsx from 'clsx';
import { type KeyboardEvent, type PointerEvent, useId, useMemo, useRef, useState } from 'react';
import './sparkline.css';

type Props = {
  timestamps: number[];
  values: number[];
  /** Upper bound of the y axis, defaults to the highest value plus some headroom */
  max?: number;
  height?: number;
  label: string;
  formatValue: (value: number) => string;
  formatTimestamp: (timestamp: number) => string;
  className?: string;
};

const WIDTH = 100;

/**
 * Compact single series area chart with a crosshair and tooltip on hover and keyboard focus.
 */
export const Sparkline = ({ timestamps, values, max, height = 40, label, formatValue, formatTimestamp, className }: Props) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  const count = Math.min(timestamps.length, values.length);
  const first = timestamps[0] ?? 0;
  const span = Math.max((timestamps[count - 1] ?? 0) - first, 1);
  // Without a fixed max, leave headroom so a flat line does not read as "full"
  const yMax = max ?? Math.max(Math.max(...values.slice(0, count)) * 1.25, 1e-9);

  const points = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: count === 1 ? WIDTH : (((timestamps[i] ?? first) - first) / span) * WIDTH,
      y: height - (Math.min(values[i] ?? 0, yMax) / yMax) * (height - 2) - 1,
    }));
  }, [count, timestamps, values, first, span, yMax, height]);

  if (count < 2) {
    return <div className={clsx('sparkline sparkline-empty', className)} style={{ height }} aria-hidden="true" />;
  }

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const area = `${line} L${WIDTH},${height} L0,${height} Z`;

  const findNearest = (ratio: number) => {
    const target = first + ratio * span;
    let nearest = 0;
    for (let i = 1; i < count; i++) {
      if (Math.abs((timestamps[i] ?? 0) - target) < Math.abs((timestamps[nearest] ?? 0) - target)) nearest = i;
    }
    return nearest;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    setActiveIndex(findNearest(Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const current = activeIndex ?? count - 1;
    setActiveIndex(Math.min(Math.max(current + (e.key === 'ArrowLeft' ? -1 : 1), 0), count - 1));
  };

  const active = activeIndex !== null ? points[activeIndex] : null;
  const activeLeft = active ? (active.x / WIDTH) * 100 : 0;
  const lastValue = values[count - 1] ?? 0;

  return (
    <div
      ref={containerRef}
      className={clsx('sparkline', className)}
      style={{ height }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(count - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={onKeyDown}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: allows reading values with the keyboard
      tabIndex={0}
      role="img"
      aria-label={`${label}: ${formatValue(lastValue)}`}
    >
      <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} stroke="none" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      {active && activeIndex !== null && (
        <>
          <div className="sparkline-crosshair" style={{ left: `${activeLeft}%` }} />
          <div className="sparkline-dot" style={{ left: `${activeLeft}%`, top: active.y }} />
          <div
            className={clsx('sparkline-tooltip', { 'sparkline-tooltip-start': activeLeft < 25, 'sparkline-tooltip-end': activeLeft > 75 })}
            style={{ left: `${activeLeft}%` }}
          >
            <strong>{formatValue(values[activeIndex] ?? 0)}</strong>
            <span className="text-secondary">{formatTimestamp(timestamps[activeIndex] ?? 0)}</span>
          </div>
        </>
      )}
    </div>
  );
};
