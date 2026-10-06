'use strict';
// ---------- the seven worlds + the finale ----------
const wrapX = (x, period) => ((x % period) + period) % period - (period - W) / 2;
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

// Biscuit + the scene's friend, hearts between them. Returns what the scene needs for tags.
function drawMeet(ctx, i, t, style, env, opts = {}) {
  const sc = SCENES[i], τ = t - sc.start;
  const fr = sc.friend ? friendPose(τ, t) : null;
  let frBuilt = null;
  if (fr) frBuilt = drawDog(ctx, sc.friend, fr, style, env);
  const bb = drawDog(ctx, 'biscuit', biscuitPose(t), opts.biscuitStyle || style, env);
  if (fr && τ > 3.4 && τ < 5.5) {
    drawHearts(ctx, opts.heartStyle || style, τ, (bb.headC[0] + frBuilt.headC[0]) / 2, Math.min(bb.headTop[1], frBuilt.headTop[1]) + 10, env, opts.heartColors);
  }
  const tagK = ease.outBack(seg(τ, 3.45, 3.75), 2) * (1 - seg(τ, 5.0, 5.2));
  return { τ, bb, frBuilt, fr, tagK, friend: sc.friend ? DOGS[sc.friend] : null };
}
const tagText = (d) => `${d.name} the ${d.breed}`;

// ============ 1. PENCIL SKETCH ============
function sketchStroke(ctx, pts, seed, closed = false, w = 2.3, a = 0.85) {
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(GRAPHITE, a); ctx.lineWidth = w;
  polyPath(ctx, jitter(pts, 1.2, seed), closed); ctx.stroke();
  ctx.strokeStyle = rgba(GRAPHITE, a * 0.4); ctx.lineWidth = w * 0.55;
  polyPath(ctx, jitter(pts, 2.1, seed + 17).map(([x, y]) => [x + 1.2, y - 1]), closed); ctx.stroke();
}
function drawPencil(ctx, x, y, ang = -0.95) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = 'rgba(40,30,20,0.12)'; ctx.fillRect(30, 10, 160, 22);
  ctx.fillStyle = '#EBC796'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, -12); ctx.lineTo(40, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3A3A40'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, -4); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#F4C542'; ctx.fillRect(40, -12, 112, 24);
  ctx.fillStyle = '#E0A92E'; ctx.fillRect(40, -4, 112, 3); ctx.fillRect(40, 5, 112, 3);
  ctx.fillStyle = '#B9BEC6'; ctx.fillRect(152, -12, 18, 24);
  ctx.fillStyle = '#F29BB0'; ctx.beginPath(); ctx.roundRect(170, -12, 22, 24, [0, 8, 8, 0]); ctx.fill();
  ctx.restore();
}
const SKETCH_THINGS = [
  ['tree', 210, 1.1], ['rock', 560], ['flower', 1160], ['tree', 1580, 0.92], ['flower', 1790], ['rock', 2080], ['tree', 2380, 1.15],
  ['flower', 2640], ['tree', 2950, 0.95], ['flower', 3200], ['rock', 3420], ['tree', 3700, 1.05],
];
function drawSketch(ctx, t) {
  const τ = t, sc = scrollOf(0, t), boil = Math.floor(t * 8), env = { boil };
  ctx.fillStyle = '#F8F5EC'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(140,175,210,0.45)'; ctx.lineWidth = 2;
  for (let y = 132; y < H; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const mx = 190 - sc;
  if (mx > -10) { ctx.strokeStyle = 'rgba(225,140,140,0.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke(); }
  // clouds + sun scribble
  [[270, 440], [1720, 450], [2600, 380], [3300, 460]].forEach(([x, y], k) => {
    const cx = x - sc * 0.6;
    if (cx > -200 && cx < W + 200) sketchStroke(ctx, scallopPts(cx, y, 95, 38, 8, 0.22, 60), 40 + k + boil * 3, true, 2);
  });
  const sx = 1760 - sc * 0.3;
  sketchStroke(ctx, ellipsePts(sx, 175, 48, 48, 40), 77 + boil, true);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; sketchStroke(ctx, [[sx + Math.cos(a) * 64, 175 + Math.sin(a) * 64], [sx + Math.cos(a) * 88, 175 + Math.sin(a) * 88]], 90 + k + boil); }
  // ground line + grass tufts
  const gl = [];
  for (let x = -40; x <= W + 40; x += 30) gl.push([x, GROUND + 6 + noise1((x + sc) * 0.012, 4) * 4]);
  sketchStroke(ctx, gl, 12 + boil, false, 2.6);
  for (let wx = Math.floor(sc / 110) * 110; wx < sc + W + 110; wx += 110) {
    const x = wx - sc + hash(wx) * 40;
    sketchStroke(ctx, [[x - 10, GROUND + 4], [x - 4, GROUND - 14], [x, GROUND + 4], [x + 6, GROUND - 18], [x + 10, GROUND + 4]], wx + boil, false, 1.8, 0.7);
  }
  SKETCH_THINGS.forEach(([type, wx, s = 1], k) => {
    const x = wx - sc, sd = k * 13 + boil * 5;
    if (x < -300 || x > W + 300) return;
    if (type === 'tree') {
      sketchStroke(ctx, [[x - 12 * s, GROUND + 4], [x - 9 * s, GROUND - 150 * s]], sd);
      sketchStroke(ctx, [[x + 12 * s, GROUND + 4], [x + 9 * s, GROUND - 150 * s]], sd + 1);
      const crown = scallopPts(x, GROUND - 230 * s, 92 * s, 80 * s, 9, 0.14, 70);
      ctx.fillStyle = '#F8F5EC'; polyPath(ctx, crown); ctx.fill();
      sketchStroke(ctx, crown, sd + 2, true);
      ctx.save(); polyPath(ctx, crown); ctx.clip();
      ctx.strokeStyle = rgba(GRAPHITE, 0.18); ctx.lineWidth = 1.4;
      for (let hx = x - 120 * s; hx < x + 120 * s; hx += 10) { ctx.beginPath(); ctx.moveTo(hx, GROUND - 160 * s); ctx.lineTo(hx + 40 * s, GROUND - 200 * s); ctx.stroke(); }
      ctx.restore();
    } else if (type === 'rock') {
      sketchStroke(ctx, catmull([[x - 60, GROUND + 5], [x - 40, GROUND - 30], [x + 10, GROUND - 42], [x + 55, GROUND - 18], [x + 64, GROUND + 5]], false, 6), sd);
    } else {
      sketchStroke(ctx, catmull([[x, GROUND + 4], [x + 6, GROUND - 40], [x - 2, GROUND - 80]], false, 6), sd);
      for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; sketchStroke(ctx, ellipsePts(x - 2 + Math.cos(a) * 15, GROUND - 92 + Math.sin(a) * 15, 10, 10, 14), sd + p, true, 1.8); }
      sketchStroke(ctx, ellipsePts(x - 2, GROUND - 92, 7, 7, 12), sd + 9, true, 1.8);
    }
  });

  // title, written in by the pencil
  const titleX = 960 - sc;
  ctx.font = '700 128px Caveat'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText("Biscuit's Big Adventure").width;
  const rev = ease.inOut(seg(τ, 2.1, 3.15));
  const revX = titleX - tw / 2 - 10 + (tw + 20) * rev;
  if (rev > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, revX, 420); ctx.clip();
    ctx.fillStyle = rgba(GRAPHITE, 0.92); ctx.fillText("Biscuit's Big Adventure", titleX, 262);
    ctx.restore();
    const ul = ease.inOut(seg(τ, 3.0, 3.35));
    if (ul > 0) sketchStroke(ctx, partialLine(catmull([[titleX - tw / 2 + 20, 292], [titleX, 300], [titleX + tw / 2 - 10, 284]], false, 10), ul, false)[0], 5 + boil, false, 4);
  }
  const subA = ease.out(seg(τ, 3.1, 3.6));
  if (subA > 0) {
    ctx.globalAlpha = subA; ctx.font = '600 50px Caveat'; ctx.fillStyle = rgba(GRAPHITE, 0.75);
    ctx.fillText('a little film, designed & drawn by Claude', titleX, 352);
    ctx.globalAlpha = 1;
  }
  // margin note pointing at Biscuit
  const noteA = ease.out(seg(τ, 3.25, 3.7));
  if (noteA > 0) {
    const nx = 1090 - sc;
    ctx.globalAlpha = noteA; ctx.textAlign = 'left'; ctx.font = '700 60px Caveat'; ctx.fillStyle = '#2F6FC2';
    ctx.fillText("that's Biscuit!", nx, 560);
    ctx.font = '600 40px Caveat'; ctx.fillText('(very good boy)', nx + 30, 604);
    ctx.globalAlpha = 1;
    const arrow = catmull([[nx - 8, 552], [nx - 50, 560], [nx - 92, 600]], false, 8);
    const [ap, tip] = partialLine(arrow, ease.out(seg(τ, 3.3, 3.75)), false);
    ctx.strokeStyle = '#2F6FC2'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    polyPath(ctx, ap, false); ctx.stroke();
    if (seg(τ, 3.3, 3.75) >= 1) { polyPath(ctx, [[tip[0] + 4, tip[1] - 22], tip, [tip[0] + 24, tip[1] - 4]], false); ctx.stroke(); }
  }

  // Biscuit, drawn line by line
  const bis = buildDog(DOGS.biscuit, biscuitPose(t));
  const order = bis.parts.filter((p) => p.kind !== 'shadow').concat(bis.parts.filter((p) => p.kind === 'shadow'));
  const g = seg(τ, 0.15, 2.05) * order.length;
  order.forEach((p, k) => { p.progress = clamp(g - k); });
  drawParts(ctx, bis.parts, 'sketch', env);
  // the pencil
  let pen = null;
  if (τ < 2.05) {
    const k = Math.min(order.length - 1, Math.floor(g));
    pen = partialLine(order[k].pts, g - k, order[k].kind !== 'line')[1];
  } else if (τ < 3.15) {
    pen = [revX, 250 + Math.sin(τ * 38) * 22];
  } else if (τ < 3.75) {
    const p = seg(τ, 3.15, 3.75);
    pen = [lerp(titleX + tw / 2 + 10, 1500 - sc, ease.inOut(p)), lerp(250, 560, ease.inOut(p))];
  } else {
    const p = ease.in(seg(τ, 3.75, 4.3));
    pen = [1500 - sc + p * 500, 560 - p * 700];
  }
  if (τ > 0.05 && pen && τ < 4.3) drawPencil(ctx, pen[0], pen[1]);
  textureFill(ctx, [[0, 0], [W, 0], [W, H], [0, H]], TEX.grain, 0.05);
}

