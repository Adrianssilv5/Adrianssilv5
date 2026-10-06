// Synthesises soundtrack.wav (60 s, 44.1 kHz stereo) in sync with the film.
// 128 BPM, so every 7.5 s world is exactly four bars; each world gets its own instruments.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100, LEN = 60, N = SR * LEN;
const BEAT = 60 / 128, BAR = BEAT * 4, E8 = BEAT / 2, S16 = BEAT / 4, SCENE = 7.5;
const L = new Float32Array(N), R = new Float32Array(N);
const sendL = new Float32Array(N), sendR = new Float32Array(N); // echo bus
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;

// write one voice: fn(t) -> sample, over [t0, t0+dur], panned, optionally echoed
function voice(t0, dur, fn, { gain = 1, pan = 0, send = 0 } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) {
    const v = fn((i - t0 * SR) / SR);
    L[i] += v * gl; R[i] += v * gr;
    if (send) { sendL[i] += v * gl * send; sendR[i] += v * gr * send; }
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const adsr = (t, a, dur, rel) => (t < a ? t / a : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel));

// ---------- instruments ----------
const inst = {
  musicBox(t0, m, g = 0.12, pan = 0) { const f = mtof(m); voice(t0, 1.6, (t) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) * env(t, 0.002, 0.5), { gain: g, pan, send: 0.35 }); },
  glock(t0, m, g = 0.12, pan = 0) { const f = mtof(m); voice(t0, 1.4, (t) => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 3.98 * t) * Math.exp(-t * 9)) * env(t, 0.001, 0.38), { gain: g, pan, send: 0.3 }); },
  marimba(t0, m, g = 0.2, pan = 0) { const f = mtof(m); voice(t0, 0.8, (t) => (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 4 * t) * Math.exp(-t * 30)) * env(t, 0.002, 0.18), { gain: g, pan, send: 0.15 }); },
  pluck(t0, m, g = 0.18, pan = 0, decay = 0.996) { // Karplus–Strong string
    const f = mtof(m), period = Math.round(SR / f), buf = new Float32Array(period);
    for (let k = 0; k < period; k++) buf[k] = noise();
    let idx = 0, last = 0;
    voice(t0, 1.4, () => { const v = buf[idx]; const nv = decay * 0.5 * (v + last); last = v; buf[idx] = nv; idx = (idx + 1) % period; return v; }, { gain: g, pan, send: 0.1 });
  },
  square(t0, m, dur, g = 0.07, pan = 0, duty = 0.25) { const f = mtof(m); voice(t0, dur + 0.03, (t) => ((t * f) % 1 < duty ? 1 : -1) * adsr(t, 0.003, dur, 0.03), { gain: g, pan, send: 0.12 }); },
  tri(t0, m, dur, g = 0.16, pan = 0) { const f = mtof(m); voice(t0, dur + 0.03, (t) => (4 * Math.abs((t * f) % 1 - 0.5) - 1) * adsr(t, 0.003, dur, 0.03), { gain: g, pan }); },
  bass(t0, m, dur, g = 0.22) { const f = mtof(m); voice(t0, dur + 0.05, (t) => (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)) * adsr(t, 0.005, dur, 0.05) * (0.7 + 0.3 * Math.exp(-t * 8)), { gain: g }); },
  saw(t0, m, dur, g = 0.05, pan = 0, bright = 8, send = 0.2) {
    const f = mtof(m), H = Math.min(bright, Math.floor(16000 / f));
    voice(t0, dur + 0.25, (t) => { let s = 0; for (let h = 1; h <= H; h++) s += Math.sin(TAU * f * h * t + h) / h; return s * adsr(t, 0.01, dur, 0.22); }, { gain: g, pan, send });
  },
  pad(t0, ms, dur, g = 0.035) { ms.forEach((m, k) => { const f = mtof(m); voice(t0, dur + 0.6, (t) => { let s = 0; for (let h = 1; h <= 6; h++) s += Math.sin(TAU * f * h * t * (1 + 0.003 * k) + h) / (h * h); return s * adsr(t, 0.4, dur, 0.6); }, { gain: g, pan: (k - 1) * 0.5, send: 0.3 }); }); },
  rhodes(t0, m, dur, g = 0.1, pan = 0) { const f = mtof(m); voice(t0, dur + 0.4, (t) => Math.sin(TAU * f * t + 1.6 * Math.exp(-t * 3) * Math.sin(TAU * f * t)) * adsr(t, 0.004, dur, 0.4) * (1 + 0.15 * Math.sin(TAU * 4.5 * t)), { gain: g, pan, send: 0.25 }); },
  brass(t0, m, dur, g = 0.06, pan = 0) { const f = mtof(m); voice(t0, dur + 0.1, (t) => { const b = 3 + 9 * Math.exp(-t * 6); let s = 0; for (let h = 1; h <= 12; h++) s += Math.sin(TAU * f * h * t) / h * Math.exp(-h / b); return s * adsr(t, 0.015, dur, 0.08); }, { gain: g, pan, send: 0.1 }); },
  flute(t0, m, dur, g = 0.07, pan = 0) { const f = mtof(m); voice(t0, dur + 0.15, (t) => (Math.sin(TAU * f * t + 0.004 * f * Math.sin(TAU * 5.5 * t) * Math.min(1, t * 3)) + 0.05 * noise()) * adsr(t, 0.04, dur, 0.12), { gain: g, pan, send: 0.3 }); },
  kick(t0, g = 0.5) { voice(t0, 0.45, (t) => Math.sin(TAU * (45 * t + 105 * (1 - Math.exp(-t * 28)) / 28)) * Math.exp(-t * 7), { gain: g }); },
  snare(t0, g = 0.22) { let lp = 0; voice(t0, 0.3, (t) => { const n = noise(); lp += 0.35 * (n - lp); return ((n - lp) * 0.9 + 0.4 * Math.sin(TAU * 185 * t)) * Math.exp(-t * 18); }, { gain: g, send: 0.15 }); },
  clap(t0, g = 0.2) { voice(t0, 0.25, (t) => { const e = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.4 : 1) : Math.exp(-(t - 0.03) * 22); return noise() * e; }, { gain: g, pan: 0.1, send: 0.2 }); },
  hat(t0, g = 0.06, pan = 0.3) { let lp = 0; voice(t0, 0.08, (t) => { const n = noise(); lp += 0.6 * (n - lp); return (n - lp) * Math.exp(-t * 60); }, { gain: g, pan }); },
  shaker(t0, g = 0.05) { let lp = 0; voice(t0, 0.1, (t) => { const n = noise(); lp += 0.5 * (n - lp); return (n - lp) * env(t, 0.02, 0.03); }, { gain: g, pan: -0.3 }); },
};

