import { useState, useCallback, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { Canvas2D } from '../viz/Canvas2D';
import { Slider } from '../viz/Slider';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';

const NUM_POINTS = 50;
const PAD = 40;

function generatePoints() {
  return Array.from({ length: NUM_POINTS }, () =>
    [Math.random() * 2 - 1, Math.random() * 2 - 1] as [number, number]
  );
}

function quantizeValue(v: number, bits: number): number {
  const levels = Math.pow(2, bits);
  const step = 2 / levels;
  // Map to bin index [0, levels-1], then to bin center
  const bin = Math.min(Math.floor((v + 1) / step), levels - 1);
  return -1 + (bin + 0.5) * step;
}

export function S1Problem() {
  const [bits, setBits] = useState(8);
  const [pointsKey, setPointsKey] = useState(0);
  const { tooltip, show, hide } = useTooltip();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const points = useMemo(() => generatePoints(), [pointsKey]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const plotW = w - 2 * PAD;
      const plotH = h - 2 * PAD;
      const toX = (v: number) => PAD + ((v + 1) / 2) * plotW;
      const toY = (v: number) => PAD + ((1 - (v + 1) / 2)) * plotH;

      // Grid
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      const levels = Math.pow(2, bits);
      const step = 2 / levels;
      if (levels <= 32) {
        for (let i = 0; i <= levels; i++) {
          const v = -1 + i * step;
          ctx.beginPath();
          ctx.moveTo(toX(v), PAD);
          ctx.lineTo(toX(v), h - PAD);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(PAD, toY(v));
          ctx.lineTo(w - PAD, toY(v));
          ctx.stroke();
        }
      }

      // Original points (faded)
      for (const [x, y] of points) {
        ctx.beginPath();
        ctx.arc(toX(x), toY(y), 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.2)';
        ctx.fill();
      }

      // Quantized points
      for (const [x, y] of points) {
        const qx = quantizeValue(x, bits);
        const qy = quantizeValue(y, bits);
        ctx.beginPath();
        ctx.arc(toX(qx), toY(qy), 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.primary;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(toX(x), toY(y));
        ctx.lineTo(toX(qx), toY(qy));
        ctx.strokeStyle = 'rgba(99,102,241,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = COLORS.text;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${levels} levels per axis · ${bits} bits/coord · ${bits * 2} bits/vector`, w / 2, h - 8);
    },
    [bits, points]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const plotW = w - 2 * PAD;
      const plotH = h - 2 * PAD;
      const toX = (v: number) => PAD + ((v + 1) / 2) * plotW;
      const toY = (v: number) => PAD + ((1 - (v + 1) / 2)) * plotH;

      // Find nearest original (ghost) point
      let bestDist = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i];
        const dx = toX(x) - mx;
        const dy = toY(y) - my;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && bestDist < 20 * 20) {
        const [ox, oy] = points[bestIdx];
        const qx = quantizeValue(ox, bits);
        const qy = quantizeValue(oy, bits);
        const err = Math.sqrt((ox - qx) ** 2 + (oy - qy) ** 2);
        // Position tooltip relative to the InteractivePanel
        const panel = e.currentTarget.closest('.relative');
        const panelRect = panel?.getBoundingClientRect();
        const tipX = e.clientX - (panelRect?.left ?? rect.left);
        const tipY = e.clientY - (panelRect?.top ?? rect.top);
        show(tipX, tipY, `Original: (${ox.toFixed(3)}, ${oy.toFixed(3)})\nQuantized: (${qx.toFixed(3)}, ${qy.toFixed(3)})\nError: ${err.toFixed(4)}`);
      } else {
        hide();
      }
    },
    [points, bits, show, hide]
  );

  return (
    <>
      <p className="explanation">
        Modern AI runs on high-dimensional vectors: embeddings for search, KV cache entries for
        attention, feature vectors for retrieval. These are typically stored as 32-bit.
        A single 1536-d embedding (like OpenAI's) takes <strong>6 KB</strong>.
        Space consumption scales linearly in the number of data points.
      </p>

      <StorageTable />

      <p className="explanation mt-6">
        The goal is to compress these vectors while preserving the <strong>distances</strong> and <strong>inner
        products</strong> that make them useful. Naive uniform quantization just rounds each coordinate
        to a grid, is a start but it wastes bits.
      </p>
      <InteractivePanel caption="2D points quantized to different bit-widths. Faded dots = original, solid = quantized. Hover for details.">
        <Tooltip tooltip={tooltip} />
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setPointsKey((k) => k + 1)}
            className="btn-primary"
          >
            New Random Points
          </button>
        </div>
        <Slider
          min={1}
          max={8}
          value={bits}
          onChange={setBits}
          label="Bit-width"
          valueLabel={`${bits} bit${bits > 1 ? 's' : ''}`}
        />
        <Canvas2D
          draw={draw}
          height={350}
          deps={[bits, points]}
          className="mt-3"
          onMouseMove={handleMouseMove}
          onMouseLeave={hide}
        />
      </InteractivePanel>
    </>
  );
}

const DIM = 1536; // OpenAI text-embedding-3-large

const FORMATS: { name: string; bitsPerCoord: number; color: string }[] = [
  { name: 'float32', bitsPerCoord: 32, color: 'text-red-600' },
  { name: 'float16', bitsPerCoord: 16, color: 'text-orange-500' },
  { name: 'int8', bitsPerCoord: 8, color: 'text-amber-500' },
  { name: '4-bit', bitsPerCoord: 4, color: 'text-green-600' },
  { name: '2-bit', bitsPerCoord: 2, color: 'text-indigo-600' },
  { name: '1-bit', bitsPerCoord: 1, color: 'text-violet-600' },
];

const SCALES: { label: string; count: number; example: string }[] = [
  { label: '1', count: 1, example: 'one document' },
  { label: '10K', count: 10_000, example: 'a textbook' },
  { label: '65M', count: 65_000_000, example: 'Wikipedia (EN)' },
  { label: '1B', count: 1_000_000_000, example: 'web-scale search index' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
}

function StorageTable() {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-2 text-gray-400 font-normal">Format</th>
            <th className="text-left py-2 pr-2 text-gray-400 font-normal">bits/coord</th>
            {SCALES.map((s) => (
              <th key={s.label} className="text-right py-2 px-2 font-normal">
                <div>{s.label} vector{s.count > 1 ? 's' : ''}</div>
                <div className="text-gray-400 font-normal">{s.example}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FORMATS.map((f) => (
            <tr key={f.name} className="border-b border-gray-100">
              <td className={`py-1.5 pr-2 font-mono font-semibold ${f.color}`}>{f.name}</td>
              <td className="py-1.5 pr-2 text-gray-500">{f.bitsPerCoord}</td>
              {SCALES.map((s) => {
                const bytes = (f.bitsPerCoord * DIM * s.count) / 8;
                return (
                  <td key={s.label} className="py-1.5 px-2 text-right font-mono text-gray-700">
                    {formatBytes(bytes)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
