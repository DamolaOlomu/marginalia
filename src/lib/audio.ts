/** Reduce `values` to `n` buckets, keeping the loudest value in each bucket. */
export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return Array.from({ length: n }, () => 0.06);
  const size = values.length / n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * size);
    const b = Math.max(a + 1, Math.floor((i + 1) * size));
    let peak = 0;
    for (let j = a; j < b && j < values.length; j++) peak = Math.max(peak, values[j]);
    out.push(peak);
  }
  return out;
}

/** Raw level samples → `n` normalised peaks (0.06..1) for drawing a stored waveform. */
export function toPeaks(samples: number[], n: number): number[] {
  const out = resample(samples, n);
  const top = Math.max(...out, 0.001);
  return out.map((v) => Math.max(0.06, Math.min(1, v / top)));
}