// ---------- sound effects ----------
const fx = {
  whoosh(tc, g = 0.16, up = true) {
    let lp = 0;
    voice(tc - 0.55, 1.1, (t) => { const p = t / 1.1, cut = up ? 0.02 + 0.5 * p : 0.52 - 0.5 * p; lp += cut * (noise() - lp); return lp * Math.sin(Math.PI * p) ** 2; }, { gain: g * 2.2, pan: 0, send: 0.2 });
  },
  boing(t0, g = 0.12) { voice(t0, 0.45, (t) => Math.sin(TAU * (330 * t + 60 * Math.sin(TAU * 11 * t) * Math.exp(-t * 6) / 11 + 300 * t * t)) * Math.exp(-t * 6), { gain: g }); },
  chime(t0, g = 0.09) { [84, 88, 91, 96].forEach((m, k) => inst.glock(t0 + k * 0.07, m, g, (k - 1.5) * 0.3)); },
  coin(t0) { inst.square(t0, 83, 0.08, 0.08, 0, 0.5); inst.square(t0 + 0.08, 88, 0.35, 0.08, 0, 0.5); },
  scribble(t0, dur, g = 0.05) {
    let lp = 0, bp = 0;
    voice(t0, dur, (t) => { const n = noise(); lp += 0.25 * (n - lp); bp += 0.45 * ((n - lp) - bp); const stroke = Math.max(0, Math.sin(TAU * 7.3 * t) * Math.sin(TAU * 2.1 * t + 1)); return bp * stroke * 1.4; }, { gain: g, pan: 0.2 });
  },
  shutter(t0) { voice(t0, 0.18, (t) => noise() * (t < 0.02 ? 1 : t < 0.07 ? 0.15 : t < 0.09 ? 0.8 : 0.1 * Math.exp(-t * 30)), { gain: 0.35 }); fx.whoosh(t0 + 0.4, 0.05, false); },
  tear(t0) { voice(t0 - 0.4, 0.9, (t) => noise() * (rnd() < 0.3 ? 1 : 0.2) * Math.sin(Math.PI * t / 0.9), { gain: 0.1, pan: -0.2 }); },
  glitch(t0) { for (let k = 0; k < 9; k++) { const s = t0 - 0.45 + k * 0.1; inst.square(s, 40 + Math.floor(rnd() * 40), 0.04 + rnd() * 0.05, 0.05, rnd() - 0.5, 0.5); } },
  pixelDown(t0) { [96, 91, 88, 84, 79, 76, 72, 67].forEach((m, k) => inst.square(t0 - 0.45 + k * 0.055, m, 0.05, 0.05, 0, 0.5)); },
  bubbles(t0) { for (let k = 0; k < 8; k++) { const s = t0 - 0.45 + k * 0.11, f0 = 500 + rnd() * 700; voice(s, 0.1, (t) => Math.sin(TAU * f0 * t * (1 + t * 8)) * Math.exp(-t * 40), { gain: 0.07, pan: rnd() - 0.5 }); } },
  tick(t0) { for (let k = 0; k < 4; k++) voice(t0 - 0.45 + k * 0.25, 0.04, (t) => Math.sin(TAU * (k % 2 ? 1800 : 2400) * t) * Math.exp(-t * 120), { gain: 0.1 }); },
  waves(t0, dur) { let lp = 0; voice(t0, dur, (t) => { lp += 0.04 * (noise() - lp); const sw = 0.35 + 0.65 * Math.sin(Math.PI * ((t % 3.75) / 3.75)) ** 2; return lp * sw * Math.min(1, t, dur - t); }, { gain: 0.5, pan: -0.15 }); },
  chirp(t0, g = 0.04) { voice(t0, 0.12, (t) => Math.sin(TAU * (3200 * t + 9000 * t * t)) * Math.sin(Math.PI * t / 0.12), { gain: g, pan: 0.5 }); },
};

