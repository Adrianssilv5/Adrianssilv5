// Synthesises soundtrack.wav (60 s, 44.1 kHz stereo), scored to the film's cuts.
// 120 BPM, 4/4: one bar = 2 s, every cut lands on a bar line. D minor, lifting at dawn.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100, LEN = 60, N = SR * LEN;
const BEAT = 0.5, BAR = 2, E8 = 0.25, S16 = 0.125;
const L = new Float32Array(N), R = new Float32Array(N), sendL = new Float32Array(N), sendR = new Float32Array(N);
const TAU = Math.PI * 2, mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), noise = () => rnd() * 2 - 1;

function voice(t0, dur, fn, { gain = 1, pan = 0, send = 0 } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = i0; i < i1; i++) {
    const v = fn((i - t0 * SR) / SR);
    L[i] += v * gl; R[i] += v * gr;
    if (send) { sendL[i] += v * gl * send; sendR[i] += v * gr * send; }
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const adsr = (t, a, dur, rel) => (t < a ? t / a : t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel));

const inst = {
  // felt piano: soft attack, few harmonics, gentle decay
  piano(t0, m, g = 0.13, pan = 0, dec = 1.4) { const f = mtof(m); voice(t0, dec * 2.5, (t) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3) + 0.12 * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 6)) * env(t, 0.012, dec), { gain: g, pan, send: 0.35 }); },
  pluck(t0, m, g = 0.1, pan = 0, decay = 0.994) {
    const f = mtof(m), period = Math.round(SR / f), buf = new Float32Array(period);
    for (let k = 0; k < period; k++) buf[k] = noise();
    let idx = 0, last = 0;
    voice(t0, 0.9, () => { const v = buf[idx]; const nv = decay * 0.5 * (v + last); last = v; buf[idx] = nv; idx = (idx + 1) % period; return v; }, { gain: g, pan, send: 0.25 });
  },
  pad(t0, ms, dur, g = 0.03, bright = 5) { ms.forEach((m, k) => { const f = mtof(m); voice(t0, dur + 0.8, (t) => { let s = 0; for (let h = 1; h <= bright; h++) s += Math.sin(TAU * f * h * t * (1 + 0.002 * k) + h) / (h * h); return s * adsr(t, 0.6, dur, 0.8); }, { gain: g, pan: (k - 1) * 0.5, send: 0.35 }); }); },
  bass(t0, m, dur, g = 0.2) { const f = mtof(m); voice(t0, dur + 0.05, (t) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) + 0.1 * Math.sin(TAU * 3 * f * t)) * adsr(t, 0.006, dur, 0.06) * (0.75 + 0.25 * Math.exp(-t * 7)), { gain: g }); },
  sub(t0, f = 52, g = 0.35, d = 0.22) { voice(t0, d * 3, (t) => Math.sin(TAU * f * t) * env(t, 0.008, d), { gain: g }); },
  kick(t0, g = 0.45) { voice(t0, 0.4, (t) => Math.sin(TAU * (48 * t + (100 * (1 - Math.exp(-t * 30))) / 30)) * Math.exp(-t * 8), { gain: g }); },
  clap(t0, g = 0.16) { voice(t0, 0.25, (t) => noise() * (t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.4 : 1) : Math.exp(-(t - 0.03) * 24)), { gain: g, pan: 0.1, send: 0.25 }); },
  hat(t0, g = 0.045, pan = 0.3) { let lp = 0; voice(t0, 0.06, (t) => { const n = noise(); lp += 0.6 * (n - lp); return (n - lp) * Math.exp(-t * 70); }, { gain: g, pan }); },
  shaker(t0, g = 0.035) { let lp = 0; voice(t0, 0.09, (t) => { const n = noise(); lp += 0.5 * (n - lp); return (n - lp) * env(t, 0.02, 0.03); }, { gain: g, pan: -0.3 }); },
  rim(t0, g = 0.08) { voice(t0, 0.05, (t) => (Math.sin(TAU * 1700 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 90), { gain: g, pan: 0.15 }); },
  bell(t0, m, g = 0.06, pan = 0) { const f = mtof(m); voice(t0, 1.6, (t) => (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 5)) * env(t, 0.002, 0.45), { gain: g, pan, send: 0.4 }); },
  blip(t0, m, g = 0.08, pan = 0) { const f = mtof(m); voice(t0, 0.3, (t) => Math.sin(TAU * f * t) * env(t, 0.004, 0.07), { gain: g, pan, send: 0.3 }); },
};
const fx = {
  knock(t0, g = 0.22) { voice(t0, 0.12, (t) => (Math.sin(TAU * 190 * t) * 0.8 + noise() * 0.25 * Math.exp(-t * 80)) * Math.exp(-t * 38), { gain: g }); },
  whoosh(t0, dur = 1, g = 0.12, up = true) { let lp = 0; voice(t0, dur, (t) => { const p = t / dur, c = up ? 0.01 + 0.45 * p : 0.46 - 0.45 * p; lp += c * (noise() - lp); return lp * Math.sin(Math.PI * p) ** 2; }, { gain: g * 2.4, send: 0.2 }); },
  riser(t0, dur, g = 0.07) { voice(t0, dur, (t) => { const p = t / dur; return (Math.sin(TAU * (220 * t + 440 * p * t)) * 0.3 + noise() * 0.2 * p) * p * p; }, { gain: g, send: 0.3 }); },
  click(t0, g = 0.12) { voice(t0, 0.03, (t) => noise() * Math.exp(-t * 300), { gain: g }); },
  haptic(t0, g = 0.35) { voice(t0, 0.35, (t) => Math.sin(TAU * 42 * t) * Math.sin(Math.PI * Math.min(1, t / 0.35)), { gain: g }); },
  snap(t0) { voice(t0, 0.25, (t) => (Math.sin(TAU * (90 * t + 120 * (1 - Math.exp(-t * 40)) / 40)) * 0.8 + noise() * 0.4 * Math.exp(-t * 60)) * Math.exp(-t * 14), { gain: 0.35 }); },
  rain(t0, dur) { let lp = 0; voice(t0, dur, (t) => { lp += 0.3 * (noise() - lp); return (noise() - lp) * 0.6 * Math.sin(Math.PI * t / dur); }, { gain: 0.12, pan: -0.1 }); },
  bubbles(t0, dur) { for (let k = 0; k < dur * 14; k++) { const s = t0 + rnd() * dur, f0 = 400 + rnd() * 900; voice(s, 0.09, (t) => Math.sin(TAU * f0 * t * (1 + t * 9)) * Math.exp(-t * 45), { gain: 0.05, pan: rnd() - 0.5 }); } },
  type(t0, n, dt = 0.05) { for (let k = 0; k < n; k++) voice(t0 + k * dt + rnd() * 0.01, 0.02, (t) => noise() * Math.exp(-t * 400), { gain: 0.04, pan: 0.2 }); },
  revCymbal(tEnd, dur = 1.5) { let lp = 0; voice(tEnd - dur, dur, (t) => { lp += 0.5 * (noise() - lp); return (noise() - lp) * Math.pow(t / dur, 3); }, { gain: 0.12, send: 0.2 }); },
};

