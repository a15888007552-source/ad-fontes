/* Shared draw primitives for celestial event hooks. Every writer emits into
   the engine's preallocated point/line scratch buffers through ctx — no GL
   state, no per-event GPU resources, no allocations of scene-sized arrays. */

const TAU = Math.PI * 2;

/* Trapezoidal fade envelope: rises over `rise` fraction, falls over `fall`. */
export function env(t, rise = .2, fall = .3) {
  return Math.max(0, Math.min(t / rise, (1 - t) / fall, 1));
}
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const vnorm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vunitRand = () => { const z = Math.random() * 2 - 1, a = Math.random() * TAU, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), z, r * Math.sin(a)]; };
/* Deterministic per-index hash noise in [0,1) — stable pseudo-random layout
   for comets/auroras without storing per-particle state on the event. */
export const hnoise = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };

/* Soft gaussian blob of points around a world-space center. */
export function blob(ctx, center, basis, count, rx, ry, rz, colorFn, sizeFn, alphaFn, seed = 1) {
  for (let i = 0; i < count; i++) {
    const h1 = hnoise(i, seed) * 2 - 1, h2 = hnoise(i + 91, seed) * 2 - 1, h3 = hnoise(i + 173, seed) * 2 - 1;
    const p = center.map((v, k) => v + basis[0][k] * h1 * rx + basis[1][k] * h2 * ry + basis[2][k] * h3 * rz);
    ctx.point(p, colorFn(i, h1), sizeFn(i, h2), alphaFn(i, h3));
  }
}

/* Diverging fan of line strips from an origin along `dir`, spread within the
   `up` plane; alpha decays along the beam. Returns nothing; writes lines. */
export function beamFan(ctx, origin, dir, up, len, segs, strands, spread, color, alphaBase, falloff = 2.6) {
  for (let s = 0; s < strands; s++) {
    const off = strands > 1 ? (s / (strands - 1) - .5) * 2 * spread : 0;
    let prev = null;
    for (let j = 0; j <= segs; j++) {
      const t = j / segs, a = off * (.4 + t * .6);
      const dx = dir.map((v, k) => v * Math.cos(a) + up[k] * Math.sin(a));
      const p = origin.map((v, k) => v + dx[k] * len * t);
      if (prev) ctx.line(prev, p, color, alphaBase * Math.exp(-t * falloff));
      prev = p;
    }
  }
}