// ============ 2. FLAT VECTOR — Sunny Park ============
function drawFlat(ctx, t) {
  const i = 1, sc = scrollOf(i, t), env = {};
  ctx.fillStyle = '#A5DDF7'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFF3C4'; circle(ctx, 1580 - sc * 0.03, 220, 132);
  ctx.fillStyle = '#FFE07A'; circle(ctx, 1580 - sc * 0.03, 220, 96);
  ctx.fillStyle = '#FFFFFF';
  [[160, 190, 1], [760, 290, 0.8], [1240, 150, 1.1], [1900, 260, 0.9], [2400, 180, 1]].forEach(([x, y, s]) => {
    const cx = wrapX(x - sc * 0.15, 2700);
    ctx.beginPath(); ctx.roundRect(cx - 110 * s, y - 10 * s, 220 * s, 56 * s, 28 * s); ctx.fill();
    circle(ctx, cx - 30 * s, y, 48 * s); circle(ctx, cx + 38 * s, y + 8 * s, 38 * s);
  });
  const hill = (base, amp, lam, par, col, ph) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) { const wx = x + sc * par; ctx.lineTo(x, base + amp * Math.sin(wx / lam + ph) + amp * 0.5 * Math.sin(wx / (lam * 0.43) + ph * 2)); }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  };
  hill(610, 42, 360, 0.3, '#93D394', 0.5);
  hill(712, 30, 290, 0.55, '#74C47C', 2.1);
  // lollipop trees
  [[120, 1], [700, 0.85], [1230, 1.1], [1820, 0.95], [2300, 1.05]].forEach(([x, s], k) => {
    const cx = wrapX(x - sc * 0.75, 2700), by = 800;
    ctx.fillStyle = '#8C5B3A'; ctx.beginPath(); ctx.roundRect(cx - 11 * s, by - 170 * s, 22 * s, 175 * s, 8); ctx.fill();
    ctx.fillStyle = k % 2 ? '#3FA45B' : '#4DAF62'; circle(ctx, cx, by - 210 * s, 92 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; circle(ctx, cx - 30 * s, by - 245 * s, 42 * s);
  });
  ctx.fillStyle = '#63B86A'; ctx.fillRect(0, 800, W, 50);
  ctx.fillStyle = '#F2DCAA'; ctx.fillRect(0, 838, W, 70);
  ctx.fillStyle = '#E2C58C'; ctx.fillRect(0, 838, W, 6);
  ctx.fillStyle = '#74C468'; ctx.fillRect(0, 908, W, H - 908);
  // lamp + bench props
  [[380, 'lamp'], [1520, 'bench'], [2350, 'lamp']].forEach(([x, type]) => {
    const cx = wrapX(x - sc, 2900);
    if (type === 'lamp') {
      ctx.fillStyle = '#2E3A59'; ctx.fillRect(cx - 7, 560, 14, 290); ctx.fillRect(cx - 22, 840, 44, 12);
      ctx.fillStyle = '#FFE07A'; circle(ctx, cx, 552, 26); ctx.fillStyle = '#2E3A59'; ctx.fillRect(cx - 24, 520, 48, 12);
    } else {
      ctx.fillStyle = '#C9733E'; ctx.fillRect(cx - 120, 760, 240, 18); ctx.fillRect(cx - 120, 790, 240, 18);
      ctx.fillStyle = '#2E3A59'; ctx.fillRect(cx - 100, 760, 12, 92); ctx.fillRect(cx + 88, 760, 12, 92);
    }
  });
  // flowers
  for (let k = 0; k < 40; k++) {
    const x = wrapX(k * 97 + hash(k) * 60 - sc, 3880), y = 935 + hash(k + 50) * 120;
    const c = ['#FF8FB1', '#FFE07A', '#FFFFFF', '#C59BFF'][k % 4];
    ctx.fillStyle = c;
    for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; circle(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7); }
    ctx.fillStyle = '#F5A623'; circle(ctx, x, y, 6);
  }
  const m = drawMeet(ctx, i, t, 'flat', env);
  if (m.fr && m.tagK > 0.01) {
    ctx.save(); ctx.translate(m.fr.x, GROUND + 66); ctx.scale(m.tagK, m.tagK);
    ctx.font = '700 28px "Space Grotesk"'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(tagText(m.friend)).width + 48;
    ctx.fillStyle = 'rgba(30,40,60,0.15)'; ctx.beginPath(); ctx.roundRect(-tw / 2, -22, tw, 52, 26); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect(-tw / 2, -28, tw, 52, 26); ctx.fill();
    ctx.fillStyle = '#2E3A59'; ctx.fillText(tagText(m.friend), 0, 8);
    ctx.restore();
  }
}