// ---------- the song ----------
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; // C Am F G
const ROOTS = [48, 45, 41, 43];
const MELODY = [
  [76, null, 79, null, 84, 83, 79, null], [81, null, 79, 76, null, 72, 74, 76],
  [77, null, 81, null, 84, 81, 79, 77], [79, null, 74, 77, 79, null, 71, 74],
];
const bars = (s, fn) => { for (let b = 0; b < 4; b++) fn(s * SCENE + b * BAR, b); };
const eighths = (t0, fn) => { for (let k = 0; k < 8; k++) fn(t0 + k * E8, k); };
const melody = (s, fn, from = 0) => bars(s, (t0, b) => { if (b < from) return; eighths(t0, (t, k) => { const m = MELODY[b][k]; if (m) fn(t, m, k); }); });
const drums = (s, { kick = [0, 2], snare = [1, 3], clap = false, hats = 8, from = 0, g = 1 } = {}) => bars(s, (t0, b) => {
  if (b < from) return;
  kick.forEach((q) => inst.kick(t0 + q * BEAT, 0.45 * g));
  snare.forEach((q) => (clap ? inst.clap : inst.snare)(t0 + q * BEAT, 0.2 * g));
  for (let k = 0; k < hats; k++) inst.hat(t0 + k * (BAR / hats), 0.05 * g);
});

