import { useState, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { SVGChart } from '../viz/SVGChart';
import { Slider } from '../viz/Slider';
import { Tooltip } from '../viz/Tooltip';
import { useTooltip } from '../../hooks/useTooltip';
import { COLORS } from '../../lib/colors';
import { betaCoordPdf } from '../../lib/distributions';
import { getCodebook } from '../../lib/quantize';
import { linspace } from '../../lib/math';

const D = 128;
const CHART_W = 600;
const CHART_H = 300;
const PAD = { top: 20, right: 20, bottom: 40, left: 50 };

export function S3OptimalQuant() {
  const [bits, setBits] = useState(2);
  const { tooltip, show, hide } = useTooltip();

  const codebook = useMemo(() => getCodebook(bits), [bits]);

  const { pdfPath } = useMemo(() => {
    const xs = linspace(-0.35, 0.35, 200);
    const ys = xs.map((x) => betaCoordPdf(x, D));
    const maxPdf = Math.max(...ys);
    const iW = CHART_W - PAD.left - PAD.right;
    const iH = CHART_H - PAD.top - PAD.bottom;
    const sx = (v: number) => ((v + 0.35) / 0.7) * iW;
    const sy = (v: number) => iH - (v / maxPdf) * iH;
    const pdfPath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${sx(x)},${sy(ys[i])}`).join(' ');
    return { pdfPath, maxPdf };
  }, []);

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const toX = (v: number) => ((v + 0.35) / 0.7) * innerW;

  const regionColors = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.green, COLORS.blue, COLORS.orange, COLORS.red, '#8b5cf6'];

  const handleCentroidHover = (e: React.MouseEvent<SVGElement>, i: number, value: number) => {
    const panel = e.currentTarget.closest('.relative');
    const pr = panel?.getBoundingClientRect();
    if (!pr) return;
    show(
      e.clientX - pr.left,
      e.clientY - pr.top,
      `Centroid ${i + 1}: ${value.toFixed(4)}`
    );
  };

  const handleBoundaryHover = (e: React.MouseEvent<SVGElement>, i: number, value: number) => {
    const panel = e.currentTarget.closest('.relative');
    const pr = panel?.getBoundingClientRect();
    if (!pr) return;
    show(
      e.clientX - pr.left,
      e.clientY - pr.top,
      `Boundary ${i + 1}: ${value.toFixed(4)}\nBetween centroids ${i + 1} and ${i + 2}`
    );
  };

  return (
    <>
      <p className="explanation">
        Applying rotation guarantees a known distribution, we can construct the optimal codebook
        <strong> once and reuse it forever</strong>. This is the {" "}
        <a href="https://www.khoury.northeastern.edu/home/gsharp/csg142-fall-2006/Lloyd-Max-Quant.pdf" target='_blank' rel='noopener noreferrer'>Lloyd-Max algorithm</a>:
        partition the range into 2<sup>b</sup> regions and place centroids to minimize expected
        squared error for the Beta/Gaussian distribution.
      </p>
      <p className="explanation">
        The codebook is precomputed and fixed, it <strong>never changes</strong> regardless of what vectors you
        quantize.
      </p>
      <p className="explanation mb-6">
        Compare this to {" "}<a href="https://www.computer.org/csdl/journal/tp/2014/04/06678503/13rRUy2YLZC" target='_blank' rel='noopener noreferrer'>Product Quantization</a>, which must run k-means on your dataset to build
        per-subspace codebooks. TurboQuant skips looking at your data entirely.
      </p>
      <InteractivePanel caption="The Beta coordinate PDF (d=128) with Lloyd-Max centroids and decision boundaries. Hover centroids and boundaries for values.">
        <Tooltip tooltip={tooltip} />
        <Slider
          min={1}
          max={4}
          value={bits}
          onChange={setBits}
          label="Bit-width"
          valueLabel={`${bits} bit${bits > 1 ? 's' : ''} → ${Math.pow(2, bits)} centroids`}
        />
        <SVGChart width={CHART_W} height={CHART_H} padding={PAD} className="mt-3">
          {/* Shaded regions */}
          {codebook.centroids.map((_c, i) => {
            const lo = i === 0 ? -0.35 : (codebook.boundaries[i - 1] ?? -0.35);
            const hi = i === codebook.centroids.length - 1 ? 0.35 : (codebook.boundaries[i] ?? 0.35);
            return (
              <rect
                key={i}
                x={toX(lo)}
                y={0}
                width={toX(hi) - toX(lo)}
                height={innerH}
                fill={regionColors[i % regionColors.length]}
                opacity={0.08}
              />
            );
          })}

          {/* PDF curve */}
          <path d={pdfPath} fill="none" stroke={COLORS.text} strokeWidth={2} />

          {/* Centroid markers */}
          {codebook.centroids.map((c, i) => (
            <g key={`c-${i}`}>
              <line
                x1={toX(c)}
                y1={0}
                x2={toX(c)}
                y2={innerH}
                stroke={regionColors[i % regionColors.length]}
                strokeWidth={2}
                strokeDasharray="4,3"
              />
              <circle
                cx={toX(c)}
                cy={innerH + 12}
                r={4}
                fill={regionColors[i % regionColors.length]}
                className="cursor-pointer"
                onMouseEnter={(e) => handleCentroidHover(e, i, c)}
                onMouseLeave={hide}
              />
              {/* Invisible wider hit area */}
              <line
                x1={toX(c)}
                y1={0}
                x2={toX(c)}
                y2={innerH}
                stroke="transparent"
                strokeWidth={10}
                className="cursor-pointer"
                onMouseEnter={(e) => handleCentroidHover(e, i, c)}
                onMouseLeave={hide}
              />
            </g>
          ))}

          {/* Boundary markers */}
          {codebook.boundaries.map((b, i) => (
            <g key={`b-${i}`}>
              <line
                x1={toX(b)}
                y1={0}
                x2={toX(b)}
                y2={innerH}
                stroke={COLORS.muted}
                strokeWidth={1}
                strokeDasharray="2,2"
              />
              {/* Invisible wider hit area */}
              <line
                x1={toX(b)}
                y1={0}
                x2={toX(b)}
                y2={innerH}
                stroke="transparent"
                strokeWidth={10}
                className="cursor-pointer"
                onMouseEnter={(e) => handleBoundaryHover(e, i, b)}
                onMouseLeave={hide}
              />
            </g>
          ))}

          {/* X axis labels */}
          {[-0.3, -0.15, 0, 0.15, 0.3].map((v) => (
            <text key={v} x={toX(v)} y={innerH + 30} textAnchor="middle" fontSize={10} fill={COLORS.muted}>
              {v.toFixed(2)}
            </text>
          ))}
        </SVGChart>
      </InteractivePanel>
    </>
  );
}
