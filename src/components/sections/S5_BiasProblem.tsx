import { useState, useCallback, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { Canvas2D } from '../viz/Canvas2D';
import { Slider } from '../viz/Slider';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';
import { dot, randomOrthogonal, randomUnitVector, matmul, transpose } from '../../lib/math';
import { getCodebook, scalarQuantize, scalarDequantize, getAttenuationFactor } from '../../lib/quantize';
import { histogram } from '../../lib/distributions';
import { histogramTooltip } from '../../lib/tooltipHelpers';

const D = 128;
const N_TRIALS = 2000;
const HIST_PAD = 30;
const HIST_BINS = 50;
const HIST_RANGE: [number, number] = [0.2, 1.4];
const MIN_IP = 0.05;

export function S5BiasProblem() {
  const [bits, setBits] = useState(2);
  const [dataKey, setDataKey] = useState(0);
  const { tooltip, show, hide } = useTooltip();

  // Fix R once per regeneration. Loop over fresh (x, y) pairs per trial.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { R, Rt } = useMemo(() => {
    const R = randomOrthogonal(D);
    return { R, Rt: transpose(R) };
  }, [dataKey]);

  const stats = useMemo(() => {
    const cb = getCodebook(bits);
    const ratios: number[] = [];
    for (let t = 0; t < N_TRIALS; t++) {
      const x = randomUnitVector(D);
      const y = randomUnitVector(D);
      const trueIP = dot(y, x);
      // Skip near-zero inner products to avoid division instability
      if (Math.abs(trueIP) < MIN_IP) continue;
      const rotated = matmul(R, x);
      const indices = rotated.map((v) => scalarQuantize(v, cb));
      const deq = indices.map((idx) => scalarDequantize(idx, cb));
      const xHat = matmul(Rt, deq);
      ratios.push(dot(y, xHat) / trueIP);
    }
    const mean = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    // Exclude outlier ratios (from near-zero denominators) for histogram display only
    const filtered = ratios.filter((r) => r >= HIST_RANGE[0] && r <= HIST_RANGE[1]);
    const hist = histogram(filtered, HIST_BINS, HIST_RANGE);
    return { mean, hist, count: ratios.length };
  }, [bits, R, Rt]);

  const theoretical = getAttenuationFactor(bits);
  const maxCount = Math.max(...stats.hist.counts);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const plotW = w - 2 * HIST_PAD;
      const plotH = h - 2 * HIST_PAD;
      const barW = plotW / stats.hist.counts.length;
      const valToX = (v: number) => HIST_PAD + ((v - HIST_RANGE[0]) / (HIST_RANGE[1] - HIST_RANGE[0])) * plotW;

      for (let i = 0; i < stats.hist.counts.length; i++) {
        const barH = maxCount > 0 ? (stats.hist.counts[i] / maxCount) * plotH : 0;
        ctx.fillStyle = COLORS.red;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(HIST_PAD + i * barW, HIST_PAD + plotH - barH, barW - 1, barH);
      }
      ctx.globalAlpha = 1;

      // X-axis ticks
      const xTicks = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4];
      for (const t of xTicks) {
        const tx = valToX(t);
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(tx, HIST_PAD);
        ctx.lineTo(tx, HIST_PAD + plotH);
        ctx.stroke();
        ctx.fillStyle = COLORS.muted;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(t.toFixed(2), tx, h - 5);
      }

      // Unbiased line at ratio = 1.0 (emphasized)
      const oneX = valToX(1.0);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(oneX, HIST_PAD);
      ctx.lineTo(oneX, HIST_PAD + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Theoretical attenuation line
      const theoX = valToX(theoretical);
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(theoX, HIST_PAD);
      ctx.lineTo(theoX, HIST_PAD + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.primary;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`theoretical = ${theoretical.toFixed(3)}`, theoX + 5, HIST_PAD + 15);

      // Empirical mean line
      const meanX = valToX(stats.mean);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(meanX, HIST_PAD);
      ctx.lineTo(meanX, HIST_PAD + plotH);
      ctx.stroke();

      ctx.fillStyle = COLORS.text;
      ctx.fillText(`empirical = ${stats.mean.toFixed(3)}`, meanX + 5, HIST_PAD + 30);

      // Title
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Inner Product Ratio ⟨y, x̃⟩ / ⟨y, x⟩ — ${bits}-bit MSE`, w / 2, 16);
    },
    [stats, maxCount, bits, theoretical]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const mx = e.clientX - rect.left;
      const tip = histogramTooltip(mx, rect.width, HIST_PAD, HIST_BINS, HIST_RANGE, stats.hist.counts, 'trials');
      if (tip) {
        const panel = e.currentTarget.closest('.relative');
        const pr = panel?.getBoundingClientRect();
        show(e.clientX - (pr?.left ?? rect.left), e.clientY - (pr?.top ?? rect.top), tip);
      } else {
        hide();
      }
    },
    [stats, show, hide]
  );

  return (
    <>
      <p className="explanation">
        That pipeline gives us excellent reconstruction (low mean distance between the original
        and reconstructed vectors). But many applications — nearest-neighbour search, attention
        in transformers, retrieval — don't need to reconstruct vectors, just compute <strong>inner products</strong> with them.
      </p>
      <p className="explanation">
        MSE-optimal quantizers systematically <strong>shrink</strong> inner products toward zero.
        The bias is multiplicative: at 1 bit, <code>E[⟨y, x̃⟩] = (2/π) · ⟨y, x⟩</code> which is only
        64% of the true value. This means nearest-neighbour rankings are distorted: similar vectors
        appear less similar due to the quantization.
      </p>
      <p className="explanation mb-6">
        The histogram shows the ratio <code>⟨y, x̃⟩ / ⟨y, x⟩</code> over many random vector pairs.
        An unbiased quantizer would center at <strong>1.0</strong> (dashed line). Instead, the
        distribution clusters around the theoretical attenuation factor (indigo line), which
        approaches 1.0 as you add bits.
      </p>
      <InteractivePanel caption={`Ratio ⟨y, x̃⟩ / ⟨y, x⟩ over ${stats.count} random (x, y) pairs (d=${D}). Dashed = unbiased (1.0). Indigo = theoretical. Amber = empirical mean.`}>
        <Tooltip tooltip={tooltip} />
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setDataKey((k) => k + 1)}
            className="btn-primary"
          >
            Regenerate
          </button>
          <Slider
            min={1}
            max={4}
            value={bits}
            onChange={setBits}
            label="Bit budget"
            valueLabel={`${bits} bit${bits > 1 ? 's' : ''}`}
          />
        </div>

        <div className="my-3 text-xs font-mono">
          <div className="rounded p-2 bg-red-50 border border-red-200">
            <div className="text-gray-500 mb-1">MSE only ({bits}-bit)</div>
            <div>empirical mean ratio: <span className="text-red-600 font-semibold">{stats.mean.toFixed(4)}</span></div>
            <div>theoretical ratio: <span className="text-indigo-600 font-semibold">{theoretical.toFixed(4)}</span></div>
            <div>unbiased would be: 1.0000</div>
          </div>
        </div>

        <Canvas2D
          draw={draw}
          height={280}
          deps={[bits, dataKey]}
          className="mt-1"
          onMouseMove={handleMouseMove}
          onMouseLeave={hide}
        />
      </InteractivePanel>
    </>
  );
}
