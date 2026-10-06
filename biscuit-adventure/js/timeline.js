'use strict';
// ---------- the film's timeline: 8 scenes x 7.5 s = 60 s ----------
const SCENE_LEN = 7.5, DURATION = 60, GROUND = 862, BISCUIT_X = 820, SPEED = 250, STRIDE = 150;
const SCENES = [
  { id: 'sketch', style: 'sketch', label: 'Pencil Sketch', place: 'The Sketchbook' },
  { id: 'flat', style: 'flat', friend: 'pepper', label: 'Flat Vector', place: 'Sunny Park' },
  { id: 'pixel', style: 'flat', friend: 'mochi', label: 'Pixel Art', place: '8-Bit City' },
  { id: 'neon', style: 'neon', friend: 'disco', label: 'Neon Synthwave', place: 'Night Drive' },
  { id: 'paper', style: 'paper', friend: 'juniper', label: 'Paper Cut', place: 'Mountain Sunset' },
  { id: 'water', style: 'water', friend: 'noodle', label: 'Watercolor', place: 'The Seaside' },
  { id: 'pop', style: 'pop', friend: 'waffles', label: 'Pop Art', place: 'Comic City' },
  { id: 'finale', style: 'gloss', label: 'Soft 3D', place: 'The Group Photo' },
];
SCENES.forEach((s, i) => { s.index = i; s.start = i * SCENE_LEN; });
const TRANSITIONS = ['iris', 'pixelate', 'glitch', 'tear', 'bleed', 'halftone', 'clock'];
const TRANS_HALF = 0.5;

const sceneIndexAt = (t) => clamp(Math.floor(t / SCENE_LEN), 0, SCENES.length - 1);

// How much Biscuit is walking (0 = standing) at global time t.
function walkAt(t) {
  const i = sceneIndexAt(t), τ = t - SCENES[i].start, id = SCENES[i].id;
  if (id === 'sketch') return ease.smooth(seg(τ, 3.9, 4.5));
  if (id === 'finale') return 1 - ease.smooth(seg(τ, 1.1, 1.6));
  return 1 - ease.smooth(seg(τ, 1.6, 2.2)) + ease.smooth(seg(τ, 5.4, 6.0));
}
// Distance walked, integrated once so feet never slide against the scrolling ground.
const DIST_STEP = 1 / 600;
const DIST = (() => {
  const n = Math.ceil(DURATION / DIST_STEP) + 2, d = new Float64Array(n);
  for (let i = 1; i < n; i++) d[i] = d[i - 1] + walkAt((i - 0.5) * DIST_STEP) * SPEED * DIST_STEP;
  return d;
})();
function distAt(t) { const f = clamp(t, 0, DURATION) / DIST_STEP, i = Math.floor(f); return lerp(DIST[i], DIST[Math.min(i + 1, DIST.length - 1)], f - i); }
const scrollOf = (i, t) => distAt(t) - distAt(Math.max(0, SCENES[i].start - TRANS_HALF));

function biscuitPose(t) {
  const i = sceneIndexAt(t), sc = SCENES[i], τ = t - sc.start, wk = walkAt(t);
  const P = { x: BISCUIT_X, y: GROUND, s: 1, facing: 1, phase: (distAt(t) / STRIDE) * TAU, walk: wk };
  P.breath = Math.sin(t * 3.2) * 1.5 * (1 - wk);
  const bt = (t + 0.7) % 3.3;
  P.blink = bt < 0.16 ? Math.abs(Math.cos((Math.PI * bt) / 0.16)) : 1;
  let happy = 0;
  if (sc.friend) happy = seg(τ, 3.3, 3.4) * (1 - seg(τ, 5.0, 5.1));
  if (sc.id === 'sketch') happy = seg(τ, 3.2, 3.3) * (1 - seg(τ, 3.9, 4.0));
  if (sc.id === 'finale') happy = seg(τ, 2.3, 2.4);
  P.happy = happy > 0.5;
  P.tongue = Math.max(wk * 0.8, happy);
  P.wag = Math.sin(t * (P.happy ? 24 : 9)) * (P.happy ? 0.42 : 0.22);
  if (sc.friend) {
    const hp = pulse(τ, 3.45, 3.8);
    P.hop = 46 * hp; P.tuck = hp;
    P.squash = 0.07 * pulse(τ, 3.3, 3.45) - 0.05 * hp + 0.08 * pulse(τ, 3.8, 3.97);
    P.headTilt = -0.13 * seg(τ, 3.9, 4.2) * (1 - seg(τ, 4.8, 5.1));
  }
  if (sc.id === 'sketch' && τ < 2.3) { P.wag = 0; P.tongue = 0; P.blink = 1; }
  if (sc.id === 'finale') {
    P.x = lerp(BISCUIT_X, 960, ease.inOut(seg(τ, 0.2, 1.6)));
    const hp = pulse(τ, 2.45, 2.8);
    P.hop = 50 * hp; P.tuck = hp; P.squash = 0.07 * pulse(τ, 2.32, 2.45) + 0.08 * pulse(τ, 2.8, 2.95);
  }
  return P;
}

// The friend Biscuit meets in scene i (local time τ): walks in, says hi, runs off.
function friendPose(τ, t) {
  if (τ < 1.7 || τ > 6.7) return null;
  const P = { x: 0, y: GROUND, s: 1, facing: -1, walk: 0, phase: 0 };
  P.blink = ((t + 1.9) % 2.9) < 0.15 ? 0.15 : 1;
  if (τ < 3.3) {
    const p = seg(τ, 1.7, 3.3);
    P.x = lerp(2200, 1250, ease.out(p));
    P.walk = 1 - seg(τ, 2.9, 3.3);
    P.phase = ((2200 - P.x) / STRIDE) * TAU * 0.8;
  } else if (τ < 5.25) {
    P.x = 1250;
    P.phase = ((2200 - 1250) / STRIDE) * TAU * 0.8;
    P.happy = τ > 3.35 && τ < 5.05;
    const hp = pulse(τ, 3.5, 3.86);
    P.hop = 52 * hp; P.tuck = hp;
    P.squash = 0.07 * pulse(τ, 3.36, 3.5) + 0.08 * pulse(τ, 3.86, 4.0) + 0.1 * pulse(τ, 5.05, 5.25);
    P.headTilt = 0.12 * seg(τ, 4.0, 4.3) * (1 - seg(τ, 4.8, 5.0));
  } else {
    const p = seg(τ, 5.25, 6.7);
    P.facing = 1;
    P.x = lerp(1250, 2350, ease.in(p));
    P.walk = Math.min(1, p * 4);
    P.phase = ((P.x - 1250) / STRIDE) * TAU * 0.7;
    P.squash = 0.1 * pulse(τ, 5.25, 5.4);
  }
  P.tongue = P.happy ? 1 : P.walk * 0.6;
  P.wag = Math.sin(t * (P.happy ? 26 : 10) + 1) * (P.happy ? 0.45 : 0.25);
  return P;
}
