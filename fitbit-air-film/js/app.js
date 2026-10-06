// Boots the renderer, builds every shot and exposes renderAt(t) for live playback and frame capture.
import { makeRenderer, studioEnvironment, roomEnvironment, UI } from './stage.js';
import { SHOT_FACTORIES } from './shots.js';
import { DURATION, clamp } from './util.js';

const renderer = makeRenderer(document.getElementById('gl'));
const ui = new UI(document.getElementById('ui'));
const ctx = { renderer, studio: studioEnvironment(renderer), room: roomEnvironment(renderer) };
const shots = SHOT_FACTORIES.map((f) => f(ctx));

function shotAt(t) {
  for (const s of shots) if (t >= s.start && t < s.end) return s;
  return shots[shots.length - 1];
}
function renderAt(t) {
  t = clamp(t, 0, DURATION - 1e-4);
  const s = shotAt(t), τ = t - s.start;
  s.update(τ, t);
  renderer.render(s.scene, s.camera);
  ui.clear();
  s.ui(ui, τ, t);
}

async function boot() {
  await Promise.all(['600 100px "Inter Tight"', '400 30px Inter', '500 30px Inter', '600 30px Inter'].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  // compile every scene's shaders up front so the first frame of each shot isn't slow
  shots.forEach((s) => { s.update(0.01, s.start + 0.01); renderer.compile(s.scene, s.camera); });
  window.renderAt = renderAt;
  window.DURATION = DURATION;
  const q = new URLSearchParams(location.search);
  if (q.has('capture')) { renderAt(+(q.get('t') || 0)); window.__ready = true; return; }
  const t0 = performance.now() - (+(q.get('t') || 0)) * 1000;
  const loop = (now) => { renderAt(((now - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__ready = true;
}
boot();
