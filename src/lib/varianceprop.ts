// Signal and gradient scale through a stack of random layers, one activation
// at a time. Used by VarianceProp.astro both at build time (the initial
// figure) and in the browser (after each control change).
//
// Plain layer:  x' = f(W x),            W ~ N(0, g²/n)
// Gated layer:  x' = f(W x) ⊙ (V x),    W, V independent, same distribution
// With "norm" on, x is scaled to unit RMS before the matmuls (pre-norm).
//
// Forward: RMS of x_l for l = 0..L. Backward: a random unit-RMS vector at the
// output pushed back through the exact local Jacobians, RMS of u_l.
// Predicted: the same forward trajectory from the one-dimensional integral
// E[f(z)²] for z ~ N(0, σ²), σ = g · RMS(input), applied layer by layer.

export type Base = 'linear' | 'relu' | 'gelu' | 'swish' | 'relu2';
export type Act = Base | 'bilinear' | 'reglu' | 'geglu' | 'swiglu';

export interface ActInfo {
  key: Act;
  name: string;
  slot: number;
  gated: boolean;
  base: Base;
  formula: string; // the per-layer E[x²] ratio, r = input RMS to the layer
}

export const ACTS: ActInfo[] = [
  { key: 'linear', name: 'linear', slot: 6, gated: false, base: 'linear', formula: 'g²' },
  { key: 'relu', name: 'ReLU', slot: 1, gated: false, base: 'relu', formula: 'g² / 2' },
  { key: 'gelu', name: 'GELU', slot: 2, gated: false, base: 'gelu', formula: 'c(σ) · g²' },
  { key: 'swish', name: 'Swish', slot: 3, gated: false, base: 'swish', formula: 'c(σ) · g²' },
  { key: 'relu2', name: 'ReLU²', slot: 4, gated: false, base: 'relu2', formula: '1.5 · g⁴ · r²' },
  { key: 'bilinear', name: 'Bilinear', slot: 5, gated: true, base: 'linear', formula: 'g⁴ · r²' },
  { key: 'reglu', name: 'ReGLU', slot: 7, gated: true, base: 'relu', formula: 'g⁴ · r² / 2' },
  { key: 'geglu', name: 'GEGLU', slot: 8, gated: true, base: 'gelu', formula: 'c(σ) · g⁴ · r²' },
  { key: 'swiglu', name: 'SwiGLU', slot: 9, gated: true, base: 'swish', formula: 'c(σ) · g⁴ · r²' },
];

export const N = 256;
export const BATCH = 4;
export const MAX_DEPTH = 48;

// ---- scalar functions -------------------------------------------------------

const SQRT2 = Math.SQRT2;
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

// Abramowitz and Stegun 7.1.26, |error| < 1.5e-7.
export function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
const Phi = (x: number) => 0.5 * (1 + erf(x / SQRT2));
const phi = (x: number) => INV_SQRT_2PI * Math.exp(-0.5 * x * x);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const F: Record<Base, (z: number) => number> = {
  linear: (z) => z,
  relu: (z) => (z > 0 ? z : 0),
  gelu: (z) => z * Phi(z),
  swish: (z) => z * sigmoid(z),
  relu2: (z) => (z > 0 ? z * z : 0),
};

export const DF: Record<Base, (z: number) => number> = {
  linear: () => 1,
  relu: (z) => (z > 0 ? 1 : 0),
  gelu: (z) => Phi(z) + z * phi(z),
  swish: (z) => {
    const s = sigmoid(z);
    return s + z * s * (1 - s);
  },
  relu2: (z) => (z > 0 ? 2 * z : 0),
};

// E[f(z)²] for z ~ N(0, σ²). Closed forms where they exist, quadrature otherwise.
export function meanSquare(base: Base, sigma: number): number {
  const s2 = sigma * sigma;
  if (base === 'linear') return s2;
  if (base === 'relu') return s2 / 2;
  if (base === 'relu2') return 1.5 * s2 * s2;
  // Trapezoid on t in [-8, 8] against the standard normal density.
  const f = F[base];
  const K = 1600;
  const h = 16 / K;
  let acc = 0;
  for (let i = 0; i <= K; i++) {
    const t = -8 + i * h;
    const v = f(sigma * t);
    const w = i === 0 || i === K ? 0.5 : 1;
    acc += w * v * v * phi(t);
  }
  return acc * h;
}

