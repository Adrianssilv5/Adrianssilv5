// Timing, easing and small helpers shared by every shot.
export const W = 1920, H = 1080, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, DURATION = 60;
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const pulse = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
export const ease = {
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p) => 1 - Math.pow(1 - p, 3),
  outQuint: (p) => 1 - Math.pow(1 - p, 5),
  in: (p) => p * p * p,
  sine: (p) => 0.5 - 0.5 * Math.cos(Math.PI * p),
  // Apple-ish: cubic-bezier(.16,1,.3,1) approximated by an exponential out
  expo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  outBack: (p, s = 1.6) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
};
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// keyframe track: [[t, ...values], ...] eased between keys
export function track(keys, t, fn = ease.inOut) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, ...a] = keys[i], [t1, ...b] = keys[i + 1];
    if (t <= t1) { const p = fn(seg(t, t0, t1)); return a.map((v, j) => lerp(v, b[j], p)); }
  }
  return keys[keys.length - 1].slice(1);
}
// Photoplethysmography-like pulse: smooth systolic peak with a small dicrotic notch (deliberately not an ECG spike)
export function ppg(x) {
  const f = ((x % 1) + 1) % 1;
  return Math.exp(-Math.pow((f - 0.18) / 0.075, 2)) + 0.38 * Math.exp(-Math.pow((f - 0.42) / 0.09, 2));
}
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
