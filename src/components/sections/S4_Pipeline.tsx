import { useState, useMemo } from 'react';
import { InteractivePanel } from '../layout/InteractivePanel';
import { StepControl } from '../viz/StepControl';
import { Slider } from '../viz/Slider';
import { useQuantization } from '../../hooks/useQuantization';
import { normalize } from '../../lib/math';

const D = 8;
const STEP_LABELS = ['Original x', 'Rotated y = Πx', 'Quantized indices', 'Dequantized ỹ', 'Reconstructed x̃ = Πᵀỹ'];

/** Generate a sparse, adversarial-looking unit vector:
 *  one dominant coordinate (±1), plus 0–2 small entries. */
function generateSparseVector(d: number): number[] {
  const v = new Array(d).fill(0);
  // Dominant coordinate
  const dominant = Math.floor(Math.random() * d);
  v[dominant] = Math.random() < 0.5 ? 1 : -1;
  // Add 0–2 small entries on other coordinates
  const numSmall = Math.floor(Math.random() * 3);
  for (let i = 0; i < numSmall; i++) {
    let idx = Math.floor(Math.random() * d);
    while (idx === dominant) idx = Math.floor(Math.random() * d);
    v[idx] = (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.3);
  }
  return normalize(v);
}

function formatVec(v: number[]): string {
  return `[${v.map((x) => x.toFixed(3)).join(', ')}]`;
}

export function S4Pipeline() {
  const [step, setStep] = useState(0);
  const [bits, setBits] = useState(2);
  const [vectorKey, setVectorKey] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vector = useMemo(() => generateSparseVector(D), [vectorKey]);

  const result = useQuantization(vector, bits);

  const stepData: { label: string; values: string; description: string }[] = [
    {
      label: 'Original Vector x',
      values: formatVec(result.original),
      description: `An example ${D}D unit vector.`,
    },
    {
      label: 'Rotated y = Π · x',
      values: formatVec(result.rotated),
      description: 'Multiply by the rotation matrix Π, so each coordinate can be expected to follow a Normal distribution.',
    },
    {
      label: 'Quantized Indices',
      values: `[${result.indices.join(', ')}]`,
      description: `Each coordinate snapped to the nearest of ${result.codebook.centroids.length} Lloyd-Max centroids. These ${bits}-bit integers are what we store.`,
    },
    {
      label: 'Dequantized ỹ',
      values: formatVec(result.dequantized),
      description: 'To check how well the quantization preserves information, we also run the dequantization step.',
    },
    {
      label: 'Reconstructed x̃ = Πᵀ · ỹ',
      values: formatVec(result.reconstructed),
      description: `Rotate back to the original basis. MSE = ${result.mse.toFixed(6)}, indicating how much information is lost when we use the quantized vector.`,
    },
  ];

  const current = stepData[step];

  return (
    <>
      <p className="explanation">
        Here's the first form of the pipeline. The rotation matrix Π and the Lloyd-Max codebook are
        generated once and shared across all vectors: There's no per-vector or per-dataset
        setup cost.
      </p>

      <InteractivePanel caption={`Step through the quantization (and then dequantization) pipeline with an example ${D}D vector. Click "New Vector" to try different inputs.`}>
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setVectorKey((k) => k + 1)}
              className="btn-primary"
            >
              New Vector
            </button>
            <Slider min={1} max={4} value={bits} onChange={setBits} label="Bit-width" valueLabel={`${bits} bit${bits > 1 ? 's' : ''}`} />
          </div>
          <StepControl
            currentStep={step}
            totalSteps={5}
            onStep={setStep}
            labels={STEP_LABELS}
          />
        </div>

        {/* Pipeline visualization */}
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400 mb-4 flex-wrap">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                onClick={() => setStep(i)}
                className={`px-2 py-1 rounded text-center transition-colors cursor-pointer ${i === step
                    ? 'bg-indigo-500 text-white'
                    : i < step
                      ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
              >
                {label.split(' ')[0]}
              </div>
              {i < STEP_LABELS.length - 1 && <span>→</span>}
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded p-4">
          <h4 className="font-mono text-sm font-semibold text-gray-800 mb-1">{current.label}</h4>
          <p className="font-mono text-sm text-indigo-600 mb-2 break-all">{current.values}</p>
          <p className="text-sm text-gray-500">{current.description}</p>
        </div>
      </InteractivePanel>
      <p className="explanation">
        This gives us near-optimal MSE distortion at any bit-width. But for applications like
        nearest-neighbour search and attention, we also want <strong>unbiased inner
          products</strong>.
      </p>
    </>
  );
}