// ============ 3. PIXEL ART — 8-Bit City ============
const PX = 8, LW = W / PX, LH = Math.ceil(H / PX);
let pixelCanvas = null, pixelPalette = null;
const _qCache = new Map();
function buildPixelPalette() {
  const cols = ['#5A8CFF', '#6FA3FF', '#86B8FF', '#A4CBFF', '#C3DDFF', '#FFFFFF', '#DCE8FF', '#6F7FD1', '#9FB0F0', '#4B58A6', '#FFE38A', '#2F3A78',
    '#62D162', '#3FA94A', '#C8662E', '#7E3412', '#E58A4E', '#FFD23F', '#D99A1F', '#F5A623', '#8C5A12', '#1E1410', '#FF5A6E', '#FF8FB1', '#5B4A3A', '#9AD8FF'];
  ['biscuit', 'mochi'].forEach((id) => {
    const d = DOGS[id];
    [d.body, d.belly, d.ear, d.nose, d.tongue, d.collar, d.tag, d.paw, shade(d.body, -0.14), shade(d.paw, -0.14), shade(d.body, -0.35)].forEach((c) => cols.push(c));
  });
  return [...new Set(cols)].map(hexRgb);
}
function quantize(g, w, h) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    let c = _qCache.get(key);
    if (!c) {
      let best = 1e9;
      for (const p of pixelPalette) { const e = (p[0] - d[i]) ** 2 * 0.3 + (p[1] - d[i + 1]) ** 2 * 0.59 + (p[2] - d[i + 2]) ** 2 * 0.11; if (e < best) { best = e; c = p; } }
      _qCache.set(key, c);
    }
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function pixelText(ctx, text, x, y, size, color, align = 'left') {
  ctx.font = `${size}px "Press Start 2P"`; ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.fillStyle = '#1E1410'; ctx.fillText(text, x + size / 4, y + size / 4);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function pixelHeart(ctx, x, y, s, col) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  ctx.fillStyle = col;
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(x + i * s, y + j * s, s, s); }));
}
function drawPixel(ctx, t, lowRes = PX) {
  const i = 2, sc = scrollOf(i, t), τ = t - SCENES[i].start;
  if (!pixelCanvas) { pixelCanvas = makeCanvas(LW, LH); pixelPalette = buildPixelPalette(); }
  const g = pixelCanvas.getContext('2d', { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  const s8 = Math.round(sc / PX);
  [['#5A8CFF', 0, 30], ['#6FA3FF', 30, 55], ['#86B8FF', 55, 75], ['#A4CBFF', 75, 92], ['#C3DDFF', 92, 108]].forEach(([c, a, b]) => { g.fillStyle = c; g.fillRect(0, a, LW, b - a); });
  // clouds
  [[20, 14], [110, 26], [190, 10], [270, 22]].forEach(([x, y]) => {
    const cx = (((x - Math.round(s8 * 0.15)) % 300) + 300) % 300 - 30;
    g.fillStyle = '#FFFFFF'; g.fillRect(cx, y + 3, 26, 6); g.fillRect(cx + 4, y, 10, 4); g.fillRect(cx + 13, y - 2, 9, 6);
    g.fillStyle = '#DCE8FF'; g.fillRect(cx + 2, y + 8, 22, 2);
  });
  // skylines
  const sky = (par, col, win, base, seed, lit) => {
    const off = Math.round(s8 * par);
    for (let bx = -40; bx < LW + 40; bx += 1) {
      const wx = bx + off, cell = Math.floor(wx / 18);
      if (((wx % 18) + 18) % 18 !== 0) continue;
      const hgt = 18 + Math.floor(hash(cell * 3.1 + seed) * 34), bw = 14 + Math.floor(hash(cell + seed) * 4);
      const x0 = bx;
      g.fillStyle = col; g.fillRect(x0, base - hgt, bw, hgt);
      for (let wy = base - hgt + 3; wy < base - 3; wy += 4) for (let wxx = x0 + 2; wxx < x0 + bw - 2; wxx += 3) {
        if (hash(wy * 7.3 + wxx * 1.7 + cell) > (lit ? 0.45 : 0.6)) { g.fillStyle = win; g.fillRect(wxx, wy, 1, 2); }
      }
    }
  };
  sky(0.25, '#6F7FD1', '#9FB0F0', 98, 1, false);
  sky(0.5, '#4B58A6', '#FFE38A', 108, 7, true);
  // ground
  g.fillStyle = '#62D162'; g.fillRect(0, 108, LW, 2);
  g.fillStyle = '#3FA94A'; g.fillRect(0, 110, LW, 1);
  g.fillStyle = '#C8662E'; g.fillRect(0, 111, LW, LH - 111);
  g.fillStyle = '#7E3412';
  for (let row = 0; row * 5 + 111 < LH; row++) {
    const y = 111 + row * 5; g.fillRect(0, y + 4, LW, 1);
    for (let bx = -16; bx < LW + 16; bx += 10) { const x = bx - (s8 % 10) + (row % 2) * 5; g.fillRect(x, y, 1, 4); }
  }
  g.fillStyle = '#E58A4E';
  for (let row = 0; row * 5 + 111 < LH; row++) for (let bx = -16; bx < LW + 16; bx += 10) g.fillRect(bx - (s8 % 10) + (row % 2) * 5 + 1, 111 + row * 5, 8, 1);
  // ? blocks and coins
  for (let k = -1; k < 6; k++) {
    const x = Math.round(k * 64 - (s8 % 64) + 40);
    g.fillStyle = '#8C5A12'; g.fillRect(x, 54, 10, 10);
    g.fillStyle = '#F5A623'; g.fillRect(x + 1, 55, 8, 8);
    g.fillStyle = '#FFFFFF'; g.fillRect(x + 3, 56, 4, 1); g.fillRect(x + 6, 57, 1, 2); g.fillRect(x + 4, 59, 2, 1); g.fillRect(x + 4, 61, 2, 1);
    const cw = Math.max(1, Math.round(Math.abs(Math.cos(t * 5 + k)) * 3));
    g.fillStyle = '#D99A1F'; g.fillRect(x + 28 - cw, 70, cw * 2 + 1, 8);
    g.fillStyle = '#FFD23F'; g.fillRect(x + 28 - cw + (cw > 1 ? 1 : 0), 71, Math.max(1, cw * 2 - 1), 6);
  }
  // dogs, drawn as flat vectors at 1/8 resolution, then snapped to the palette
  g.save(); g.scale(1 / PX, 1 / PX);
  const m = drawMeet(g, i, t, 'flat', {});
  g.restore();
  quantize(g, LW, LH);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (lowRes !== PX) { // used by the pixelate transition to start chunkier
    const k = PX / lowRes, tmp = makeTmp(Math.ceil(LW * k), Math.ceil(LH * k));
    tmp.g.imageSmoothingEnabled = false; tmp.g.drawImage(pixelCanvas, 0, 0, tmp.c.width, tmp.c.height);
    ctx.drawImage(tmp.c, 0, 0, tmp.c.width * lowRes, tmp.c.height * lowRes);
  } else ctx.drawImage(pixelCanvas, 0, 0, LW * PX, LH * PX);
  ctx.restore();
  // HUD
  pixelText(ctx, 'BISCUIT', 64, 40, 24, '#FFFFFF');
  for (let k = 0; k < 3; k++) pixelHeart(ctx, 64 + k * 64, 80, 6, '#FF5A6E');
  const coins = 7 + (τ > 3.6 ? 1 : 0) + Math.floor(Math.max(0, sc) / 520);
  pixelText(ctx, `COINS ${String(coins).padStart(2, '0')}`, 760, 40, 24, '#FFD23F');
  pixelText(ctx, 'WORLD 3-1', 1500, 40, 24, '#FFFFFF');
  if (m.fr && τ > 3.5 && τ < 5.2) {
    const p = seg(τ, 3.5, 5.2);
    pixelText(ctx, '1UP!', Math.round((m.bb.headC[0] + m.frBuilt.headC[0]) / 2 / 8) * 8, Math.round((470 - p * 120) / 8) * 8, 32, '#7CFF6B', 'center');
  }
  if (m.fr && m.tagK > 0.01) {
    const txt = tagText(m.friend).toUpperCase(), size = 16;
    ctx.font = `${size}px "Press Start 2P"`;
    const tw = Math.ceil((ctx.measureText(txt).width + 32) / 8) * 8, x = Math.round((m.fr.x - tw / 2) / 8) * 8, y = Math.round((GROUND + 48) / 8) * 8;
    const h = Math.round(48 * Math.min(1, m.tagK) / 8) * 8;
    if (h > 0) {
      ctx.fillStyle = '#1E1410'; ctx.fillRect(x, y, tw, h);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 4, y + 4, tw - 8, 4); ctx.fillRect(x + 4, y + h - 8, tw - 8, 4);
      if (h >= 48) pixelText(ctx, txt, x + tw / 2, y + 16, size, '#FFFFFF', 'center');
    }
  }
}

// ============ 4. NEON SYNTHWAVE — Night Drive ============
let glow = null;
function neonLines(ctx, t, sc, actors) {
  ctx.lineCap = ctx.lineJoin = 'round';
  // skylines' neon edges + windows
  [[0.25, '#FF4FD8', 470, 2], [0.45, '#4FE3FF', 540, 9]].forEach(([par, col, base, seed]) => {
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    const off = sc * par;
    for (let k = Math.floor(off / 150) - 1; k < (off + W) / 150 + 1; k++) {
      const x = k * 150 - off, hgt = 80 + hash(k * 2.3 + seed) * 150, bw = 120 + hash(k + seed) * 20, top = base + 100 - hgt;
      ctx.beginPath(); ctx.moveTo(x, 641); ctx.lineTo(x, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw, 641); ctx.stroke();
      ctx.fillStyle = col;
      for (let wy = top + 16; wy < 620; wy += 26) for (let wx = x + 14; wx < x + bw - 14; wx += 24) if (hash(wx * 0.37 + wy * 1.1 + k) > 0.6) ctx.fillRect(wx, wy, 8, 10);
    }
  });
  // horizon + perspective grid
  ctx.strokeStyle = '#FF4FD8'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 641); ctx.lineTo(W, 641); ctx.stroke();
  ctx.strokeStyle = '#B04BFF'; ctx.lineWidth = 2.5;
  const sp = 170;
  for (let k = -16; k <= 16; k++) {
    const X = k * sp - (((sc % sp) + sp) % sp);
    ctx.beginPath(); ctx.moveTo(960 + X * (0 / 221), 641); ctx.lineTo(960 + X * ((H - 641) / 221), H); ctx.stroke();
  }
  for (let k = 0; k < 9; k++) { const y = 641 + 7 * Math.pow(1.62, k); if (y > H) break; ctx.globalAlpha = 0.5 + k * 0.06; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // the dogs + hearts
  actors(ctx);
}
function drawNeon(ctx, t) {
  const i = 3, sc = scrollOf(i, t), τ = t - SCENES[i].start;
  if (!glow) glow = { a: makeCanvas(W / 2, H / 2), b: makeCanvas(W / 2, H / 2) };
  const sky = ctx.createLinearGradient(0, 0, 0, 641);
  sky.addColorStop(0, '#07021C'); sky.addColorStop(0.6, '#1E0645'); sky.addColorStop(1, '#4A0D62');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 641);
  for (let k = 0; k < 140; k++) {
    const x = wrapX(hash(k) * 2400 - sc * 0.05, 2400), y = hash(k + 7) * 520, tw = 0.5 + 0.5 * Math.sin(t * 3 + k);
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * tw * hash(k + 3)})`; ctx.fillRect(x, y, 2.5, 2.5);
  }
  // striped synthwave sun
  const sunG = ctx.createLinearGradient(0, 380, 0, 641);
  sunG.addColorStop(0, '#FFE66D'); sunG.addColorStop(0.55, '#FF8A5B'); sunG.addColorStop(1, '#FF2F92');
  ctx.save(); ctx.beginPath(); ctx.arc(960, 600, 250, 0, TAU); ctx.clip();
  ctx.fillStyle = sunG;
  for (let y = 350; y < 641; y += 1) {
    const k = (y - 520) / 121;
    const gap = k > 0 ? 3 + k * 14 : 0, period = 34;
    if (gap && ((y - 520 + t * 30) % period) < gap) continue;
    ctx.fillRect(700, y, 520, 1.2);
  }
  ctx.restore();
  const halo = ctx.createRadialGradient(960, 600, 200, 960, 600, 520);
  halo.addColorStop(0, 'rgba(255,79,216,0.28)'); halo.addColorStop(1, 'rgba(255,79,216,0)');
  ctx.fillStyle = halo; ctx.fillRect(300, 120, 1320, 521);
  // skyline silhouettes
  [[0.25, '#170732', 470, 2], [0.45, '#0F0424', 540, 9]].forEach(([par, col, base, seed]) => {
    ctx.fillStyle = col;
    const off = sc * par;
    for (let k = Math.floor(off / 150) - 1; k < (off + W) / 150 + 1; k++) {
      const x = k * 150 - off, hgt = 80 + hash(k * 2.3 + seed) * 150, bw = 120 + hash(k + seed) * 20;
      ctx.fillRect(x, base + 100 - hgt, bw, 641 - (base + 100 - hgt));
    }
  });
  const fl = ctx.createLinearGradient(0, 641, 0, H);
  fl.addColorStop(0, '#2A0848'); fl.addColorStop(1, '#0A0218');
  ctx.fillStyle = fl; ctx.fillRect(0, 641, W, H - 641);

  let meet = null;
  const actors = (c) => { meet = drawMeet(c, i, t, 'neon', {}); };
  // glow pass at half resolution, blurred twice, added on top
  const ga = glow.a.getContext('2d'), gb = glow.b.getContext('2d');
  ga.setTransform(1, 0, 0, 1, 0, 0); ga.clearRect(0, 0, W / 2, H / 2); ga.setTransform(0.5, 0, 0, 0.5, 0, 0);
  neonLines(ga, t, sc, actors);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [[5, 1], [16, 0.9]].forEach(([r, a]) => {
    gb.setTransform(1, 0, 0, 1, 0, 0); gb.clearRect(0, 0, W / 2, H / 2); gb.filter = `blur(${r}px)`; gb.drawImage(glow.a, 0, 0); gb.filter = 'none';
    ctx.globalAlpha = a; ctx.drawImage(glow.b, 0, 0, W, H);
  });
  ctx.restore();
  neonLines(ctx, t, sc, actors);
  if (meet && meet.fr && meet.tagK > 0.01) {
    ctx.save(); ctx.translate(meet.fr.x, GROUND + 70); ctx.scale(meet.tagK, meet.tagK);
    ctx.font = '700 34px "Space Grotesk"'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = '#4FE3FF'; ctx.shadowBlur = 18; ctx.fillStyle = '#C9FBFF';
    ctx.fillText(tagText(meet.friend).toUpperCase(), 0, 10);
    ctx.shadowBlur = 0; ctx.restore();
  }
}

// ============ 5. PAPER CUT — Mountain Sunset ============
function paperLayer(ctx, pts, color, sh = 10, tex = 0.14) {
  ctx.fillStyle = 'rgba(70,30,40,0.12)'; polyPath(ctx, pts.map(([x, y]) => [x, y - sh])); ctx.fill();
  ctx.fillStyle = 'rgba(70,30,40,0.10)'; polyPath(ctx, pts.map(([x, y]) => [x, y - sh * 0.45])); ctx.fill();
  ctx.fillStyle = color; polyPath(ctx, pts); ctx.fill();
  if (tex) textureFill(ctx, pts, TEX.paper, tex);
}
function ridge(base, amp, spacing, par, sc, seed, sharp = 1) {
  const pts = [[-20, H + 20]], off = sc * par;
  for (let k = Math.floor((off - 200) / spacing); k <= (off + W + 200) / spacing; k++) {
    const x = k * spacing - off;
    pts.push([x, base - (0.35 + hash(k * 1.7 + seed) * 0.65) * amp]);
    pts.push([x + spacing / 2, base + (sharp ? 10 : -amp * 0.2) - hash(k * 3.1 + seed) * amp * 0.25]);
  }
  pts.push([W + 20, H + 20]);
  return pts;
}
function drawPaper(ctx, t) {
  const i = 4, sc = scrollOf(i, t);
  ctx.fillStyle = '#FFE7C7'; ctx.fillRect(0, 0, W, H);
  [['#FFD7A8', 210], ['#FFC193', 330], ['#F9A585', 440]].forEach(([c, y], k) => {
    const pts = [[0, H]];
    for (let x = 0; x <= W; x += 40) pts.push([x, y + Math.sin((x + sc * 0.04 * (k + 1)) / 220 + k) * 14]);
    pts.push([W, H]);
    paperLayer(ctx, pts, c, 6, 0.08);
  });
  // sun
  const sx = 1340 - sc * 0.03;
  ctx.fillStyle = 'rgba(70,30,40,0.12)'; circle(ctx, sx + 4, 336, 96);
  ctx.fillStyle = '#FFF4D6'; circle(ctx, sx, 330, 96);
  // clouds as paper strips
  [[260, 200, 260], [980, 150, 200], [1700, 230, 240], [2300, 170, 220]].forEach(([x, y, w]) => {
    const cx = wrapX(x - sc * 0.12, 2700);
    ctx.fillStyle = 'rgba(70,30,40,0.12)'; ctx.beginPath(); ctx.roundRect(cx + 3, y + 6, w, 30, 15); ctx.fill();
    ctx.fillStyle = '#FFF1E2'; ctx.beginPath(); ctx.roundRect(cx, y, w, 30, 15); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + w * 0.2, y - 22, w * 0.45, 30, 15); ctx.fill();
  });
  // birds
  ctx.strokeStyle = '#6E4A6E'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const bx = wrapX(500 + k * 90 - sc * 0.2 + t * 40, 2400), by = 250 + (k % 2) * 30 + Math.sin(t * 2 + k) * 6, f = Math.sin(t * 9 + k) * 6;
    ctx.beginPath(); ctx.moveTo(bx - 14, by - f); ctx.lineTo(bx, by); ctx.lineTo(bx + 14, by - f); ctx.stroke();
  }
  // mountains, back to front
  paperLayer(ctx, ridge(560, 300, 380, 0.1, sc, 1), '#E8907F', 12);
  paperLayer(ctx, ridge(640, 260, 300, 0.22, sc, 5), '#BE6779', 12);
  paperLayer(ctx, ridge(720, 210, 260, 0.4, sc, 9), '#874C74', 12);
  // pines
  const off = sc * 0.62;
  for (let k = Math.floor(off / 95) - 1; k < (off + W) / 95 + 1; k++) {
    const x = k * 95 - off + hash(k) * 40, s = 0.7 + hash(k + 4) * 0.6, by = 820;
    for (let j = 0; j < 3; j++) {
      const w2 = (60 - j * 14) * s, y0 = by - j * 46 * s;
      paperLayer(ctx, [[x - w2, y0], [x, y0 - 90 * s], [x + w2, y0]], j % 2 ? '#3E7A6E' : '#2F5D5A', 5, 0);
    }
  }
  paperLayer(ctx, ridge(800, 60, 200, 0.8, sc, 13, 0), '#4F3E66', 10);
  // ground
  const gpts = [[0, H]];
  for (let x = 0; x <= W; x += 24) gpts.push([x, GROUND - 6 + ((x + Math.round(sc)) % 48 < 24 ? -6 : 0) + Math.sin((x + sc) / 160) * 4]);
  gpts.push([W, H]);
  paperLayer(ctx, gpts, '#6E9C66', 10);
  const g2 = [[0, H]];
  for (let x = 0; x <= W; x += 30) g2.push([x, 960 + Math.sin((x + sc) / 120) * 10]);
  g2.push([W, H]);
  paperLayer(ctx, g2, '#58855A', 8);
  const m = drawMeet(ctx, i, t, 'paper', {});
  if (m.fr && m.tagK > 0.01) {
    ctx.save(); ctx.translate(m.fr.x, GROUND + 74); ctx.scale(m.tagK, m.tagK); ctx.rotate(-0.03);
    ctx.font = 'italic 600 32px Fraunces'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const tw = ctx.measureText(tagText(m.friend)).width + 50;
    ctx.fillStyle = 'rgba(70,30,40,0.25)'; ctx.fillRect(-tw / 2 + 4, -30, tw, 54);
    ctx.fillStyle = '#FFF4E4'; ctx.fillRect(-tw / 2, -36, tw, 54);
    ctx.fillStyle = '#874C74'; ctx.fillText(tagText(m.friend), 0, 1);
    ctx.restore();
  }
  textureFill(ctx, [[0, 0], [W, 0], [W, H], [0, H]], TEX.grain, 0.06);
}

// ============ 6. WATERCOLOUR — The Seaside ============
function wash(ctx, pts, color, seed, o = {}) {
  const layers = o.layers || 3, amp = o.amp || 7, a = o.alpha || 0.3;
  for (let k = 0; k < layers; k++) {
    const q = wobble(pts, amp * (1 + k * 0.5), o.freq || 0.012, seed + k * 7);
    ctx.globalAlpha = a; ctx.fillStyle = color; polyPath(ctx, q); ctx.fill();
    if (k === 0 && o.edge !== false) { ctx.globalAlpha = a * 0.9; ctx.strokeStyle = shade(color, -0.2); ctx.lineWidth = 1.6; polyPath(ctx, q); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}
function inkLine(ctx, pts, seed, w = 2, a = 0.75) {
  ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = w; ctx.lineCap = ctx.lineJoin = 'round';
  polyPath(ctx, jitter(pts, 1, seed), false); ctx.stroke(); ctx.globalAlpha = 1;
}
function band(y0, y1, step, fn0, fn1) {
  const top = [], bot = [];
  for (let x = -60; x <= W + 60; x += step) { top.push([x, y0 + (fn0 ? fn0(x) : 0)]); bot.push([x, y1 + (fn1 ? fn1(x) : 0)]); }
  return top.concat(bot.reverse());
}
function drawWater(ctx, t) {
  const i = 5, sc = scrollOf(i, t);
  ctx.fillStyle = '#FBF6EA'; ctx.fillRect(0, 0, W, H);
  wash(ctx, band(-40, 300, 40), '#8EC5E6', 3, { alpha: 0.22, amp: 14 });
  wash(ctx, band(160, 520, 40), '#A9D4EC', 5, { alpha: 0.16, amp: 18 });
  [[300, 170], [1100, 120], [1750, 210], [2400, 150]].forEach(([x, y], k) => {
    const cx = wrapX(x - sc * 0.1, 2800);
    wash(ctx, scallopPts(cx, y, 130, 42, 7, 0.25, 60), '#FFFFFF', 30 + k, { alpha: 0.6, layers: 2, edge: false });
  });
  wash(ctx, ellipsePts(1450 - sc * 0.03, 250, 82, 82, 60), '#F6C26B', 8, { alpha: 0.38, amp: 4 });
  // sea
  wash(ctx, band(560, 760, 30, (x) => Math.sin(x / 180) * 4), '#3E95C1', 11, { alpha: 0.3, amp: 6 });
  wash(ctx, band(560, 620, 30), '#2C7AA6', 12, { alpha: 0.18, amp: 5 });
  for (let k = 0; k < 7; k++) {
    const y = 600 + k * 22, off = sc * (0.25 + k * 0.05) + t * 18;
    ctx.globalAlpha = 0.75; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let x = -((off) % 260) - 260; x < W + 260; x += 260) {
      polyPath(ctx, wobble(catmull([[x, y], [x + 40, y - 7], [x + 90, y]], false, 6), 1.5, 0.05, k), false); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // sand + foam
  wash(ctx, band(720, H + 40, 40, (x) => Math.sin((x + sc * 0.6) / 150) * 8), '#EBCB95', 15, { alpha: 0.42, amp: 6 });
  wash(ctx, band(724, 760, 40, (x) => Math.sin((x + sc * 0.6) / 150) * 8, (x) => Math.sin((x + sc * 0.6) / 150) * 8 + Math.sin(t * 2) * 6), '#CFA772', 16, { alpha: 0.32, amp: 4 });
  ctx.globalAlpha = 0.9; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 5;
  polyPath(ctx, wobble(Array.from({ length: 50 }, (_, k) => [k * 41 - 20, 724 + Math.sin((k * 41 + sc * 0.6) / 150) * 8 + Math.sin(t * 2) * 5]), 2, 0.04, 3, false), false); ctx.stroke();
  ctx.globalAlpha = 1;
  // gulls
  for (let k = 0; k < 4; k++) {
    const bx = wrapX(400 + k * 380 - sc * 0.3 + t * 60, 2400), by = 330 + (k % 2) * 60, f = Math.sin(t * 7 + k) * 7;
    inkLine(ctx, catmull([[bx - 22, by - f], [bx - 10, by - 8], [bx, by], [bx + 10, by - 8], [bx + 22, by - f]], false, 4), k, 2.6, 0.8);
  }
  // palms (behind the dogs)
  [[300, 1.0], [1500, 1.15], [2500, 0.95]].forEach(([x, s], k) => {
    const bx = wrapX(x - sc * 0.9, 3000), by = 790;
    const trunkLine = catmull([[bx, by], [bx + 20 * s, by - 160 * s], [bx + 70 * s, by - 330 * s]], false, 8);
    wash(ctx, tapered(trunkLine, 20 * s, 12 * s), '#9A6A45', 50 + k, { alpha: 0.45, amp: 2, layers: 2 });
    for (let j = 1; j < 8; j++) { const p = trunkLine[j * 2]; inkLine(ctx, [[p[0] - 14 * s, p[1]], [p[0] + 12 * s, p[1] - 4 * s]], j + k, 1.6, 0.5); }
    const top = trunkLine[trunkLine.length - 1];
    for (let f = 0; f < 6; f++) {
      const a = -Math.PI / 2 + (f - 2.5) * 0.55 + Math.sin(t * 1.5 + f) * 0.04, L = 170 * s;
      const tip = [top[0] + Math.cos(a) * L, top[1] + Math.sin(a) * L * 0.55 + 60 * s];
      const mid = [top[0] + Math.cos(a) * L * 0.5, top[1] + Math.sin(a) * L * 0.5 - 20 * s];
      const leaf = tapered(catmull([top, mid, tip], false, 6), 22 * s, 3 * s);
      wash(ctx, leaf, f % 2 ? '#4FA35A' : '#3E8E4E', 60 + f + k * 9, { alpha: 0.5, amp: 2, layers: 2 });
      inkLine(ctx, catmull([top, mid, tip], false, 6), f, 1.6, 0.6);
    }
  });
  // starfish + shells
  [[700, 980, '#F08A5D'], [1350, 1030, '#F6D5C3'], [2050, 960, '#F08A5D'], [2600, 1010, '#F6D5C3']].forEach(([x, y, c], k) => {
    const cx = wrapX(x - sc, 3000);
    const shape = k % 2 ? scallopPts(cx, y, 26, 20, 6, 0.15, 30) : starPts(cx, y, 30, 13, 5, 0.3);
    wash(ctx, shape, c, 80 + k, { alpha: 0.6, amp: 1.5, layers: 2 });
  });
  const m = drawMeet(ctx, i, t, 'water', {});
  if (m.fr && m.tagK > 0.01) {
    ctx.save(); ctx.translate(m.fr.x, GROUND + 80); ctx.scale(m.tagK, m.tagK); ctx.rotate(-0.04);
    ctx.font = '700 56px Caveat'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
    ctx.fillText(tagText(m.friend), 0, 0);
    ctx.restore();
  }
  textureFill(ctx, [[0, 0], [W, 0], [W, H], [0, H]], TEX.paper, 0.1);
}

// ============ 7. POP ART — Comic City ============
function burstPts(cx, cy, r, n, seed) { const out = []; for (let k = 0; k < n * 2; k++) { const a = (k / (n * 2)) * TAU, rr = k % 2 ? r * (0.62 + hash(k + seed) * 0.1) : r * (0.95 + hash(k * 3 + seed) * 0.15); out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.78]); } return out; }
function comicWord(ctx, word, x, y, size, k, rot, fill = '#FF3B3B') {
  if (k <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  const b = burstPts(0, 0, size * 1.45, 12, size);
  ctx.fillStyle = '#111'; polyPath(ctx, b.map(([px, py]) => [px + 8, py + 8])); ctx.fill();
  ctx.fillStyle = '#FFF35C'; polyPath(ctx, b); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.lineJoin = 'round'; polyPath(ctx, b); ctx.stroke();
  ctx.font = `${size}px Bangers`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeText(word, 0, 4);
  ctx.fillStyle = fill; ctx.fillText(word, 0, 4);
  ctx.restore();
}
function drawPop(ctx, t) {
  const i = 6, sc = scrollOf(i, t), τ = t - SCENES[i].start;
  ctx.fillStyle = '#FFE14D'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#FFCF2E';
  for (let k = 0; k < 18; k++) {
    const a0 = (k / 18) * TAU + t * 0.08, a1 = a0 + TAU / 36;
    ctx.beginPath(); ctx.moveTo(1050, 520); ctx.lineTo(1050 + Math.cos(a0) * 2400, 520 + Math.sin(a0) * 2400); ctx.lineTo(1050 + Math.cos(a1) * 2400, 520 + Math.sin(a1) * 2400); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,90,140,0.55)';
  for (let y = 0; y < 760; y += 22) for (let x = (y / 22) % 2 * 11; x < W; x += 22) {
    const k = clamp(1 - Math.hypot(x - 1050, y - 520) / 900) ;
    const r = 7 * (1 - k);
    if (r > 0.6) circle(ctx, x, y, r);
  }
  // buildings
  const cols = ['#4FC3F7', '#FF6FAE', '#7C6CF2', '#FF8A3D', '#2ED3A0'];
  const off = sc * 0.5;
  for (let k = Math.floor(off / 230) - 1; k < (off + W) / 230 + 1; k++) {
    const x = k * 230 - off, hgt = 260 + hash(k * 1.3) * 260, bw = 200, top = 840 - hgt;
    ctx.fillStyle = cols[((k % 5) + 5) % 5]; ctx.fillRect(x, top, bw, hgt);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = top + 6; y < 840; y += 14) for (let xx = x + bw - 60 + ((y / 14) % 2) * 7; xx < x + bw; xx += 14) circle(ctx, xx, y, 3.5);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.strokeRect(x, top, bw, hgt);
    for (let wy = top + 30; wy < 800; wy += 70) for (let wx = x + 28; wx < x + bw - 40; wx += 62) {
      ctx.fillStyle = hash(wx + wy * 3 + k) > 0.4 ? '#FFFFFF' : '#FFF35C'; ctx.fillRect(wx, wy, 36, 42); ctx.lineWidth = 4; ctx.strokeRect(wx, wy, 36, 42);
    }
  }
  // sidewalk
  ctx.fillStyle = '#F4F4F4'; ctx.fillRect(0, 838, W, H - 838);
  ctx.fillStyle = 'rgba(0,0,0,0.13)';
  for (let y = 850; y < H; y += 18) for (let x = ((y / 18) % 2) * 9 - (sc % 18); x < W; x += 18) circle(ctx, x, y, 2 + (y - 850) / 70);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 838); ctx.lineTo(W, 838); ctx.stroke();
  ctx.lineWidth = 4;
  for (let x = -(sc % 240); x < W; x += 240) { ctx.beginPath(); ctx.moveTo(x, 838); ctx.lineTo(x - 60, H); ctx.stroke(); }
  // speed lines behind the running friend
  const m = drawMeet(ctx, i, t, 'pop', {}, { heartColors: ['#FF3B3B', '#FF6FAE', '#FF3B3B'] });
  if (m.fr && τ > 5.4) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) { const y = GROUND - 60 - k * 34, x = m.fr.x - 200 - (k % 2) * 40; ctx.beginPath(); ctx.moveTo(x - 120, y); ctx.lineTo(x, y); ctx.stroke(); }
  }
  comicWord(ctx, 'WOOF!', m.bb.headTop[0] - 40, m.bb.headTop[1] - 70, 74, ease.outBack(seg(τ, 3.35, 3.6), 2.4) * (1 - seg(τ, 4.9, 5.1)), -0.12);
  if (m.frBuilt) comicWord(ctx, 'ARF!', m.frBuilt.headTop[0] + 60, m.frBuilt.headTop[1] - 50, 64, ease.outBack(seg(τ, 3.7, 3.95), 2.4) * (1 - seg(τ, 4.9, 5.1)), 0.14, '#3BA7E8');
  if (m.fr && m.tagK > 0.01) {
    ctx.save(); ctx.translate(m.fr.x, GROUND + 78); ctx.scale(m.tagK, m.tagK); ctx.rotate(0.02);
    ctx.font = '40px Bangers'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(tagText(m.friend).toUpperCase()).width + 44;
    ctx.fillStyle = '#111'; ctx.fillRect(-tw / 2 + 7, -25, tw, 58);
    ctx.fillStyle = '#FFF35C'; ctx.fillRect(-tw / 2, -32, tw, 58);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeRect(-tw / 2, -32, tw, 58);
    ctx.fillStyle = '#111'; ctx.fillText(tagText(m.friend).toUpperCase(), 0, -1);
    ctx.restore();
  }
  // caption box + panel frame
  ctx.save(); ctx.translate(70, 64); ctx.rotate(-0.015);
  ctx.fillStyle = '#111'; ctx.fillRect(8, 8, 620, 74);
  ctx.fillStyle = '#FFF59D'; ctx.fillRect(0, 0, 620, 74);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, 620, 74);
  ctx.font = '44px Bangers'; ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('MEANWHILE, IN COMIC CITY...', 24, 40);
  ctx.restore();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 36; ctx.strokeRect(0, 0, W, H);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 9; ctx.strokeRect(22, 22, W - 44, H - 44);
}

// ============ 8. FINALE — Soft 3D group photo, then the photo wall ============
const CREW = [
  { id: 'pepper', x: 500, g: 800, s: 0.8, f: 1, d: -1, at: 0.95 },
  { id: 'disco', x: 1470, g: 800, s: 0.8, f: -1, d: 1, at: 0.85 },
  { id: 'noodle', x: 290, g: 965, s: 0.88, f: 1, d: -1, at: 0.75 },
  { id: 'mochi', x: 650, g: 975, s: 0.95, f: 1, d: -1, at: 1.15 },
  { id: 'waffles', x: 1330, g: 975, s: 0.9, f: -1, d: 1, at: 1.05 },
  { id: 'juniper', x: 1670, g: 965, s: 0.88, f: -1, d: 1, at: 1.25 },
];
function crewPose(c, τ, t) {
  const p = seg(τ, c.at, c.at + 0.9);
  const sx = c.d < 0 ? -300 : W + 300;
  const P = { x: lerp(sx, c.x, ease.out(p)), y: c.g, s: c.s, facing: c.f, walk: 1 - seg(p, 0.75, 1), phase: p * 14 };
  const hp = pulse(τ, c.at + 0.9, c.at + 1.2) + pulse(τ, 2.45 + c.at * 0.1, 2.8 + c.at * 0.1);
  P.hop = 32 * hp; P.tuck = hp;
  P.happy = τ > 2.3; P.tongue = 1;
  P.wag = Math.sin(t * 22 + c.at * 9) * 0.4;
  P.blink = ((t + c.at * 3) % 2.7) < 0.14 ? 0.15 : 1;
  return P;
}
const PALETTE_FLAGS = ['#34343B', '#74C47C', '#5A8CFF', '#FF4FD8', '#BE6779', '#3E95C1', '#FFE14D'];
function drawStage(ctx, t) {
  const τ = t - SCENES[7].start;
  const bg = ctx.createRadialGradient(960, 420, 100, 960, 520, 1200);
  bg.addColorStop(0, '#FFF7EC'); bg.addColorStop(1, '#F5C3A2');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const fl = ctx.createLinearGradient(0, 760, 0, H);
  fl.addColorStop(0, '#F7D2B6'); fl.addColorStop(1, '#EDB592');
  ctx.fillStyle = fl; ctx.fillRect(0, 760, W, H - 760);
  const spot = ctx.createRadialGradient(960, 900, 40, 960, 900, 760);
  spot.addColorStop(0, 'rgba(255,255,255,0.55)'); spot.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spot; ctx.fillRect(0, 600, W, H - 600);
  // bunting in every world's colour
  ctx.strokeStyle = '#8A5A44'; ctx.lineWidth = 3;
  const sag = (x) => 70 + Math.sin((x / W) * Math.PI) * 60;
  ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sag(x)); ctx.stroke();
  for (let k = 0; k < 15; k++) {
    const x = 60 + k * 128, y = sag(x), sw = Math.sin(t * 3 + k) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
    ctx.fillStyle = PALETTE_FLAGS[k % 7]; ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(36, 0); ctx.lineTo(0, 74); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // title
  const tk = ease.outBack(seg(τ, 1.5, 1.95), 1.8);
  if (tk > 0.01) {
    ctx.save(); ctx.translate(960, 335); ctx.scale(tk, tk);
    ctx.font = '900 132px Fraunces'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(120,60,30,0.18)'; ctx.fillText('Biscuit & Friends', 6, 8);
    ctx.fillStyle = '#3A2418'; ctx.fillText('Biscuit & Friends', 0, 0);
    ctx.restore();
  }
  // dogs, back row first
  const bp = biscuitPose(t), grow = ease.inOut(seg(τ, 0.3, 1.5));
  const list = CREW.map((c) => ({ id: c.id, P: crewPose(c, τ, t) })).concat([{ id: 'biscuit', P: Object.assign(bp, { y: lerp(GROUND, 935, grow), s: lerp(1, 1.15, grow) }) }]);
  list.sort((a, b) => a.P.y - b.P.y);
  list.forEach(({ id, P }) => drawDog(ctx, id, P, 'gloss', {}));
  // confetti
  for (let k = 0; k < 90; k++) {
    const t0 = 1.6 + hash(k) * 1.2, life = τ - t0;
    if (life <= 0) continue;
    const x = hash(k + 3) * W + Math.sin(life * 3 + k) * 30, y = -20 + life * (260 + hash(k + 9) * 200);
    if (y > H + 20) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(life * (3 + hash(k) * 5));
    ctx.fillStyle = PALETTE_FLAGS[k % 7]; ctx.fillRect(-8, -4, 16, 8); ctx.restore();
  }
  // photographer's "say woof"
  const sk = ease.outBack(seg(τ, 2.05, 2.3), 2) * (1 - seg(τ, 2.75, 2.85));
  if (sk > 0.01) {
    ctx.save(); ctx.translate(1600, 420); ctx.scale(sk, sk);
    ctx.fillStyle = '#3A2418'; ctx.beginPath(); ctx.roundRect(-150, -48, 300, 96, 48); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, 40); ctx.lineTo(-80, 90); ctx.lineTo(10, 44); ctx.fill();
    ctx.font = '700 44px "Space Grotesk"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFF7EC';
    ctx.fillText('Say “woof!”', 0, 2);
    ctx.restore();
  }
}
const PHOTO_T = 2.98;
const THUMBS = [
  { scene: 0, at: 3.3, cap: 'the sketchbook', x: 255, y: 215, r: -0.09 },
  { scene: 2, at: 4.0, cap: '8-bit city', x: 220, y: 545, r: 0.06 },
  { scene: 4, at: 4.0, cap: 'the mountains', x: 265, y: 880, r: -0.05 },
  { scene: 1, at: 4.0, cap: 'the park', x: 1665, y: 205, r: 0.08 },
  { scene: 3, at: 4.0, cap: 'night drive', x: 1700, y: 540, r: -0.06 },
  { scene: 5, at: 4.0, cap: 'the seaside', x: 1655, y: 880, r: 0.05 },
  { scene: 6, at: 4.0, cap: 'comic city', x: 960, y: 935, r: 0.02 },
];
let photoCache = null;
function buildPhotoCache() {
  const big = makeCanvas(W, H), g = big.getContext('2d');
  const shot = (fn, t) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); fn(g, t); };
  photoCache = { thumbs: [] };
  THUMBS.forEach((th) => {
    shot(SCENE_DRAW[SCENES[th.scene].id], SCENES[th.scene].start + th.at);
    const c = makeCanvas(400, 225); const cg = c.getContext('2d'); cg.imageSmoothingQuality = 'high'; cg.drawImage(big, 0, 0, 400, 225);
    photoCache.thumbs.push(c);
  });
  shot(drawStage, SCENES[7].start + PHOTO_T);
  photoCache.group = makeCanvas(W, H); photoCache.group.getContext('2d').drawImage(big, 0, 0);
}
function polaroid(ctx, img, x, y, pw, ph, rot, cap, capSize, capReveal = 1) {
  const bpad = pw * 0.035, bottom = ph * 0.2;
  const fw = pw + bpad * 2, fh = ph + bpad + bottom;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(60,35,20,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFDF7'; ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, -pw / 2, -fh / 2 + bpad, pw, ph);
  if (cap && capReveal > 0) {
    ctx.font = `700 ${capSize}px Caveat`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cw = ctx.measureText(cap).width;
    ctx.save(); ctx.beginPath(); ctx.rect(-cw / 2 - 10, fh / 2 - bottom, (cw + 20) * capReveal, bottom); ctx.clip();
    ctx.fillStyle = '#3A2418'; ctx.fillText(cap, 0, fh / 2 - bottom / 2 + 2);
    ctx.restore();
  }
  ctx.restore();
  return { fw, fh };
}
function drawFinale(ctx, t) {
  const τ = t - SCENES[7].start;
  if (τ < PHOTO_T) {
    drawStage(ctx, t);
    const f = seg(τ, 2.9, PHOTO_T);
    if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); }
    return;
  }
  if (!photoCache) buildPhotoCache();
  // the photo wall
  ctx.fillStyle = '#EADBC6'; ctx.fillRect(0, 0, W, H);
  textureFill(ctx, [[0, 0], [W, 0], [W, H], [0, H]], TEX.paper, 0.22);
  const vg = ctx.createRadialGradient(960, 540, 400, 960, 540, 1150);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,40,20,0.28)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  THUMBS.forEach((th, k) => {
    const p = ease.out(seg(τ, 3.45 + k * 0.12, 4.15 + k * 0.12));
    if (p <= 0) return;
    const fromX = th.x < 960 ? -400 : th.x > 960 ? W + 400 : th.x, fromY = th.x === 960 ? H + 300 : th.y;
    polaroid(ctx, photoCache.thumbs[k], lerp(fromX, th.x, p), lerp(fromY, th.y, p), 400, 225, th.r * p + (1 - p) * 0.4, th.cap, 34);
  });
  // the group photo shrinks from full-screen into its polaroid
  const p = ease.inOut(seg(τ, PHOTO_T + 0.05, 3.95));
  const pw = lerp(W * 1.08, 880, p), ph = pw * 9 / 16;
  const bpad = pw * 0.035, bottom = ph * 0.2, fh = ph + bpad + bottom;
  const cy = lerp(H / 2 + (fh / 2 - bpad - ph / 2), 470, p);
  polaroid(ctx, photoCache.group, 960, cy, pw, ph, -0.025 * p, 'Biscuit & friends  ♥', 64, ease.inOut(seg(τ, 4.3, 5.2)));
  // credit
  const ck = ease.out(seg(τ, 5.0, 5.5));
  if (ck > 0) {
    ctx.save(); ctx.globalAlpha = ck; ctx.translate(960, 62 + (1 - ck) * -30);
    ctx.font = '700 30px "Space Grotesk"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = 'Designed & animated by Claude   ·   8 styles · 7 places · 7 good dogs';
    const tw = ctx.measureText(txt).width + 64;
    ctx.fillStyle = '#3A2418'; ctx.beginPath(); ctx.roundRect(-tw / 2, -32, tw, 64, 32); ctx.fill();
    ctx.fillStyle = '#FFF7EC'; ctx.fillText(txt, 0, 2);
    ctx.restore();
  }
  // camera flash
  const fl = 1 - seg(τ, PHOTO_T, PHOTO_T + 0.55);
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
}

const SCENE_DRAW = { sketch: drawSketch, flat: drawFlat, pixel: drawPixel, neon: drawNeon, paper: drawPaper, water: drawWater, pop: drawPop, finale: drawFinale };
