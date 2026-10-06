'use strict';
// ---------- style renderers: the same dog parts drawn eight different ways ----------
const PAPER = '#FBF8F1', GRAPHITE = '#34343B', INK = '#4A3B36';
let TEX = null; // shared textures, created on boot
function initTextures() {
  TEX = {
    grain: noiseTexture(256, 3, 0, 1.4),
    paper: noiseTexture(256, 11, 32, 1.1),
  };
}
function withClip(ctx, clip, fn) {
  if (!clip) return fn();
  ctx.save();
  polyPath(ctx, clip);
  ctx.clip();
  fn();
  ctx.restore();
}
function textureFill(ctx, pts, tex, alpha, op = 'multiply') {
  ctx.save();
  polyPath(ctx, pts);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = ctx.createPattern(tex, 'repeat');
  const b = bbox(pts);
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.restore();
}
function neonColor(c) {
  const l = luminance(c), [h, s] = toHsl(c);
  if (s < 0.2) return l > 0.6 ? '#B8F7FF' : '#FF5EDB';
  return fromHsl(h, 1, 0.64);
}
function popColor(c) {
  const [h, s, l] = toHsl(c);
  if (s < 0.15) return l > 0.6 ? '#FFFFFF' : '#111111';
  return fromHsl(h, Math.min(0.95, s * 1.15 + 0.08), clamp(l, 0.45, 0.72));
}

