import type { MouseEvent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

interface Canvas2DProps {
  draw: DrawFn;
  height?: number;
  className?: string;
  deps?: unknown[];
  onMouseMove?: (e: MouseEvent<HTMLCanvasElement>, rect: DOMRect) => void;
  onMouseLeave?: () => void;
}

export function Canvas2D({
  draw,
  height = 300,
  className = '',
  deps = [],
  onMouseMove,
  onMouseLeave,
}: Canvas2DProps) {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const canvasRef = useCanvas(draw, deps);

  const handleMouseMove = onMouseMove
    ? (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onMouseMove(e, rect);
      }
    : undefined;

  return (
    <div className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        height={height * dpr}
        style={{ width: '100%', height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={onMouseLeave}
      />
    </div>
  );
}
