import { ScrollLayout } from './components/layout/ScrollLayout';
import { Section } from './components/layout/Section';
import { S1Problem } from './components/sections/S1_Problem';
import { S2RandomRotation } from './components/sections/S2_RandomRotation';
import { S3OptimalQuant } from './components/sections/S3_OptimalQuant';
import { S4Pipeline } from './components/sections/S4_Pipeline';
import { S5BiasProblem } from './components/sections/S5_BiasProblem';
import { S6QJLExplained } from './components/sections/S6_QJLExplained';
import { S7BiasComparison } from './components/sections/S7_BiasComparison';
import { S8NearOptimality } from './components/sections/S8_NearOptimality';

function App() {
  return (
    <ScrollLayout>
      <header className="py-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">TurboQuant</h1>
        <p className="text-lg text-gray-500">
          Online Vector Quantization with Near-Optimal Distortion Rate
        </p>
        <p className="mt-3 text-sm text-gray-400">
          Based on the{' '}
          <a
            href="https://arxiv.org/abs/2504.19874"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 transition-colors"
          >
            paper
          </a>{' '}
          and{' '}
          <a
            href="https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600 transition-colors"
          >
            blog post
          </a>{' '}
          by Zandieh et al., 2025
        </p>
      </header>

      {/* Act 1: Compress without seeing the data */}
      <Section id="problem" number={1} title="The Cost of Vectors" subtitle="Why compression matters at scale">
        <S1Problem />
      </Section>

      <Section id="rotation" number={2} title="Encoding Unseen Data" subtitle="How rotation changes distributions">
        <S2RandomRotation />
      </Section>

      <Section id="optimal-quant" number={3} title="The Universal Codebook" subtitle="Lloyd-Max quantization for a known distribution">
        <S3OptimalQuant />
      </Section>

      <Section id="pipeline" number={4} title="Pipeline: Just Minimising MSE" subtitle="Rotate, quantize, store, reconstruct">
        <S4Pipeline />
      </Section>

      {/* Act 2: Preserve inner products */}
      <Section id="bias-problem" number={5} title="The Inner Product Bias" subtitle="Why minimizing MSE isn't enough">
        <S5BiasProblem />
      </Section>

      <Section id="qjl" number={6} title="QJL: The 1-Bit Fix" subtitle="How sign sketches make inner products unbiased">
        <S6QJLExplained />
      </Section>

      <Section id="bias-comparison" number={7} title="Putting It Together" subtitle="QJL removes the bias that MSE-only quantization introduces">
        <S7BiasComparison />
      </Section>

      {/* Payoff */}
      <Section id="near-optimality" number={8} title="Comparison" subtitle="How TurboQuant compares to other methods">
        <S8NearOptimality />
      </Section>

    </ScrollLayout>
  );
}

export default App;