// 1 · sketchbook: music box + pencil scratching
fx.scribble(0.15, 1.9); fx.scribble(2.1, 1.05, 0.04);
bars(0, (t0, b) => { const c = CHORDS[b]; [c[0], c[1], c[2], c[0] + 12, c[2], c[1], c[0] + 12, c[2]].forEach((m, k) => inst.musicBox(t0 + k * E8, m + 12, 0.07 + b * 0.015, (k % 2) - 0.5)); });
bars(0, (t0, b) => { if (b >= 2) inst.pad(t0, CHORDS[b], BAR, 0.03); });
fx.boing(3.3, 0.06); fx.chime(3.3, 0.05);
// 2 · park: ukulele strums, whistle melody, light beat
bars(1, (t0, b) => {
  const c = CHORDS[b].map((m) => m + 12);
  [1, 0, 0.6, 0.5, 0, 0.7, 0.8, 0.5].forEach((a, k) => { if (a) c.forEach((m, j) => inst.pluck(t0 + k * E8 + (k % 2 ? 2 - j : j) * 0.012, m, 0.09 * a, (j - 1) * 0.4)); });
  inst.bass(t0, ROOTS[b], BEAT * 1.5); inst.bass(t0 + BEAT * 2, ROOTS[b] + 7, BEAT * 1.5);
});
melody(1, (t, m) => inst.flute(t, m, E8 * 0.9, 0.06, 0.2), 1);
drums(1, { clap: true, hats: 8, g: 0.8 });
// 3 · 8-bit city: chiptune
bars(2, (t0, b) => {
  for (let k = 0; k < 8; k++) inst.tri(t0 + k * E8, ROOTS[b] - 12 + (k % 2 ? 12 : 0), E8 * 0.8, 0.14);
  for (let k = 0; k < 16; k++) inst.square(t0 + k * S16, CHORDS[b][k % 3] + 12, S16 * 0.7, 0.025, 0.3, 0.125);
  for (let k = 0; k < 8; k++) inst.hat(t0 + k * E8, 0.05);
  inst.kick(t0, 0.35); inst.kick(t0 + 2 * BEAT, 0.35);
});
melody(2, (t, m) => inst.square(t, m, E8 * 0.85, 0.055, -0.1, 0.25));
fx.coin(2 * SCENE + 3.6);
// 4 · night drive: synthwave
bars(3, (t0, b) => {
  CHORDS[b].forEach((m, k) => inst.saw(t0, m, BAR * 0.95, 0.022, (k - 1) * 0.6, 10, 0.35));
  for (let k = 0; k < 16; k++) inst.saw(t0 + k * S16, ROOTS[b] - 12 + (k % 4 === 2 ? 12 : 0), S16 * 0.6, 0.06, 0, 6, 0.05);
});
drums(3, { kick: [0, 1, 2, 3], snare: [1, 3], hats: 8 });
melody(3, (t, m) => inst.saw(t, m, E8 * 0.9, 0.035, 0.15, 12, 0.45), 2);
// 5 · mountains: marimba + shaker + birds
bars(4, (t0, b) => {
  const c = CHORDS[b];
  [c[0], c[2], c[1] + 12, c[2], c[0] + 12, c[2], c[1] + 12, c[2]].forEach((m, k) => inst.marimba(t0 + k * E8, m, 0.1, (k % 2) - 0.5));
  inst.bass(t0, ROOTS[b], BAR * 0.9, 0.18);
  for (let k = 0; k < 16; k++) inst.shaker(t0 + k * S16, k % 4 === 2 ? 0.06 : 0.035);
  inst.kick(t0, 0.3); inst.kick(t0 + 2.5 * BEAT, 0.25);
});
melody(4, (t, m) => inst.marimba(t, m + 12, 0.11, 0.2), 1);
[30.9, 31.3, 33.7, 34.05, 36.2].forEach((t) => fx.chirp(t));
// 6 · seaside: Rhodes, waves, soft groove
fx.waves(5 * SCENE - 0.4, SCENE + 0.8);
bars(5, (t0, b) => {
  CHORDS[b].forEach((m, k) => { inst.rhodes(t0, m, BEAT * 1.4, 0.06, (k - 1) * 0.4); inst.rhodes(t0 + 2.5 * BEAT, m, BEAT * 1.2, 0.045, (k - 1) * 0.4); });
  inst.bass(t0, ROOTS[b], BEAT * 1.5, 0.2); inst.bass(t0 + 1.5 * BEAT, ROOTS[b] + 7, BEAT * 0.8, 0.16);
  for (let k = 0; k < 8; k++) inst.shaker(t0 + k * E8, 0.03);
});
melody(5, (t, m) => inst.rhodes(t, m, E8 * 1.2, 0.05, 0.25), 2);
// 7 · comic city: brass stabs, claps, big backbeat
bars(6, (t0, b) => {
  [0, 1.5, 2.5, 3.5].forEach((q) => CHORDS[b].forEach((m, k) => inst.brass(t0 + q * BEAT, m, E8 * 0.7, 0.03, (k - 1) * 0.5)));
  for (let k = 0; k < 8; k++) inst.bass(t0 + k * E8, ROOTS[b] + (k === 3 || k === 7 ? 12 : 0), E8 * 0.6, 0.2);
});
drums(6, { kick: [0, 1.5, 2], snare: [1, 3], clap: true, hats: 8 });
melody(6, (t, m) => inst.brass(t, m, E8 * 0.8, 0.045, 0.1), 1);
fx.boing(6 * SCENE + 3.35, 0.14); fx.boing(6 * SCENE + 3.7, 0.1);
// 8 · group photo: everything together, shutter, final chord
bars(7, (t0, b) => {
  if (b === 3) return;
  const c = CHORDS[b].map((m) => m + 12);
  [1, 0, 0.6, 0.5, 0, 0.7, 0.8, 0.5].forEach((a, k) => { if (a) c.forEach((m, j) => inst.pluck(t0 + k * E8 + j * 0.012, m, 0.08 * a, (j - 1) * 0.4)); });
  inst.pad(t0, CHORDS[b], BAR, 0.03);
  for (let k = 0; k < 8; k++) inst.bass(t0 + k * E8, ROOTS[b] + (k % 2 ? 12 : 0), E8 * 0.7, 0.17);
});
drums(7, { clap: true, hats: 8, g: 0.9 });
[0, 1, 2].forEach((b) => eighths(7 * SCENE + b * BAR, (t, k) => { const m = MELODY[b][k]; if (m) inst.glock(t, m + 12, 0.08, 0.2); }));
fx.shutter(7 * SCENE + 2.98);
const END = 7 * SCENE + 3 * BAR;
[48, 60, 64, 67, 72, 76].forEach((m, k) => { inst.pad(END, [m], 1.6, 0.05); inst.pluck(END + k * 0.03, m + 12, 0.08, (k - 2.5) * 0.3, 0.999); });
[84, 88, 91, 96, 100].forEach((m, k) => inst.glock(END + 0.2 + k * 0.09, m, 0.06, (k - 2) * 0.3));
inst.kick(END, 0.4);
// greetings in every world: a hop "boing" + a little chime for the hearts
for (let s = 1; s <= 6; s++) { if (s !== 6) fx.boing(s * SCENE + 3.45, 0.07); fx.chime(s * SCENE + 3.58, 0.05); }
// transitions
fx.whoosh(7.5); fx.pixelDown(15); fx.whoosh(15, 0.08); fx.glitch(22.5); fx.whoosh(22.5, 0.1);
fx.tear(30); fx.whoosh(30, 0.08); fx.whoosh(37.5, 0.14); fx.bubbles(45); fx.whoosh(45, 0.08); fx.tick(52.5); fx.whoosh(52.5, 0.12);

// ---------- mix: ping-pong echo on the send bus, soft clip, fades, normalise ----------
const D = Math.round(E8 * 1.5 * SR);
for (let i = D; i < N; i++) { sendL[i] += sendR[i - D] * 0.38; sendR[i] += sendL[i - D] * 0.38; }
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, t / 0.05, (LEN - t) / 1.2);
  L[i] = Math.tanh((L[i] + sendL[i] * 0.5) * 1.1) * fade;
  R[i] = Math.tanh((R[i] + sendR[i] * 0.5) * 1.1) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { out.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4); out.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4); }
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'soundtrack.wav'), out);
console.log(`wrote soundtrack.wav (peak before normalise ${peak.toFixed(2)})`);
