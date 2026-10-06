'use strict';
// ---------- math, easing, noise, colour and polygon helpers ----------
const W = 1920, H = 1080, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const pulse = (t, a, b) => Math.sin(Math.PI * seg(t, a, b)); // 0 → 1 → 0
const ease = {
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p) => 1 - Math.pow(1 - p, 3),
  in: (p) => p * p * p,
  smooth: (p) => p * p * (3 - 2 * p),
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
};

function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function hash2(x, y) { return hash(x * 157.31 + y * 613.17); }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; }
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), o = seed * 71.37;
  return lerp(hash(i + o), hash(i + 1 + o), u) * 2 - 1;
}
function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), o = seed * 31.7;
  const a = hash2(ix + o, iy), b = hash2(ix + 1 + o, iy), c = hash2(ix + o, iy + 1), d = hash2(ix + 1 + o, iy + 1);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour ----------
const _rgbCache = new Map();
function hexRgb(h) {
  let c = _rgbCache.get(h);
  if (c) return c;
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  const n = parseInt(s, 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  _rgbCache.set(h, c);
  return c;
}
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
function mix(a, b, p) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => lerp(v, B[i], p))); }
const shade = (c, amt) => (amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt));
function rgba(c, a) { const [r, g, b] = hexRgb(c); return `rgba(${r},${g},${b},${a})`; }
function luminance(c) { const [r, g, b] = hexRgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
function toHsl(c) {
  let [r, g, b] = hexRgb(c).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return rgbHex([f(0), f(8), f(4)]);
}

// ---------- affine matrices [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f ----------
const M = {
  id: () => [1, 0, 0, 1, 0, 0],
  mul: (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]],
  tr: (x, y) => [1, 0, 0, 1, x, y],
  rot: (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0],
  sc: (x, y = x) => [x, 0, 0, y, 0, 0],
  about: (cx, cy, m) => M.mul(M.tr(cx, cy), M.mul(m, M.tr(-cx, -cy))),
};
const xf = (pts, m) => pts.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
const xp = (p, m) => xf([p], m)[0];

// ---------- polygons ----------
function ellipsePts(cx, cy, rx, ry, n = 40, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
function catmull(pts, closed = true, steps = 8) {
  const out = [], n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
// Scalloped / fluffy outline (poodles, clouds)
function scallopPts(cx, cy, rx, ry, bumps, amp, n = 90) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, k = 1 + amp * Math.abs(Math.sin(a * bumps / 2));
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}
// A stroke turned into a filled polygon, width tapering from w0 to w1 (half-widths), round caps.
function tapered(line, w0, w1, cap = 6) {
  const n = line.length, L = [], R = [];
  const ws = line.map((_, i) => lerp(w0, w1, i / (n - 1)));
  const ang = [];
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ang.push(th);
    L.push([line[i][0] + Math.cos(th + Math.PI / 2) * ws[i], line[i][1] + Math.sin(th + Math.PI / 2) * ws[i]]);
    R.push([line[i][0] + Math.cos(th - Math.PI / 2) * ws[i], line[i][1] + Math.sin(th - Math.PI / 2) * ws[i]]);
  }
  const out = L.slice();
  const e = line[n - 1], te = ang[n - 1];
  for (let k = 1; k < cap; k++) { const a = te + Math.PI / 2 - (k / cap) * Math.PI; out.push([e[0] + Math.cos(a) * ws[n - 1], e[1] + Math.sin(a) * ws[n - 1]]); }
  for (let i = n - 1; i >= 0; i--) out.push(R[i]);
  const s = line[0], ts = ang[0];
  for (let k = 1; k < cap; k++) { const a = ts - Math.PI / 2 - (k / cap) * Math.PI; out.push([s[0] + Math.cos(a) * ws[0], s[1] + Math.sin(a) * ws[0]]); }
  return out;
}
const capsule = (x1, y1, x2, y2, r1, r2) => tapered([[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]], r1, r2, 8);
function heartPts(cx, cy, size, n = 36) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    out.push([cx + (16 * Math.pow(Math.sin(t), 3)) * size / 32, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * size / 32]);
  }
  return out;
}
function starPts(cx, cy, r1, r2, n, rot = 0) {
  const out = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU - Math.PI / 2, r = i % 2 ? r2 : r1; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
function bbox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function polyPath(ctx, pts, closed = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}
function perimeter(pts, closed = true) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  if (closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  return L;
}
// First `frac` of a polyline (for draw-on animation). Returns [points, tipPoint].
function partialLine(pts, frac, closed = true) {
  const src = closed ? pts.concat([pts[0]]) : pts;
  const total = perimeter(src, false), target = total * clamp(frac);
  const out = [src[0]];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const d = Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]);
    if (acc + d >= target) {
      const p = d ? (target - acc) / d : 0;
      const tip = [lerp(src[i - 1][0], src[i][0], p), lerp(src[i - 1][1], src[i][1], p)];
      out.push(tip);
      return [out, tip];
    }
    acc += d;
    out.push(src[i]);
  }
  return [out, src[src.length - 1]];
}
// Displace each vertex along its normal by smooth noise (stable per seed): watercolour / hand-cut edges.
function wobble(pts, amp, freq, seed, closed = true) {
  const n = pts.length, out = [];
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    const d = amp * (noise1(s * freq, seed) * 0.8 + noise1(s * freq * 3.1, seed + 5) * 0.35);
    out.push([pts[i][0] + Math.cos(th) * d, pts[i][1] + Math.sin(th) * d]);
  }
  return out;
}
function jitter(pts, amp, seed, freq = 0.08) {
  return pts.map(([x, y], i) => [x + noise1(i * freq * 3 + x * 0.01, seed) * amp, y + noise1(i * freq * 3 + y * 0.01, seed + 9) * amp]);
}
function resample(pts, step, closed = true) {
  const src = closed ? pts.concat([pts[0]]) : pts, out = [];
  let carry = 0;
  for (let i = 1; i < src.length; i++) {
    const [x0, y0] = src[i - 1], [x1, y1] = src[i], d = Math.hypot(x1 - x0, y1 - y0);
    let s = carry;
    while (s < d) { out.push([lerp(x0, x1, s / d), lerp(y0, y1, s / d)]); s += step; }
    carry = s - d;
  }
  return out.length > 2 ? out : pts;
}

// ---------- canvases + textures ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// value noise that wraps every P lattice cells, so textures tile without seams
function pnoise(x, y, P, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hash2((((i % P) + P) % P) + seed * 31.7, ((j % P) + P) % P);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy) * 2 - 1;
}
function noiseTexture(size, seed, scale, contrast) {
  const c = makeCanvas(size, size), g = c.getContext('2d'), img = g.createImageData(size, size), r = rng(seed);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = r() * 0.5;
    if (scale) v += (pnoise(x / scale, y / scale, size / scale, seed) * 0.5 + 0.5) * 0.5 + pnoise(x / (scale / 4), y / (scale / 4), (size / scale) * 4, seed + 3) * 0.25;
    v = clamp(0.5 + (v - 0.5) * contrast, 0, 1) * 255;
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
