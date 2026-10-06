'use strict';
// ---------- render loop, style-morph transitions and on-screen chips ----------
const canvas = document.getElementById('film');
const ctx = canvas.getContext('2d');
const bufA = makeCanvas(W, H), bufB = makeCanvas(W, H), tmp = makeCanvas(W, H), maskC = makeCanvas(W, H);
const _tmps = {};
function makeTmp(w, h) {
  const k = w + 'x' + h;
  if (!_tmps[k]) { const c = makeCanvas(w, h); _tmps[k] = { c, g: c.getContext('2d') }; }
  return _tmps[k];
}
function resetCtx(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.imageSmoothingEnabled = true; g.shadowColor = 'transparent'; g.shadowBlur = 0;
}
function drawScene(i, g, t, ...args) { resetCtx(g); SCENE_DRAW[SCENES[i].id](g, t, ...args); resetCtx(g); }

// Paint `src` onto ctx only where maskFn draws.
function masked(src, maskFn, softPx = 0) {
  const m = maskC.getContext('2d');
  resetCtx(m); m.clearRect(0, 0, W, H);
  if (softPx) m.filter = `blur(${softPx}px)`;
  m.fillStyle = '#000'; maskFn(m);
  m.filter = 'none';
  const g = tmp.getContext('2d');
  resetCtx(g); g.clearRect(0, 0, W, H);
  g.drawImage(maskC, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.drawImage(src, 0, 0);
  ctx.drawImage(tmp, 0, 0);
}
function pixelateTo(g, src, block) {
  const sw = Math.ceil(W / block), sh = Math.ceil(H / block), s = makeTmp(sw, sh);
  s.g.imageSmoothingEnabled = true; s.g.clearRect(0, 0, sw, sh); s.g.drawImage(src, 0, 0, sw, sh);
  g.imageSmoothingEnabled = false; g.drawImage(s.c, 0, 0, sw * block, sh * block); g.imageSmoothingEnabled = true;
}

const BISCUIT_CENTER = [BISCUIT_X + 40, 700];
const TRANSITION_FX = {
  // pencil → flat: colour floods out of Biscuit like ink
  iris(a, b, t, p) {
    drawScene(a, ctx, t); drawScene(b, bufB.getContext('2d'), t);
    const r = ease.inOut(p) * 2300;
    const rim = [];
    for (let k = 0; k < 160; k++) { const an = (k / 160) * TAU, rr = r * (1 + 0.07 * noise1(an * 4 + t * 3, 2) + 0.03 * noise1(an * 13, 5)); rim.push([BISCUIT_CENTER[0] + Math.cos(an) * rr, BISCUIT_CENTER[1] + Math.sin(an) * rr]); }
    masked(bufB, (m) => { polyPath(m, rim); m.fill(); });
    if (r > 4) { ctx.strokeStyle = 'rgba(52,52,59,0.55)'; ctx.lineWidth = 7; polyPath(ctx, rim); ctx.stroke(); }
  },
  // flat → pixel: the world drops resolution until it becomes 8-bit
  pixelate(a, b, t, p) {
    if (p < 0.5) {
      drawScene(a, bufA.getContext('2d'), t);
      pixelateTo(ctx, bufA, Math.max(1, Math.round(1 + 15 * ease.in(p / 0.5))));
    } else {
      drawScene(b, ctx, t, Math.round(lerp(16, PX, ease.out((p - 0.5) / 0.5))));
    }
  },
  // pixel → neon: a signal glitch
  glitch(a, b, t, p) {
    drawScene(a, bufA.getContext('2d'), t); drawScene(b, bufB.getContext('2d'), t);
    const seed = Math.floor(t * 24), amp = Math.sin(Math.PI * p);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    let y = 0, k = 0;
    while (y < H) {
      const h = 12 + Math.floor(hash(seed * 7.1 + k) * 90);
      const useB = hash(seed * 13.7 + k * 3.3) < p * 1.25 - 0.12;
      const dx = (hash(seed * 3.3 + k * 1.9) - 0.5) * 220 * amp;
      ctx.drawImage(useB ? bufB : bufA, 0, y, W, h, dx, y, W, h);
      if (hash(seed + k * 5.5) < 0.25 * amp) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45;
        ctx.drawImage(useB ? bufA : bufB, 0, y, W, h, -dx * 0.5 + 14, y, W, h);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      y += h; k++;
    }
    for (let s = 0; s < 6; s++) {
      if (hash(seed * 2.1 + s) > amp) continue;
      ctx.fillStyle = s % 2 ? 'rgba(79,227,255,0.55)' : 'rgba(255,79,216,0.55)';
      ctx.fillRect(0, hash(seed + s * 9) * H, W, 2 + hash(s + seed) * 6);
    }
  },
  // neon → paper: a new sheet of paper tears its way up the screen
  tear(a, b, t, p) {
    drawScene(a, ctx, t); drawScene(b, bufB.getContext('2d'), t);
    const base = lerp(H + 90, -120, ease.inOut(p));
    const edge = [];
    for (let x = -20; x <= W + 20; x += 16) edge.push([x, base + Math.sin(x * 0.011) * 40 + noise1(x * 0.06, 3) * 14 + (hash(x) - 0.5) * 9]);
    // shadow cast onto the old world
    ctx.fillStyle = 'rgba(40,20,30,0.28)';
    polyPath(ctx, [[-20, H + 200]].concat(edge.map(([x, y]) => [x, y - 18])).concat([[W + 20, H + 200]])); ctx.fill();
    masked(bufB, (m) => { polyPath(m, [[-20, H + 200]].concat(edge).concat([[W + 20, H + 200]])); m.fill(); });
    ctx.fillStyle = '#FFF8EC';
    polyPath(ctx, edge.map(([x, y]) => [x, y - 3 - hash(x * 3) * 6]).concat(edge.slice().reverse().map(([x, y]) => [x, y + 12]))); ctx.fill();
  },
  // paper → watercolour: paint blooms outward from Biscuit
  bleed(a, b, t, p) {
    drawScene(a, ctx, t); drawScene(b, bufB.getContext('2d'), t);
    const r = ease.inOut(p) * 1500;
    masked(bufB, (m) => {
      [[0, 0, 1], [-260, -120, 0.7], [300, -60, 0.75], [-80, 200, 0.6], [420, 160, 0.55], [-480, 80, 0.5]].forEach(([ox, oy, k], j) => {
        const rr = r * k * (1 + 0.6 * p);
        if (rr < 2) return;
        polyPath(m, wobble(ellipsePts(BISCUIT_CENTER[0] + ox * p, BISCUIT_CENTER[1] + oy * p, rr, rr * 0.9, 90), rr * 0.12, 0.012, j + 3));
        m.fill();
      });
    }, 22);
  },
  // watercolour → pop: Ben-Day dots sweep across
  halftone(a, b, t, p) {
    drawScene(a, ctx, t); drawScene(b, bufB.getContext('2d'), t);
    const sp = 56;
    masked(bufB, (m) => {
      for (let y = 0; y < H + sp; y += sp) for (let x = ((y / sp) % 2) * sp / 2; x < W + sp; x += sp) {
        const d = (x / W) * 0.65 + (y / H) * 0.35;
        const q = clamp((p * 1.75 - d) / 0.75);
        if (q <= 0) continue;
        m.beginPath(); m.arc(x, y, q * sp * 0.78, 0, TAU); m.fill();
      }
    });
  },
  // pop → finale: a clock wipe
  clock(a, b, t, p) {
    drawScene(a, ctx, t); drawScene(b, bufB.getContext('2d'), t);
    const an = ease.inOut(p) * TAU, c = [960, 540];
    const wedge = [c];
    for (let k = 0; k <= 80; k++) { const aa = -Math.PI / 2 + (k / 80) * an; wedge.push([c[0] + Math.cos(aa) * 1400, c[1] + Math.sin(aa) * 1400]); }
    masked(bufB, (m) => { polyPath(m, wedge); m.fill(); });
    const ea = -Math.PI / 2 + an;
    if (p > 0.01 && p < 0.99) {
      ctx.strokeStyle = '#111'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(ea) * 1400, c[1] + Math.sin(ea) * 1400); ctx.stroke();
      ctx.strokeStyle = '#FFE14D'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(ea) * 1400, c[1] + Math.sin(ea) * 1400); ctx.stroke();
    }
  },
};