// The per-layer E[x²] ratio, given the RMS r of the layer's input.
export function predictedRatio(act: ActInfo, gain: number, r: number): number {
  const sigma = gain * r;
  const ms = meanSquare(act.base, sigma);
  const out = act.gated ? ms * sigma * sigma : ms;
  return out / (r * r);
}

// c(σ) = E[f(z)²] / σ², the constant in the readout for GELU and Swish.
export function cOf(base: Base, sigma: number): number {
  return meanSquare(base, sigma) / (sigma * sigma);
}

// ---- random numbers ---------------------------------------------------------

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }
  next(): number {
    let s = this.s;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.s = s >>> 0;
    return this.s / 4294967296;
  }
  gauss(): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

// Standard-normal matrices, generated once per seed and scaled by g/√n at use.
export interface Matrices {
  seed: number;
  W: Float32Array[];
  V: Float32Array[];
  x0: Float32Array; // BATCH × N unit-variance inputs
  uL: Float32Array; // BATCH × N unit-RMS output cotangents
}

export function makeMatrices(seed: number, depth: number): Matrices {
  const rng = new Rng(seed);
  const W: Float32Array[] = [];
  const V: Float32Array[] = [];
  for (let l = 0; l < depth; l++) {
    const w = new Float32Array(N * N);
    const v = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) w[i] = rng.gauss();
    for (let i = 0; i < N * N; i++) v[i] = rng.gauss();
    W.push(w);
    V.push(v);
  }
  const x0 = new Float32Array(BATCH * N);
  const uL = new Float32Array(BATCH * N);
  for (let i = 0; i < BATCH * N; i++) x0[i] = rng.gauss();
  for (let i = 0; i < BATCH * N; i++) uL[i] = rng.gauss();
  return { seed, W, V, x0, uL };
}

// ---- the simulation ---------------------------------------------------------

export interface SimOptions {
  gain: number;
  depth: number;
  inputScale: number;
  norm: boolean;
}

export interface SimResult {
  act: ActInfo;
  forward: number[]; // RMS of x_l, l = 0..depth
  backward: number[]; // RMS of u_l, l = 0..depth
  predicted: number[]; // analytic forward RMS, l = 0..depth
  fwdRatio: number; // geometric mean over layers of E[x_{l+1}²] / E[input_l²]
  predRatio: number; // geometric mean of the analytic per-layer ratios along the predicted trajectory
  gradRatio: number; // geometric mean over layers of E[u_l²] / E[u_{l+1}²]
  overflowAt: number; // first layer whose output left [1e-30, 1e30], or -1
  c: number | null; // c(σ) at the first layer, for GELU and Swish bases
  sigma: number; // σ at the first layer
}

// y[b] = (g/√n) · M · x[b] for each of the BATCH vectors, M row-major n×n.
function matvec(M: Float32Array, x: Float32Array, y: Float32Array, scale: number): void {
  for (let i = 0; i < N; i++) {
    const row = i * N;
    let a0 = 0,
      a1 = 0,
      a2 = 0,
      a3 = 0;
    for (let j = 0; j < N; j++) {
      const m = M[row + j];
      a0 += m * x[j];
      a1 += m * x[N + j];
      a2 += m * x[2 * N + j];
      a3 += m * x[3 * N + j];
    }
    y[i] = a0 * scale;
    y[N + i] = a1 * scale;
    y[2 * N + i] = a2 * scale;
    y[3 * N + i] = a3 * scale;
  }
}

// y[b] += (g/√n) · Mᵀ · v[b].
function matvecT(M: Float32Array, v: Float32Array, y: Float32Array, scale: number): void {
  for (let i = 0; i < N; i++) {
    const row = i * N;
    const v0 = v[i] * scale,
      v1 = v[N + i] * scale,
      v2 = v[2 * N + i] * scale,
      v3 = v[3 * N + i] * scale;
    for (let j = 0; j < N; j++) {
      const m = M[row + j];
      y[j] += m * v0;
      y[N + j] += m * v1;
      y[2 * N + j] += m * v2;
      y[3 * N + j] += m * v3;
    }
  }
}