const STYLES = {
  flat(ctx, p) {
    if (p.kind === 'shadow') { ctx.fillStyle = 'rgba(30,40,60,0.16)'; polyPath(ctx, p.pts); ctx.fill(); return; }
    withClip(ctx, p.clip, () => {
      ctx.globalAlpha = p.alpha;
      if (p.kind === 'fill') { ctx.fillStyle = p.color; polyPath(ctx, p.pts); ctx.fill(); }
      else { ctx.strokeStyle = p.color; ctx.lineWidth = p.lw; ctx.lineCap = ctx.lineJoin = 'round'; polyPath(ctx, p.pts, false); ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
  },

  sketch(ctx, p, env) {
    const seed = hashStr(p.uid) + (env.boil || 0) * 7;
    const prog = p.progress == null ? 1 : p.progress;
    if (prog <= 0) return;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.kind === 'shadow') {
      if (prog < 1) return;
      const b = bbox(p.pts);
      ctx.strokeStyle = rgba(GRAPHITE, 0.35); ctx.lineWidth = 1.6;
      for (let i = 0; i < 14; i++) {
        const x = b.x + b.w * (0.08 + 0.84 * i / 13), y = b.cy + noise1(i, seed) * 3;
        ctx.beginPath(); ctx.moveTo(x - 9, y + 5); ctx.lineTo(x + 9, y - 5); ctx.stroke();
      }
      return;
    }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') {
        const [pts] = partialLine(p.pts, prog, false);
        ctx.strokeStyle = rgba(GRAPHITE, 0.9); ctx.lineWidth = Math.max(2, p.lw * 0.7);
        polyPath(ctx, jitter(pts, 0.8, seed), false); ctx.stroke();
        return;
      }
      if (prog >= 1) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.dark ? rgba(GRAPHITE, 0.82) : (p.color === '#FFFFFF' ? '#FFFFFF' : PAPER);
        polyPath(ctx, p.pts); ctx.fill();
        if (p.big) { // hatching on the shadow side
          const b = bbox(p.pts);
          ctx.save(); polyPath(ctx, p.pts); ctx.clip();
          ctx.strokeStyle = rgba(GRAPHITE, 0.22); ctx.lineWidth = 1.3;
          for (let x = b.x - b.h; x < b.x + b.w; x += 9) {
            ctx.beginPath(); ctx.moveTo(x, b.y + b.h); ctx.lineTo(x + b.h * 0.5, b.y + b.h * 0.5); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      const [pts] = partialLine(p.pts, prog, true);
      ctx.strokeStyle = rgba(GRAPHITE, 0.85); ctx.lineWidth = 2.3;
      polyPath(ctx, jitter(pts, 1.3, seed), false); ctx.stroke();
      ctx.strokeStyle = rgba(GRAPHITE, 0.35); ctx.lineWidth = 1.3;
      polyPath(ctx, jitter(pts, 2.2, seed + 31).map(([x, y]) => [x + 1.2, y - 0.8]), false); ctx.stroke();
    });
  },

  neon(ctx, p) {
    const c = neonColor(p.color);
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.kind === 'shadow') { ctx.strokeStyle = rgba('#FF4FD8', 0.5); ctx.lineWidth = 2 * p.scale; polyPath(ctx, p.pts); ctx.stroke(); return; }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') { ctx.strokeStyle = c; ctx.lineWidth = Math.max(2.5, p.lw * 0.6); polyPath(ctx, p.pts, false); ctx.stroke(); return; }
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = rgba(c, p.dark || p.name.startsWith('glint') || p.name.startsWith('eye') ? 0.85 : 0.13);
      polyPath(ctx, p.pts); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 3.4 * p.scale;
      polyPath(ctx, p.pts); ctx.stroke();
      ctx.strokeStyle = mix(c, '#ffffff', 0.65); ctx.lineWidth = 1.2 * p.scale;
      polyPath(ctx, p.pts); ctx.stroke();
      ctx.globalAlpha = 1;
    });
  },

  paper(ctx, p) {
    if (p.kind === 'shadow') { ctx.fillStyle = 'rgba(60,30,30,0.22)'; polyPath(ctx, p.pts); ctx.fill(); return; }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') { ctx.strokeStyle = p.color; ctx.lineWidth = p.lw; ctx.lineCap = 'round'; polyPath(ctx, p.pts, false); ctx.stroke(); return; }
      const s = p.scale;
      ctx.globalAlpha = p.alpha;
      // cut-paper drop shadows (two hard offsets read as depth, cheaper than blur)
      ctx.fillStyle = 'rgba(70,35,30,0.13)'; polyPath(ctx, p.pts.map(([x, y]) => [x + 3 * s, y + 7 * s])); ctx.fill();
      ctx.fillStyle = 'rgba(70,35,30,0.16)'; polyPath(ctx, p.pts.map(([x, y]) => [x + 1.5 * s, y + 3.5 * s])); ctx.fill();
      const c = mix(p.color, '#F6E6D2', 0.12);
      ctx.fillStyle = c; polyPath(ctx, p.pts); ctx.fill();
      if (p.big) textureFill(ctx, p.pts, TEX.paper, 0.12);
      ctx.globalAlpha = 1;
    });
  },

  water(ctx, p) {
    const seed = hashStr(p.uid), s = p.scale;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.kind === 'shadow') { ctx.fillStyle = 'rgba(90,110,140,0.18)'; polyPath(ctx, wobble(p.pts, 4, 0.05, seed)); ctx.fill(); return; }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') { ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = Math.max(1.6, p.lw * 0.6); polyPath(ctx, jitter(p.pts, 0.8, seed), false); ctx.stroke(); return; }
      const c = p.dark ? p.color : mix(p.color, '#ffffff', 0.08);
      const small = bbox(p.pts).w < 40 * s;
      const layers = small ? 2 : 3;
      for (let k = 0; k < layers; k++) {
        const q = wobble(p.pts, (small ? 1.2 : 3.2) * s * (1 + k * 0.6), 0.028 / s, seed + k * 13);
        ctx.globalAlpha = p.alpha * (small ? 0.7 : 0.42);
        ctx.fillStyle = c; polyPath(ctx, q); ctx.fill();
        if (k === 0) { ctx.globalAlpha = p.alpha * 0.45; ctx.strokeStyle = shade(c, -0.25); ctx.lineWidth = 1.6 * s; polyPath(ctx, q); ctx.stroke(); }
      }
      ctx.globalAlpha = p.alpha * 0.7;
      if (!small || p.dark) { ctx.strokeStyle = INK; ctx.lineWidth = 1.4 * s; polyPath(ctx, jitter(p.pts, 1.1 * s, seed + 99).map(([x, y]) => [x + 1.5 * s, y - 1 * s])); ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
  },

  pop(ctx, p) {
    const s = p.scale;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.kind === 'shadow') { ctx.fillStyle = '#111'; polyPath(ctx, p.pts); ctx.fill(); return; }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') { ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(4, p.lw * 1.2); polyPath(ctx, p.pts, false); ctx.stroke(); return; }
      const c = p.name.startsWith('glint') || p.name === 'noseGlint' ? '#FFFFFF' : popColor(p.color);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = c; polyPath(ctx, p.pts); ctx.fill();
      if (p.big) { // Ben-Day halftone shading toward the lower right
        const b = bbox(p.pts);
        ctx.save(); polyPath(ctx, p.pts); ctx.clip();
        ctx.fillStyle = shade(c, -0.28);
        const step = 11 * s;
        for (let y = b.y; y < b.y + b.h + step; y += step) for (let x = b.x + ((y / step) % 2) * step / 2; x < b.x + b.w + step; x += step) {
          const k = clamp(((x - b.x) / b.w) * 0.55 + ((y - b.y) / b.h) * 0.9 - 0.62, 0, 1);
          if (k > 0.02) { ctx.beginPath(); ctx.arc(x, y, step * 0.48 * k, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
      }
      if (!p.name.startsWith('glint') && p.name !== 'noseGlint') { ctx.strokeStyle = '#111'; ctx.lineWidth = (p.clip ? 3 : 6) * s; polyPath(ctx, p.pts); ctx.stroke(); }
      ctx.globalAlpha = 1;
    });
  },

  gloss(ctx, p) {
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.kind === 'shadow') {
      const b = bbox(p.pts);
      const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.w / 2);
      g.addColorStop(0, 'rgba(90,50,30,0.32)'); g.addColorStop(1, 'rgba(90,50,30,0)');
      ctx.save(); ctx.translate(b.cx, b.cy); ctx.scale(1, b.h / b.w * 1.4); ctx.translate(-b.cx, -b.cy);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.cx, b.cy, b.w / 2, 0, TAU); ctx.fill(); ctx.restore();
      return;
    }
    withClip(ctx, p.clip, () => {
      if (p.kind === 'line') { ctx.strokeStyle = p.color; ctx.lineWidth = p.lw; polyPath(ctx, p.pts, false); ctx.stroke(); return; }
      const b = bbox(p.pts), c = p.color;
      ctx.globalAlpha = p.alpha;
      if (b.w < 6 || b.h < 6) { ctx.fillStyle = c; polyPath(ctx, p.pts); ctx.fill(); ctx.globalAlpha = 1; return; }
      const g = ctx.createRadialGradient(b.x + b.w * 0.36, b.y + b.h * 0.3, 0, b.x + b.w * 0.45, b.y + b.h * 0.45, Math.max(b.w, b.h) * 0.78);
      g.addColorStop(0, shade(c, 0.32)); g.addColorStop(0.55, c); g.addColorStop(1, shade(c, -0.22));
      ctx.fillStyle = g; polyPath(ctx, p.pts); ctx.fill();
      if (p.big) {
        ctx.save(); polyPath(ctx, p.pts); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.ellipse(b.x + b.w * 0.34, b.y + b.h * 0.22, b.w * 0.2, b.h * 0.1, -0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = rgba(shade(c, -0.45), 0.45); ctx.lineWidth = 1.6 * p.scale; polyPath(ctx, p.pts); ctx.stroke();
      ctx.globalAlpha = 1;
    });
  },
};

