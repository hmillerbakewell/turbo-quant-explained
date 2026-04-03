import { useState } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { SVGChart } from '../viz/SVGChart';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';

const CHART_W = 600;
const CHART_H = 340;
const PAD = { top: 30, right: 30, bottom: 55, left: 55 };

// Data from TurboQuant paper Table 2, Figure 5, Table 1
// Recall@1 for top-1 nearest neighbor on OpenAI3 d=1536 dataset
const RECALL_DATA: { method: string; color: string; points: { bits: number; recall: number }[] }[] = [
  {
    method: 'TurboQuant',
    color: COLORS.primary,
    points: [
      { bits: 2, recall: 0.965 },
      { bits: 4, recall: 0.997 },
    ],
  },
  {
    method: 'Product Quantization',
    color: COLORS.red,
    points: [
      { bits: 2, recall: 0.885 },
      { bits: 4, recall: 0.955 },
    ],
  },
  {
    method: 'RabitQ',
    color: COLORS.orange,
    points: [
      { bits: 2, recall: 0.910 },
      { bits: 4, recall: 0.960 },
    ],
  },
];

// Indexing time (seconds) from Table 2, d=1536, 100K vectors
const INDEXING_DATA: { method: string; time: number; color: string }[] = [
  { method: 'TurboQuant', time: 0.0013, color: COLORS.primary },
  { method: 'Product Quant.', time: 239.75, color: COLORS.red },
  { method: 'RabitQ', time: 2267.59, color: COLORS.orange },
];

// KV cache results from Table 1 (LongBench-E, Llama-3.1-8B-Instruct)
const KV_DATA: { method: string; kvSize: number; score: number; color: string }[] = [
  { method: 'Full Cache', kvSize: 16, score: 50.06, color: COLORS.muted },
  { method: 'KIVI (3-bit)', kvSize: 3, score: 48.50, color: '#94a3b8' },
  { method: 'KIVI (5-bit)', kvSize: 5, score: 50.16, color: '#94a3b8' },
  { method: 'PolarQuant', kvSize: 3.9, score: 49.78, color: COLORS.orange },
  { method: 'TurboQuant 2.5', kvSize: 2.5, score: 49.44, color: COLORS.primary },
  { method: 'TurboQuant 3.5', kvSize: 3.5, score: 50.06, color: COLORS.secondary },
];

type View = 'recall' | 'indexing' | 'kvcache';

