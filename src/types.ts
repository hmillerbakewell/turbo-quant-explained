export type SectionId =
  | 'problem'
  | 'rotation'
  | 'optimal-quant'
  | 'pipeline'
  | 'bias-problem'
  | 'qjl'
  | 'bias-comparison'
  | 'near-optimality'
  | 'real-world';

export type Vector = number[];

export interface Codebook {
  centroids: number[];
  boundaries: number[];
}

export interface QuantizationResult {
  original: Vector;
  rotated: Vector;
  indices: number[];
  dequantized: Vector;
  reconstructed: Vector;
  mse: number;
  codebook: Codebook;
}