function drawParts(ctx, parts, style, env = {}) {
  const fn = STYLES[style];
  ctx.save();
  for (const p of parts) fn(ctx, p, env);
  ctx.restore();
}
function drawDog(ctx, dogId, pose, style, env) {
  const built = buildDog(DOGS[dogId], pose);
  drawParts(ctx, built.parts, style, env);
  return built;
}
// a lone shape (heart, burst...) drawn through a style renderer
function styledShape(ctx, name, pts, color, style, env, scale = 1) {
  drawParts(ctx, [{ uid: 'fx:' + name, name, pts, color, kind: 'fill', alpha: 1, big: false, dark: luminance(color) < 0.22, scale }], style, env);
}

// Hearts that float up between two dogs when they meet.
function drawHearts(ctx, style, τ, x, y, env, colors = ['#FF5A6E', '#FF8FB1', '#FF5A6E']) {
  for (let k = 0; k < 3; k++) {
    const t0 = 3.55 + k * 0.28, p = seg(τ, t0, t0 + 1.35);
    if (p <= 0 || p >= 1) continue;
    const sc = ease.outBack(seg(τ, t0, t0 + 0.3), 2.5) * (1 - seg(p, 0.75, 1));
    const hx = x + (k - 1) * 46 + Math.sin(p * 6 + k) * 10, hy = y - p * 150 - k * 12;
    const size = (k === 1 ? 52 : 38) * sc;
    if (size < 1) continue;
    styledShape(ctx, 'heart' + k, heartPts(hx, hy, size), colors[k % colors.length], style, env, size / 40);
  }
}