// ---------- harmony: Dm  Bb  F  C, one chord per bar ----------
const CH = [[62, 65, 69], [58, 62, 65], [57, 60, 65], [55, 60, 64]];
const ROOT = [50, 46, 41, 48];
const chordAt = (t) => Math.floor(t / BAR) % 4;
const bars = (a, b, fn) => { for (let t = a; t < b - 1e-6; t += BAR) fn(t, chordAt(t)); };
const MOTIF = [[69, 74, 77, 76], [70, 74, 77, 74], [69, 72, 77, 79], [67, 72, 76, 74]];

// 0-8: intro. air pad, sparse felt piano, the double-tap and the LED
inst.pad(0, [50, 57, 62], 8, 0.025, 3);
[0, 2, 4, 6].forEach((t, i) => inst.piano(t, [74, 77, 74, 81][i], 0.11, 0.2));
fx.knock(1.5); fx.knock(2.0); inst.bell(2.5, 93, 0.06);
fx.whoosh(4.0, 2.2, 0.06);
inst.piano(4.0, 62, 0.08); inst.piano(4.0, 69, 0.08); inst.piano(4.0, 74, 0.08);
// 8-16: white stage. kick on 1 and 3, ticks for dimensions, clicks for the exploded view
bars(8, 16, (t, c) => { inst.kick(t, 0.38); inst.kick(t + 2 * BEAT, 0.3); for (let k = 0; k < 8; k++) inst.hat(t + k * E8, 0.03); inst.bass(t, ROOT[c], BAR * 0.9, 0.15); inst.piano(t, MOTIF[c][0], 0.08, -0.2); inst.piano(t + 1, MOTIF[c][2], 0.07, 0.2); });
[8.5, 9.0, 10.5].forEach((t) => fx.click(t, 0.18));
[12.05, 12.27, 12.49, 12.71, 12.93, 13.15].forEach((t, i) => { fx.click(t, 0.14); inst.blip(t, 74 + i * 2, 0.04); });
fx.snap(15.5);
// 16-20: emitters light, then the dive
[16.6, 17.1, 17.6].forEach((t, i) => inst.blip(t, [81, 84, 88][i], 0.1));
inst.pad(16, CH[0].map((m) => m - 12), 3.6, 0.03);
fx.riser(17.6, 2.15, 0.08); fx.whoosh(18.6, 1.4, 0.12);
// 20-26: DROP into the pulse ocean. four-on-the-floor, heartbeat sub, plucked arp
bars(20, 26, (t, c) => {
  for (let b = 0; b < 4; b++) inst.kick(t + b * BEAT, 0.4);
  inst.sub(t, 55, 0.28); inst.sub(t + 0.28, 55, 0.18); inst.sub(t + BAR / 2, 55, 0.28); inst.sub(t + BAR / 2 + 0.28, 55, 0.18);
  for (let k = 0; k < 16; k++) inst.pluck(t + k * S16, CH[c][k % 3] + (k % 4 === 3 ? 12 : 0), 0.05, (k % 2) - 0.5);
  for (let k = 0; k < 8; k++) inst.shaker(t + k * E8 + E8 / 2);
  inst.bass(t, ROOT[c], BEAT * 1.6, 0.18); inst.bass(t + BEAT * 2, ROOT[c], BEAT * 1.6, 0.16);
  inst.pad(t, CH[c], BAR, 0.022);
});
// rhythm scan (20-22): a soft ping each time the scan line measures a beat-to-beat interval
[20.39, 20.6, 20.8, 21.0, 21.21, 21.42, 21.63].forEach((t) => inst.bell(t, 88, 0.045));
// 26-34: night. drums out, pads, shimmer, breathing swells
bars(26, 34, (t, c) => { inst.pad(t, CH[c].map((m) => m - 12), BAR, 0.035, 3); inst.bass(t, ROOT[c] - 12, BAR * 0.95, 0.1); });
[26.5, 27.5, 28.5, 29.5].forEach((t, i) => inst.bell(t, [86, 89, 93, 91][i], 0.035, (i % 2) - 0.5));
[30, 32].forEach((t) => fx.whoosh(t, 2, 0.05));
[31.0, 32.0, 33.0].forEach((t, i) => inst.piano(t, [77, 74, 72][i], 0.07));
// 34-38: dawn. silent haptic pulses (felt, not heard), double-tap, build
inst.pad(34, [57, 60, 65], 4, 0.03); inst.pad(36, [55, 60, 64], 2, 0.03);
[35.0, 35.5, 36.0].forEach((t) => fx.haptic(t));
fx.knock(36.75); fx.knock(37.0); fx.riser(36.2, 1.55, 0.06);
// 38-42: readiness count and the coach conversation. thinner groove, keystrokes
bars(38, 42, (t, c) => { inst.kick(t, 0.3); inst.kick(t + 2 * BEAT, 0.25); inst.pad(t, CH[c], BAR, 0.03); inst.bass(t, ROOT[c], BAR * 0.9, 0.13); for (let k = 0; k < 4; k++) inst.piano(t + k * BEAT, MOTIF[c][k], 0.06, (k % 2) - 0.5, 0.6); });
for (let k = 0; k < 12; k++) inst.blip(38.1 + k * 0.09, 64 + k, 0.025);
inst.blip(39.75, 79, 0.06); fx.type(39.9, 8, 0.04); inst.blip(40.2, 84, 0.05); fx.type(40.2, 14, 0.043);
// 42-46: second DROP on the cut to motion. full groove with claps, a pluck per activity glyph, chime when the ring closes
bars(42, 46, (t, c) => {
  for (let b = 0; b < 4; b++) inst.kick(t + b * BEAT, 0.42);
  inst.clap(t + BEAT); inst.clap(t + 3 * BEAT);
  for (let k = 0; k < 8; k++) inst.hat(t + k * E8 + E8 / 2, 0.04);
  for (let k = 0; k < 8; k++) inst.bass(t + k * E8, ROOT[c] + (k % 2 ? 12 : 0), E8 * 0.7, 0.15);
  inst.pad(t, CH[c], BAR, 0.024);
});
fx.whoosh(41.6, 0.5, 0.08);
[42.35, 42.75, 43.15, 43.55, 43.95].forEach((t, i) => inst.pluck(t, [74, 77, 81, 84, 86][i], 0.09));
[84, 88, 91, 96].forEach((m, k) => inst.bell(45.45 + k * 0.06, m, 0.05, (k - 1.5) * 0.3));
// 46-50: seven days. driving eighths, a tick per day, rain, underwater
bars(46, 50, (t, c) => { for (let b = 0; b < 4; b++) inst.kick(t + b * BEAT, 0.38); inst.clap(t + BEAT, 0.12); inst.clap(t + 3 * BEAT, 0.12); for (let k = 0; k < 8; k++) inst.bass(t + k * E8, ROOT[c] + (k % 2 ? 12 : 0), E8 * 0.7, 0.15); inst.pad(t, CH[c], BAR, 0.024); });
for (let d = 0; d < 7; d++) inst.rim(46 + d * BEAT, 0.07);
fx.rain(47.0, 0.55); fx.bubbles(47.9, 0.85); fx.whoosh(47.85, 0.5, 0.08, false);
[49.55, 49.75, 49.95].forEach((t) => inst.blip(t, 64, 0.05));
// 50-52: magnetic snap, swell
fx.whoosh(49.9, 0.8, 0.08); fx.snap(50.6); inst.pad(50.6, [57, 60, 65], 1.3, 0.035);
for (let k = 0; k < 6; k++) inst.blip(50.8 + k * 0.18, 69 + k * 2, 0.035);
// 52-56: band swap. a pluck per colour, then the full chord and a reverse cymbal into the end card
[52.0, 52.5, 53.0, 53.5].forEach((t, i) => { inst.pluck(t, [74, 77, 81, 86][i], 0.11); fx.click(t + 0.2, 0.1); });
bars(52, 56, (t, c) => { for (let b = 0; b < 4; b++) inst.kick(t + b * BEAT, 0.36); for (let k = 0; k < 8; k++) inst.hat(t + k * E8 + E8 / 2, 0.035); inst.bass(t, ROOT[c], BAR * 0.9, 0.15); });
inst.pad(54, [57, 60, 65, 69], 2, 0.035); fx.revCymbal(56, 1.4);
// 56-60: final hit, piano chord, LED tink, silence
inst.kick(56, 0.45); inst.sub(56, 44, 0.4, 0.8);
[50, 57, 62, 65, 69, 74].forEach((m, k) => inst.piano(56 + k * 0.02, m, 0.08, (k - 2.5) * 0.25, 2.2));
inst.pad(56, [50, 57, 62, 65], 3, 0.03);
inst.bell(59.0, 93, 0.05);

// ---------- mix: night low-pass (26-34) and underwater (47.9-48.75), echo bus, soft clip, fades ----------
const lp = (t) => { if (t > 26 && t < 34) return 0.08 + 0.92 * Math.max(0, 1 - Math.min(t - 26, 34 - t) / 1.5) ** 2; if (t > 47.9 && t < 48.75) return 0.05; return 1; };
let fl = 0, fr = 0;
for (let i = 0; i < N; i++) { const a = Math.min(1, lp(i / SR) * 1.0 + 0.0); fl += a * (L[i] - fl); fr += a * (R[i] - fr); L[i] = fl; R[i] = fr; }
const D = Math.round(BEAT * 0.75 * SR);
for (let i = D; i < N; i++) { sendL[i] += sendR[i - D] * 0.36; sendR[i] += sendL[i - D] * 0.36; }
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, t / 0.05, (LEN - t) / 0.6);
  L[i] = Math.tanh((L[i] + sendL[i] * 0.45) * 1.15) * fade;
  R[i] = Math.tanh((R[i] + sendR[i] * 0.45) * 1.15) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak, out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { out.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4); out.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4); }
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'soundtrack.wav'), out);
console.log(`wrote soundtrack.wav (peak before normalise ${peak.toFixed(2)})`);
