import { useState, useCallback, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { Canvas2D } from '../viz/Canvas2D';
import { COLORS } from '../../lib/colors';
import { seededRng } from '../../lib/math';
import { randomVec2D, randomProjections, qjl2D, type Vec2D } from '../../lib/qjl2d';

const N_PROJ = 6;

export function S6QJLExplained() {
  const [targetSeed, setTargetSeed] = useState(1);
  const [projSeed, setProjSeed] = useState(1);
  const [mouseR, setMouseR] = useState<Vec2D | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultR = useMemo(() => randomVec2D(seededRng(targetSeed)), [targetSeed]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const projections = useMemo(() => randomProjections(N_PROJ, seededRng(projSeed)), [projSeed]);

  const r = mouseR ?? defaultR;
  const { signs, recon, directionError } = useMemo(() => qjl2D(r, projections), [r, projections]);

  const handleMouseMove = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const mx = _e.clientX - rect.left;
      const my = _e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = mx - cx;
      const dy = -(my - cy);
      const len = Math.sqrt(dx * dx + dy * dy);
      const sc = Math.min(rect.width, rect.height) * 0.35;
      if (len < 8) {
        setMouseR(null);
      } else {
        const vLen = Math.min(len / sc, 0.8);
        setMouseR([dx / len * vLen, dy / len * vLen]);
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => setMouseR(null), []);

  const draw2D = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const sc = Math.min(w, h) * 0.35;

      // Grid crosshairs
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
      ctx.stroke();

      // Projection lines + sign labels
      for (let i = 0; i < projections.length; i++) {
        const [dx, dy] = projections[i];
        const lx = -dy, ly = dx; // perpendicular to projection direction
        ctx.strokeStyle = signs[i] > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - lx * sc * 1.5, cy + ly * sc * 1.5);
        ctx.lineTo(cx + lx * sc * 1.5, cy - ly * sc * 1.5);
        ctx.stroke();

        ctx.fillStyle = signs[i] > 0 ? COLORS.green : COLORS.red;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        const labelAlong = 1.3;
        const labelOffset = 0.15;
        ctx.fillText(
          signs[i] > 0 ? '+1' : '−1',
          cx + lx * sc * labelAlong + dx * sc * labelOffset,
          cy - ly * sc * labelAlong - dy * sc * labelOffset + 4
        );
      }

      // r — the vector being encoded
      drawArrow(ctx, cx, cy, cx + r[0] * sc, cy - r[1] * sc, COLORS.text, 2.5);
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('r', cx + r[0] * sc + 8, cy - r[1] * sc);

      // r̃ — the reconstruction
      drawArrow(ctx, cx, cy, cx + recon[0] * sc, cy - recon[1] * sc, COLORS.green, 2);
      ctx.fillStyle = COLORS.green;
      ctx.fillText('r̃', cx + recon[0] * sc + 8, cy - recon[1] * sc + 14);

      // Info
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${N_PROJ} projection lines → ${N_PROJ} sign bits`, 8, 16);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`direction error: ${directionError.toFixed(1)}°`, 8, 32);

      if (!mouseR) {
        ctx.fillStyle = COLORS.muted;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('move mouse to set r', w - 8, h - 8);
      }
    },
    [r, mouseR, projections, signs, recon, directionError]
  );

  return (
    <>
      <p className="explanation">
        This is the second key idea in TurboQuant — independent of the rotation trick from
        earlier, but composing with it to create the full algorithm.
      </p>
      <p className="explanation">
        <strong>QJL</strong> (Quantized Johnson-Lindenstrauss) takes a d-dimensional vector and
        produces d sign bits: <strong>one per coordinate</strong>.
        Each row defines a direction, we're just recording which side of that hyperplane the vector
        falls on: +1 or -1.
      </p>
      <p className="explanation mb-6">
        From those sign bits we can estimate inner products with the original vector,
        without the bias we would get from our earlier quantization.
        The demo below visualises the
        idea with 2D vectors and a handful of projections - the actual algorithm uses just one projection, but in many more dimensions.
        Move your mouse to change the target vector.
      </p>

      <InteractivePanel caption="Black = target vector r. Green = reconstruction r̃ from sign bits only. Colored lines = dividing lines (perpendicular to projection directions). Move mouse to change r.">
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setTargetSeed((s) => s + 1)}
            className="btn-primary">
            New Target
          </button>
          <button type="button" onClick={() => setProjSeed((s) => s + 1)}
            className="btn-secondary">
            New Projections
          </button>
        </div>
        <Canvas2D
          draw={draw2D}
          height={320}
          deps={[r, projections, signs, recon, directionError, mouseR]}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </InteractivePanel>
      <p className="explanation mt-6">
        We've shown 6 projections in 2D here, but the TurboQuant technique actually only uses 1 projection.
        This is get the benefit of the unbiased property of QJL while keeping the bit budget as small as possible.
      </p>
    </>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, width: number
) {
  const headLen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
}