export function S8NearOptimality() {
  const [view, setView] = useState<View>('recall');
  const { tooltip, show, hide } = useTooltip();

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  const handleHover = (e: React.MouseEvent<SVGElement>, content: string) => {
    const panel = e.currentTarget.closest('.relative');
    const pr = panel?.getBoundingClientRect();
    if (!pr) return;
    show(e.clientX - pr.left, e.clientY - pr.top, content);
  };

  return (
    <>
      <p className="explanation">
        The combination of a universal codebook (no training) and QJL (unbiased inner products)
        makes TurboQuant competitive with methods that require expensive data-dependent
        preprocessing. Its MSE distortion is provably within <strong>≈2.7×</strong> of Shannon's
        information-theoretic lower bound.
      </p>
      <p className="explanation mb-6">
        In practice, TurboQuant beats Product Quantization and RabitQ on quality <em>and</em> is
        orders of magnitude faster — because it's just a matrix multiply + codebook lookup,
        with no k-means training step.
      </p>
      <InteractivePanel caption="All data from the TurboQuant paper (Zandieh et al., 2025). OpenAI3 d=1536 embeddings, 100K vectors. Hover for details.">
        <Tooltip tooltip={tooltip} />
        <div className="flex gap-2 mb-4">
          {([
            ['recall', 'Recall@1'],
            ['indexing', 'Indexing Time'],
            ['kvcache', 'KV Cache'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`px-3 py-1 text-sm rounded cursor-pointer transition-colors ${view === key
                ? 'bg-indigo-500 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'recall' && (
          <SVGChart width={CHART_W} height={CHART_H} padding={PAD}>
            {renderRecallChart(innerW, innerH, handleHover, hide)}
          </SVGChart>
        )}

        {view === 'indexing' && (
          <SVGChart width={CHART_W} height={CHART_H} padding={PAD}>
            {renderIndexingChart(innerW, innerH, handleHover, hide)}
          </SVGChart>
        )}

        {view === 'kvcache' && (
          <SVGChart width={CHART_W} height={CHART_H} padding={PAD}>
            {renderKVChart(innerW, innerH, handleHover, hide)}
          </SVGChart>
        )}
      </InteractivePanel>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card
          title="KV Cache Compression"
          stat="4× smaller"
          description="Perfect recall on Needle-in-a-Haystack at 4× compression. Matches full-precision on LongBench at 3.5 bits per channel; marginal degradation at 2.5 bits."
          color="bg-indigo-50 border-indigo-200"
        />
        <Card
          title="Nearest Neighbor Search"
          stat="Best recall@k"
          description="Outperforms Product Quantization and RabitQ at both 2-bit and 4-bit on OpenAI3 embeddings (d=1536, 100K vectors)."
          color="bg-violet-50 border-violet-200"
        />
        <Card
          title="Indexing Speed"
          stat="~0.001s"
          description="vs 240–2200s for PQ and RabitQ. TurboQuant is just a matrix multiply + codebook lookup, with no data-dependent training."
          color="bg-amber-50 border-amber-200"
        />
      </div>
    </>
  );
}


function Card({
  title,
  stat,
  description,
  color,
}: {
  title: string;
  stat: string;
  description: string;
  color: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <h3 className="font-semibold text-gray-800 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mb-2">{stat}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function renderRecallChart(
  w: number, h: number,
  onHover: (e: React.MouseEvent<SVGElement>, content: string) => void,
  onLeave: () => void,
) {
  const xMin = 1.5;
  const xMax = 4.5;
  const yMin = 0.85;
  const yMax = 1.0;
  const toX = (b: number) => ((b - xMin) / (xMax - xMin)) * w;
  const toY = (r: number) => h - ((r - yMin) / (yMax - yMin)) * h;

  // Y grid
  const yTicks = [0.85, 0.90, 0.95, 1.0];

  return (
    <>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={0} y1={toY(v)} x2={w} y2={toY(v)} stroke={COLORS.grid} strokeWidth={0.5} />
          <text x={-8} y={toY(v) + 4} textAnchor="end" fontSize={10} fill={COLORS.muted}>
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      {[2, 3, 4].map((b) => (
        <line key={b} x1={toX(b)} y1={0} x2={toX(b)} y2={h} stroke={COLORS.grid} strokeWidth={0.5} />
      ))}

      {RECALL_DATA.map((method) => {
        const path = method.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.bits)},${toY(p.recall)}`).join(' ');
        return (
          <g key={method.method}>
            <path d={path} fill="none" stroke={method.color} strokeWidth={2.5} />
            {method.points.map((p) => (
              <g key={`${method.method}-${p.bits}`}>
                <circle
                  cx={toX(p.bits)} cy={toY(p.recall)} r={6} fill={method.color}
                  className="cursor-pointer"
                  onMouseEnter={(e) => onHover(e, `${method.method}\n${p.bits} bits: ${(p.recall * 100).toFixed(1)}% recall@1`)}
                  onMouseLeave={onLeave}
                />
                <circle cx={toX(p.bits)} cy={toY(p.recall)} r={14} fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => onHover(e, `${method.method}\n${p.bits} bits: ${(p.recall * 100).toFixed(1)}% recall@1`)}
                  onMouseLeave={onLeave}
                />
              </g>
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {RECALL_DATA.map((m, i) => (
        <g key={`leg-${m.method}`}>
          <circle cx={w - 150} cy={12 + i * 18} r={4} fill={m.color} />
          <text x={w - 140} y={16 + i * 18} fontSize={10} fill={COLORS.text}>{m.method}</text>
        </g>
      ))}

      {/* Axes */}
      {[2, 3, 4].map((b) => (
        <text key={`xl-${b}`} x={toX(b)} y={h + 20} textAnchor="middle" fontSize={11} fill={COLORS.text}>{b}</text>
      ))}
      <text x={w / 2} y={h + 42} textAnchor="middle" fontSize={12} fill={COLORS.text}>
        Bits per coordinate
      </text>
      <text x={-h / 2} y={-40} textAnchor="middle" fontSize={12} fill={COLORS.text} transform="rotate(-90)">
        Recall@1 (nearest neighbor)
      </text>
    </>
  );
}

function renderIndexingChart(
  w: number, h: number,
  onHover: (e: React.MouseEvent<SVGElement>, content: string) => void,
  onLeave: () => void,
) {
  // Log-scale bar chart
  const maxLog = Math.ceil(Math.log10(Math.max(...INDEXING_DATA.map((d) => d.time))));
  const minLog = -4;
  const toY = (t: number) => h - ((Math.log10(Math.max(t, 1e-4)) - minLog) / (maxLog - minLog)) * h;
  const barW = w / (INDEXING_DATA.length * 2 + 1);

  // Y grid
  const yTicks = Array.from({ length: maxLog - minLog + 1 }, (_, i) => Math.pow(10, minLog + i));

  return (
    <>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={0} y1={toY(v)} x2={w} y2={toY(v)} stroke={COLORS.grid} strokeWidth={0.5} />
          <text x={-8} y={toY(v) + 4} textAnchor="end" fontSize={10} fill={COLORS.muted}>
            {v >= 1 ? `${v}s` : v >= 0.001 ? `${(v * 1000).toFixed(0)}ms` : `${(v * 1000).toFixed(1)}ms`}
          </text>
        </g>
      ))}

      {INDEXING_DATA.map((d, i) => {
        const x = barW * (i * 2 + 1);
        const barH = h - toY(d.time);
        const label = d.time >= 1 ? `${d.time.toFixed(1)}s` : `${(d.time * 1000).toFixed(1)}ms`;
        return (
          <g key={d.method}>
            <rect
              x={x} y={toY(d.time)} width={barW} height={barH}
              fill={d.color} opacity={0.8} rx={3}
              className="cursor-pointer"
              onMouseEnter={(e) => onHover(e, `${d.method}\nIndexing time: ${label}\n(100K vectors, d=1536, 4-bit)`)}
              onMouseLeave={onLeave}
            />
            <text x={x + barW / 2} y={toY(d.time) - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill={d.color}>
              {label}
            </text>
            <text x={x + barW / 2} y={h + 16} textAnchor="middle" fontSize={9} fill={COLORS.text}>
              {d.method}
            </text>
          </g>
        );
      })}

      <text x={w / 2} y={h + 42} textAnchor="middle" fontSize={12} fill={COLORS.text}>
        Quantization Method
      </text>
      <text x={-h / 2} y={-40} textAnchor="middle" fontSize={12} fill={COLORS.text} transform="rotate(-90)">
        Indexing Time (log scale)
      </text>
    </>
  );
}

function renderKVChart(
  w: number, h: number,
  onHover: (e: React.MouseEvent<SVGElement>, content: string) => void,
  onLeave: () => void,
) {
  // Scatter: KV size (x) vs LongBench score (y)
  const xMin = 1.5;
  const xMax = 17;
  const yMin = 47;
  const yMax = 51;
  const toX = (s: number) => ((s - xMin) / (xMax - xMin)) * w;
  const toY = (s: number) => h - ((s - yMin) / (yMax - yMin)) * h;

  const yTicks = [47, 48, 49, 50, 51];

  return (
    <>
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={0} y1={toY(v)} x2={w} y2={toY(v)} stroke={COLORS.grid} strokeWidth={0.5} />
          <text x={-8} y={toY(v) + 4} textAnchor="end" fontSize={10} fill={COLORS.muted}>{v}</text>
        </g>
      ))}

      {/* "Smaller is better" arrow on x-axis */}
      <text x={toX(5)} y={h + 42} textAnchor="middle" fontSize={10} fill={COLORS.muted}>
        ← smaller is better
      </text>

      {KV_DATA.map((d) => (
        <g key={d.method}>
          <circle
            cx={toX(d.kvSize)} cy={toY(d.score)} r={7} fill={d.color}
            className="cursor-pointer"
            onMouseEnter={(e) => onHover(e, `${d.method}\nKV size: ${d.kvSize} bits/channel\nLongBench-E: ${d.score.toFixed(2)}`)}
            onMouseLeave={onLeave}
          />
          <circle cx={toX(d.kvSize)} cy={toY(d.score)} r={16} fill="transparent"
            className="cursor-pointer"
            onMouseEnter={(e) => onHover(e, `${d.method}\nKV size: ${d.kvSize} bits/channel\nLongBench-E: ${d.score.toFixed(2)}`)}
            onMouseLeave={onLeave}
          />
          <text
            x={toX(d.kvSize) + 10}
            y={toY(d.score) + 4}
            fontSize={9}
            fill={d.color}
          >
            {d.method}
          </text>
        </g>
      ))}

      {/* Axes */}
      <text x={w / 2} y={h + 20} textAnchor="middle" fontSize={12} fill={COLORS.text}>
        KV Cache Size (bits per channel)
      </text>
      <text x={-h / 2} y={-40} textAnchor="middle" fontSize={12} fill={COLORS.text} transform="rotate(-90)">
        LongBench-E Average Score
      </text>
    </>
  );
}