// Bottom-left chip naming the current style and place.
function drawChip(g, t) {
  const i = sceneIndexAt(t), sc = SCENES[i], τ = t - sc.start;
  const k = i === 7 ? ease.out(seg(τ, 0.55, 0.95)) * (1 - ease.in(seg(τ, 2.6, 2.9))) : ease.out(seg(τ, 0.45, 0.85)) * (1 - ease.in(seg(τ, 6.55, 6.95)));
  if (k <= 0.001) return;
  g.save();
  g.globalAlpha = k;
  g.translate(lerp(-60, 0, k), 0);
  g.font = '700 30px "Space Grotesk"';
  const a = sc.label, b = '  ·  ' + sc.place;
  const wa = g.measureText(a).width; g.font = '500 30px "Space Grotesk"'; const wb = g.measureText(b).width;
  const x = 70, y = 1000, w = 92 + wa + wb + 34;
  g.fillStyle = 'rgba(18,14,12,0.78)'; g.beginPath(); g.roundRect(x, y - 34, w, 68, 34); g.fill();
  g.fillStyle = PALETTE_FLAGS[i % 7] === '#34343B' ? '#F6C445' : PALETTE_FLAGS[i % 7]; if (i === 7) g.fillStyle = '#F6C445';
  g.beginPath(); g.arc(x + 36, y, 24, 0, TAU); g.fill();
  g.fillStyle = '#18120F'; g.font = '700 22px "Space Grotesk"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(i + 1).padStart(2, '0'), x + 36, y + 1);
  g.textAlign = 'left'; g.fillStyle = '#FFFFFF'; g.font = '700 30px "Space Grotesk"'; g.fillText(a, x + 76, y + 1);
  g.fillStyle = 'rgba(255,255,255,0.72)'; g.font = '500 30px "Space Grotesk"'; g.fillText(b, x + 76 + wa, y + 1);
  g.restore();
}