function rmsOf(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

function geoMean(ratios: number[]): number {
  let s = 0;
  let k = 0;
  for (const r of ratios) {
    if (r > 0 && Number.isFinite(r)) {
      s += Math.log(r);
      k++;
    }
  }
  return k ? Math.exp(s / k) : NaN;
}

export function simulate(act: ActInfo, m: Matrices, o: SimOptions): SimResult {
  const f = F[act.base];
  const df = DF[act.base];
  const scale = o.gain / Math.sqrt(N);
  const L = Math.min(o.depth, m.W.length);
  const size = BATCH * N;

  // Forward, keeping what the backward pass needs.
  const xs: Float32Array[] = []; // normalized inputs to each layer
  const rs: number[][] = []; // per-vector RMS used by the norm, per layer
  const zs: Float32Array[] = [];
  const ws: Float32Array[] = [];
  const forward: number[] = [];
  const layerIn: number[] = []; // RMS of the (possibly normalized) input to each layer
  let overflowAt = -1;
  let x = new Float32Array(size);
  for (let i = 0; i < size; i++) x[i] = m.x0[i] * o.inputScale;
  forward.push(rmsOf(x));
  for (let l = 0; l < L; l++) {
    const xin = new Float32Array(size);
    const r: number[] = [];
    for (let b = 0; b < BATCH; b++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += x[b * N + j] * x[b * N + j];
      const rb = Math.sqrt(s / N);
      r.push(rb);
      const k = o.norm ? 1 / (rb || 1) : 1;
      for (let j = 0; j < N; j++) xin[b * N + j] = x[b * N + j] * k;
    }
    xs.push(xin);
    rs.push(r);
    layerIn.push(rmsOf(xin));
    const z = new Float32Array(size);
    matvec(m.W[l], xin, z, scale);
    zs.push(z);
    const y = new Float32Array(size);
    if (act.gated) {
      const w = new Float32Array(size);
      matvec(m.V[l], xin, w, scale);
      ws.push(w);
      for (let i = 0; i < size; i++) y[i] = f(z[i]) * w[i];
    } else {
      for (let i = 0; i < size; i++) y[i] = f(z[i]);
    }
    x = y;
    const r1 = rmsOf(x);
    if (!Number.isFinite(r1) || r1 > 1e30 || r1 < 1e-30) {
      // The signal left the representable range; stop here and say so.
      overflowAt = l + 1;
      forward.push(r1 === 0 || r1 < 1e-30 ? 0 : Infinity);
      break;
    }
    forward.push(r1);
  }
  const Lok = overflowAt < 0 ? L : overflowAt - 1; // layers whose backward pass is meaningful

  // Backward.
  const backward: number[] = new Array(L + 1).fill(NaN);
  let u = new Float32Array(size);
  for (let i = 0; i < size; i++) u[i] = m.uL[i];
  if (overflowAt < 0) backward[L] = rmsOf(u);
  const v1 = new Float32Array(size);
  const v2 = new Float32Array(size);
  for (let l = overflowAt < 0 ? L - 1 : -1; l >= 0; l--) {
    const z = zs[l];
    const uhat = new Float32Array(size);
    if (act.gated) {
      const w = ws[l];
      for (let i = 0; i < size; i++) {
        v1[i] = df(z[i]) * w[i] * u[i];
        v2[i] = f(z[i]) * u[i];
      }
      matvecT(m.W[l], v1, uhat, scale);
      matvecT(m.V[l], v2, uhat, scale);
    } else {
      for (let i = 0; i < size; i++) v1[i] = df(z[i]) * u[i];
      matvecT(m.W[l], v1, uhat, scale);
    }
    if (o.norm) {
      // Jᵀ of x̂ = x / r:  (u − x̂ (x̂·u)/n) / r
      const xin = xs[l];
      for (let b = 0; b < BATCH; b++) {
        let dot = 0;
        for (let j = 0; j < N; j++) dot += xin[b * N + j] * uhat[b * N + j];
        const k = dot / N;
        const r = rs[l][b] || 1;
        for (let j = 0; j < N; j++) uhat[b * N + j] = (uhat[b * N + j] - xin[b * N + j] * k) / r;
      }
    }
    u = uhat;
    backward[l] = rmsOf(u);
  }

  // Predicted forward trajectory from the one-dimensional integral.
  const predicted: number[] = [forward[0]];
  let r = forward[0];
  for (let l = 0; l < L; l++) {
    const rin = o.norm ? 1 : r;
    const ratio = predictedRatio(act, o.gain, rin);
    r = Math.min(1e300, Math.sqrt(ratio) * rin);
    predicted.push(r);
  }
  const sigma0 = o.gain * (o.norm ? 1 : forward[0]);
  const isC = act.base === 'gelu' || act.base === 'swish';

  const fwdRatios: number[] = [];
  const gradRatios: number[] = [];
  const predRatios: number[] = [];
  for (let l = 0; l < Lok; l++) {
    fwdRatios.push((forward[l + 1] * forward[l + 1]) / (layerIn[l] * layerIn[l]));
    gradRatios.push((backward[l] * backward[l]) / (backward[l + 1] * backward[l + 1]));
  }
  for (let l = 0; l < Lok; l++) {
    const rin = o.norm ? 1 : predicted[l];
    predRatios.push((predicted[l + 1] * predicted[l + 1]) / (rin * rin));
  }

  return {
    act,
    forward,
    backward,
    predicted,
    fwdRatio: geoMean(fwdRatios),
    predRatio: geoMean(predRatios),
    gradRatio: geoMean(gradRatios),
    overflowAt,
    c: isC ? cOf(act.base, sigma0) : null,
    sigma: sigma0,
  };
}

// ---- drawing ----------------------------------------------------------------

export const W = 640;
export const H = 230;
const PL = 54;
const PR = 16;
const PT = 26;
const PB = 34;
const LOG_MIN = -6;
const LOG_MAX = 6;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function axes(depth: number, title: string): string {
  const parts: string[] = [];
  const xOf = (l: number) => PL + (l / depth) * (W - PL - PR);
  const yOf = (e: number) => PT + (1 - (e - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (H - PT - PB);
  for (let e = LOG_MIN; e <= LOG_MAX; e += 2) {
    parts.push(`<line x1="${PL}" x2="${W - PR}" y1="${yOf(e).toFixed(1)}" y2="${yOf(e).toFixed(1)}" class="${e === 0 ? 'grid zero' : 'grid'}"/>`);
    parts.push(`<text x="${PL - 6}" y="${(yOf(e) + 4).toFixed(1)}" class="tick" text-anchor="end">${e === 0 ? '1' : `1e${e}`}</text>`);
  }
  const step = depth > 24 ? 8 : depth > 12 ? 4 : 2;
  for (let l = 0; l <= depth; l += step) {
    parts.push(`<text x="${xOf(l).toFixed(1)}" y="${H - 16}" class="tick" text-anchor="middle">${l}</text>`);
  }
  parts.push(`<text x="${PL}" y="${PT - 10}" class="tick">${esc(title)}</text>`);
  parts.push(`<text x="${W - PR}" y="${H - 2}" class="tick" text-anchor="end">layer</text>`);
  return parts.join('');
}

function path(values: number[], depth: number, cls: string): string {
  const xOf = (l: number) => PL + (l / depth) * (W - PL - PR);
  const yOf = (e: number) => PT + (1 - (e - LOG_MIN) / (LOG_MAX - LOG_MIN)) * (H - PT - PB);
  let d = '';
  let clippedAt = -1;
  let clippedTop = false;
  let pen = false;
  for (let l = 0; l < values.length; l++) {
    const v = values[l];
    if (Number.isNaN(v)) {
      pen = false;
      continue;
    }
    let e = v > 0 ? Math.log10(v) : -Infinity;
    if (e > LOG_MAX || e < LOG_MIN) {
      if (clippedAt < 0) {
        clippedAt = l;
        clippedTop = e > LOG_MAX;
      }
      e = Math.max(LOG_MIN, Math.min(LOG_MAX, e));
    }
    d += `${pen ? 'L' : 'M'}${xOf(l).toFixed(1)},${yOf(e).toFixed(1)}`;
    pen = true;
  }
  let out = d ? `<path d="${d}" class="${cls}"/>` : '';
  if (clippedAt >= 0 && !cls.includes('pred')) {
    const y = clippedTop ? PT + 10 : H - PB - 4;
    out += `<text x="${(xOf(clippedAt) + 4).toFixed(1)}" y="${y}" class="tick clip">clipped</text>`;
  }
  return out;
}

export function renderPanel(results: SimResult[], depth: number, which: 'forward' | 'backward'): string {
  const title = which === 'forward' ? 'signal RMS at layer l' : 'gradient RMS at layer l, unit RMS at the output';
  const parts = [axes(depth, title)];
  for (const r of results) {
    if (which === 'forward') parts.push(path(r.predicted, depth, `series pred s${r.act.slot}`));
    parts.push(path(r[which], depth, `series s${r.act.slot}`));
  }
  return parts.join('');
}

export function fmtMeasured(r: SimResult): string {
  const base = fmtRatio(r.fwdRatio);
  return r.overflowAt >= 0 ? `${base}, out of range at layer ${r.overflowAt}` : base;
}

export function fmtRatio(v: number): string {
  if (!Number.isFinite(v)) return 'n/a';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) return v.toExponential(2);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(3);
}
