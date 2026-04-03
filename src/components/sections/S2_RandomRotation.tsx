import { useState, useCallback, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { Canvas2D } from '../viz/Canvas2D';
import { Slider } from '../viz/Slider';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';
import { randomOrthogonal, matmul } from '../../lib/math';
import { histogram } from '../../lib/distributions';
import { histogramTooltip } from '../../lib/tooltipHelpers';

const HIST_PAD = 30;
const HIST_RANGE: [number, number] = [-0.5, 0.5];
const DIM_OPTIONS = [4, 8, 16, 32, 64, 128, 256];

export function S2RandomRotation() {
  const [dimIndex, setDimIndex] = useState(4); // default = 64
  const [rotationKey, setRotationKey] = useState(0);
  const { tooltip, show, hide } = useTooltip();

  const d = DIM_OPTIONS[dimIndex];
  // More bins for higher dimensions (more data points to fill them)
  const histBins = Math.min(d, 40);

  const adversarial = useMemo(() => {
    const v = new Array(d).fill(0);
    v[0] = 1;
    return v;
  }, [d]);

  const rotated = useMemo(() => {
    const R = randomOrthogonal(d);
    return matmul(R, adversarial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adversarial, rotationKey]);

  const hist = useMemo(() => histogram(rotated, histBins, HIST_RANGE), [rotated, histBins]);

  const drawBefore = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      drawBarChart(ctx, w, h, adversarial, `Before Rotation (first ${Math.min(d, 20)} of ${d} coords)`, COLORS.red);
    },
    [adversarial, d]
  );

  const drawAfter = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const maxCount = Math.max(...hist.counts);
      const plotW = w - 2 * HIST_PAD;
      const plotH = h - 2 * HIST_PAD;

      const barW = plotW / hist.counts.length;
      for (let i = 0; i < hist.counts.length; i++) {
        const barH = (hist.counts[i] / maxCount) * plotH;
        ctx.fillStyle = COLORS.primary;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(HIST_PAD + i * barW, HIST_PAD + plotH - barH, barW - 1, barH);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = COLORS.text;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`After Rotation (all ${d} coords)`, w / 2, 16);

      // X-axis labels
      ctx.fillStyle = COLORS.muted;
      ctx.font = '10px system-ui';
      const ticks = [-0.4, -0.2, 0, 0.2, 0.4];
      for (const t of ticks) {
        const tx = HIST_PAD + ((t - HIST_RANGE[0]) / (HIST_RANGE[1] - HIST_RANGE[0])) * plotW;
        ctx.fillText(t === 0 ? '0' : t.toFixed(1), tx, h - 5);
      }
    },
    [hist, d]
  );

  const handleHistMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const mx = e.clientX - rect.left;
      const tip = histogramTooltip(mx, rect.width, HIST_PAD, histBins, HIST_RANGE, hist.counts, 'coordinates');
      if (tip) {
        const panel = e.currentTarget.closest('.relative');
        const pr = panel?.getBoundingClientRect();
        show(e.clientX - (pr?.left ?? rect.left), e.clientY - (pr?.top ?? rect.top), tip);
      } else {
        hide();
      }
    },
    [hist, histBins, show, hide]
  );

  return (
    <>
      <p className="explanation">
        To design an optimal quantizer, you need to know the distribution of coordinate values.
        But real vector embeddings aren't uniformly distributed - coordinate 5 might
        carry large values while coordinate 100 is always near zero, or coordinates 6 and 7 might be correlated.
        Exactly what relationships exist depends on your model and use cases,
        and we don't want to design a different quantizer for every scenario.
        To use a <strong>single
        scalar quantizer for all coordinates</strong>, you need them to follow a known distribution.
      </p>
      <p className="explanation">
        TurboQuant's key insight: apply a <strong>random orthogonal matrix</strong> Π, referred to as a rotation.
        After rotation, all coordinates become <strong>identically distributed</strong> (tending to
        Gaussian in high dimensions) and <strong>nearly independent</strong>. This means one
        precomputed codebook works well enough for every coordinate of every vector,
        no matter the original distribution.
      </p>
      <p className="explanation">
        Try different inputs below. No matter what the original vector looks like, the rotated
        coordinates always follow the same bell-curve shape. Increase the dimension to see
        the distribution tighten.
      </p>
      <InteractivePanel caption="Left: an example vector. Right: histogram of all coordinates after multiplying by a random orthogonal Π.">
        <Tooltip tooltip={tooltip} />
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setRotationKey((k) => k + 1)}
            className="btn-primary"
          >
            New Rotation
          </button>
          <Slider
            min={0}
            max={DIM_OPTIONS.length - 1}
            value={dimIndex}
            onChange={setDimIndex}
            label="Dimensions"
            valueLabel={`d = ${d}`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Canvas2D draw={drawBefore} height={250} deps={[adversarial, d]} />
          <Canvas2D
            draw={drawAfter}
            height={250}
            deps={[rotated, d]}
            onMouseMove={handleHistMouseMove}
            onMouseLeave={hide}
          />
        </div>
      </InteractivePanel>
    </>
  );
}

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  vector: number[],
  title: string,
  color: string
) {
  const pad = 30;
  const plotW = w - 2 * pad;
  const plotH = h - 2 * pad;

  const numBars = Math.min(vector.length, 20);
  const barW = plotW / numBars;
  const maxVal = Math.max(...vector.map(Math.abs), 0.01);

  for (let i = 0; i < numBars; i++) {
    const v = vector[i];
    const barH = (Math.abs(v) / maxVal) * (plotH / 2);
    const y = v >= 0 ? pad + plotH / 2 - barH : pad + plotH / 2;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(pad + i * barW, y, barW - 1, barH);
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = COLORS.grid;
  ctx.beginPath();
  ctx.moveTo(pad, pad + plotH / 2);
  ctx.lineTo(w - pad, pad + plotH / 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.text;
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 16);
}