function render(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  resetCtx(ctx);
  const k = Math.round(t / SCENE_LEN), boundary = k * SCENE_LEN;
  if (k >= 1 && k < SCENES.length && Math.abs(t - boundary) < TRANS_HALF) {
    const p = (t - (boundary - TRANS_HALF)) / (2 * TRANS_HALF);
    TRANSITION_FX[TRANSITIONS[k - 1]](k - 1, k, t, p);
  } else {
    drawScene(sceneIndexAt(t), ctx, t);
  }
  resetCtx(ctx);
  drawChip(ctx, t);
}

async function boot() {
  const fonts = ['700 40px Caveat', '600 40px Caveat', '24px "Press Start 2P"', '40px Bangers', '900 40px Fraunces', 'italic 600 40px Fraunces', '700 30px "Space Grotesk"', '500 30px "Space Grotesk"'];
  await Promise.all(fonts.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  initTextures();
  window.renderAt = render;
  window.DURATION = DURATION;
  const params = new URLSearchParams(location.search);
  if (params.has('capture')) {
    document.body.classList.add('capture');
    render(+(params.get('t') || 0));
    window.__ready = true;
    return;
  }
  const start = performance.now() - (+(params.get('t') || 0)) * 1000;
  const loop = (now) => { render(((now - start) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__ready = true;
}
boot();
