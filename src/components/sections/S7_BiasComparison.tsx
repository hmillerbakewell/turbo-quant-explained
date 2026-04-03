import { useState, useCallback, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { Canvas2D } from '../viz/Canvas2D';
import { Slider } from '../viz/Slider';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';
import { dot, randomOrthogonal, randomUnitVector, randomGaussianMatrix, matmul, transpose, sub, norm as vecNorm } from '../../lib/math';
import { getCodebook, scalarQuantize, scalarDequantize, qjlQuantize, qjlDequantize, getAttenuationFactor } from '../../lib/quantize';
import { histogram } from '../../lib/distributions';
import { histogramTooltip } from '../../lib/tooltipHelpers';

const D = 128;
const N_TRIALS = 1000;
const HIST_PAD = 30;
const HIST_BINS = 50;
const HIST_RANGE: [number, number] = [0.2, 1.4];
const MIN_IP = 0.05;

export function S7BiasComparison() {
  const [bits, setBits] = useState(2);
  const [showQjl, setShowQjl] = useState(false);
  const [dataKey, setDataKey] = useState(0);
  const { tooltip, show, hide } = useTooltip();

  // Fix R and S once — these are global parameters in the paper (Algorithm 2).
  // Loop over many random (x, y) pairs to show how the ratio behaves for typical vectors.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { R, Rt, S } = useMemo(() => {
    const R = randomOrthogonal(D);
    const S = randomGaussianMatrix(D);
    return { R, Rt: transpose(R), S };
  }, [dataKey]);

  const stats = useMemo(() => {
    const cbMse = getCodebook(bits);
    const qjlMseBits = Math.max(1, bits - 1);
    const cbQjl = getCodebook(qjlMseBits);

    const mseRatios: number[] = [];
    const qjlRatios: number[] = [];

    for (let t = 0; t < N_TRIALS; t++) {
      const x = randomUnitVector(D);
      const y = randomUnitVector(D);
      const trueIP = dot(y, x);
      if (Math.abs(trueIP) < MIN_IP) continue;

      // MSE-only path
      const rotated = matmul(R, x);
      const idxMse = rotated.map((v) => scalarQuantize(v, cbMse));
      const deqMse = idxMse.map((idx) => scalarDequantize(idx, cbMse));
      const xMse = matmul(Rt, deqMse);
      mseRatios.push(dot(y, xMse) / trueIP);

      // MSE+QJL path (same R, fixed S)
      const idxQjl = rotated.map((v) => scalarQuantize(v, cbQjl));
      const deqQjl = idxQjl.map((idx) => scalarDequantize(idx, cbQjl));
      const xMseBase = matmul(Rt, deqQjl);
      const residual = sub(x, xMseBase);
      const gamma = vecNorm(residual);
      const signs = qjlQuantize(residual, S);
      const qjlRecon = qjlDequantize(signs, S, gamma, D);
      const xWithQjl = xMseBase.map((v, i) => v + qjlRecon[i]);
      qjlRatios.push(dot(y, xWithQjl) / trueIP);
    }

    const mseMean = mseRatios.reduce((s, r) => s + r, 0) / mseRatios.length;
    const qjlMean = qjlRatios.reduce((s, r) => s + r, 0) / qjlRatios.length;

    const mseFiltered = mseRatios.filter((r) => r >= HIST_RANGE[0] && r <= HIST_RANGE[1]);
    const qjlFiltered = qjlRatios.filter((r) => r >= HIST_RANGE[0] && r <= HIST_RANGE[1]);

    const histMse = histogram(mseFiltered, HIST_BINS, HIST_RANGE);
    const histQjl = histogram(qjlFiltered, HIST_BINS, HIST_RANGE);

    return {
      mseMean,
      qjlMean,
      histMse,
      histQjl,
      count: mseRatios.length,
    };
  }, [bits, R, Rt, S]);

  const theoretical = getAttenuationFactor(bits);
  const activeHist = showQjl ? stats.histQjl : stats.histMse;
  const activeMean = showQjl ? stats.qjlMean : stats.mseMean;
  const maxCount = Math.max(...activeHist.counts);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const plotW = w - 2 * HIST_PAD;
      const plotH = h - 2 * HIST_PAD;
      const barW = plotW / activeHist.counts.length;
      const valToX = (v: number) => HIST_PAD + ((v - HIST_RANGE[0]) / (HIST_RANGE[1] - HIST_RANGE[0])) * plotW;

      const color = showQjl ? COLORS.green : COLORS.red;
      for (let i = 0; i < activeHist.counts.length; i++) {
        const barH = maxCount > 0 ? (activeHist.counts[i] / maxCount) * plotH : 0;
        ctx.fillStyle = color;
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
        ctx.fillText(t.toFixed(1), tx, h - 5);
      }

      // Unbiased line at ratio = 1.0
      const oneX = valToX(1.0);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(oneX, HIST_PAD);
      ctx.lineTo(oneX, HIST_PAD + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Theoretical attenuation (MSE-only)
      if (!showQjl) {
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
      }

      // Empirical mean line
      const meanX = valToX(activeMean);
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(meanX, HIST_PAD);
      ctx.lineTo(meanX, HIST_PAD + plotH);
      ctx.stroke();

      ctx.fillStyle = COLORS.text;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`mean = ${activeMean.toFixed(3)}`, meanX + 5, HIST_PAD + (showQjl ? 15 : 30));

      // Title
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      if (showQjl) {
        ctx.fillText(`Ratio ⟨y, x̃⟩ / ⟨y, x⟩ — ${qjlBitsLabel(bits)} (${stats.count} pairs)`, w / 2, 16);
      } else {
        ctx.fillText(`Ratio ⟨y, x̃⟩ / ⟨y, x⟩ — ${bits}-bit MSE only (${stats.count} pairs)`, w / 2, 16);
      }
    },
    [activeHist, activeMean, maxCount, showQjl, bits, theoretical, stats.count]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const mx = e.clientX - rect.left;
      const tip = histogramTooltip(mx, rect.width, HIST_PAD, HIST_BINS, HIST_RANGE, activeHist.counts, 'pairs');
      if (tip) {
        const panel = e.currentTarget.closest('.relative');
        const pr = panel?.getBoundingClientRect();
        show(e.clientX - (pr?.left ?? rect.left), e.clientY - (pr?.top ?? rect.top), tip);
      } else {
        hide();
      }
    },
    [activeHist, show, hide]
  );

  return (
    <>
      <p className="explanation">
        In deployment, both the rotation matrix R and the projection matrix S are chosen
        once at setup and shared across all vectors. Here we fix R and S and run the full
        pipeline on many random (x, y) pairs — the same structure as the previous section,
        but now comparing MSE-only against MSE+QJL.
      </p>
      <p className="explanation mb-6">
        Toggle between the two. MSE-only clusters around the attenuation factor (less than 1).
        MSE+QJL centers near <strong>1.0</strong> — the multiplicative bias is corrected, and
        inner product rankings are preserved.
      </p>
      <InteractivePanel caption={`Ratio ⟨y, x̃⟩ / ⟨y, x⟩ over ${stats.count} random (x, y) pairs (d=${D}). Fixed R and S. Dashed = unbiased (1.0).`}>
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

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowQjl(false)}
            className={`px-3 py-1 text-sm rounded cursor-pointer transition-colors ${!showQjl
              ? 'bg-red-500 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
          >
            MSE only ({bits}-bit)
          </button>
          <button
            type="button"
            onClick={() => setShowQjl(true)}
            className={`px-3 py-1 text-sm rounded cursor-pointer transition-colors ${showQjl
              ? 'bg-green-600 text-white'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
          >
            MSE + QJL ({qjlBitsLabel(bits)})
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 my-3 text-xs font-mono">
          <div className={`rounded p-2 ${!showQjl ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="text-gray-500 mb-1">MSE only ({bits}-bit)</div>
            <div>mean ratio: <span className="text-red-600 font-semibold">{stats.mseMean.toFixed(4)}</span></div>
            <div>theoretical: {theoretical.toFixed(4)}</div>
          </div>
          <div className={`rounded p-2 ${showQjl ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="text-gray-500 mb-1">MSE + QJL ({qjlBitsLabel(bits)})</div>
            <div>mean ratio: <span className="text-green-600 font-semibold">{stats.qjlMean.toFixed(4)}</span></div>
            <div>unbiased: 1.0000</div>
          </div>
        </div>

        <Canvas2D
          draw={draw}
          height={280}
          deps={[bits, showQjl, dataKey]}
          className="mt-1"
          onMouseMove={handleMouseMove}
          onMouseLeave={hide}
        />
      </InteractivePanel>
    </>
  );
}

function qjlBitsLabel(bits: number): string {
  return `${Math.max(1, bits - 1)}+1 bit`;
}
