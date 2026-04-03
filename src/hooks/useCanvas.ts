import { useRef, useEffect, useCallback } from 'react';

type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

export function useCanvas(draw: DrawFn, deps: unknown[] = []) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    const w = rect.width;
    const h = canvas.height / dpr || 300;

    canvas.width = w * dpr;
    canvas.style.width = `${w}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw, ...deps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => redraw());
    observer.observe(parent);
    redraw();

    return () => observer.disconnect();
  }, [redraw]);

  return canvasRef;
}
