'use strict';
// ---------- one parametric dog rig: Biscuit and every friend are built from the same parts ----------
const DOGS = {
  biscuit: {
    id: 'biscuit', name: 'Biscuit', breed: 'Very Good Boy',
    body: '#D99A4E', belly: '#F6E1BF', ear: '#A9652E', muzzle: '#F6E1BF', paw: '#F6E1BF',
    nose: '#2B1D18', eye: '#1E1410', tongue: '#F07A84', collar: '#E0483C', tag: '#F6C445',
    bodyW: 230, bodyH: 118, legLen: 62, legW: 32, headR: 66,
    earType: 'floppy', earLen: 1.0, tailType: 'curl', tailLen: 70, tailW: 13, chest: 'front', scale: 1,
  },
  pepper: {
    id: 'pepper', name: 'Pepper', breed: 'Dalmatian',
    body: '#FBFAF6', belly: '#FFFFFF', ear: '#26252B', muzzle: '#FFFFFF', paw: '#FBFAF6',
    nose: '#1E1C22', eye: '#1E1410', tongue: '#F07A84', collar: '#3BA7E8', tag: '#F6C445', spot: '#26252B',
    bodyW: 236, bodyH: 108, legLen: 84, legW: 27, headR: 60,
    earType: 'floppy', earLen: 0.9, tailType: 'straight', tailLen: 92, tailW: 10, chest: 'none', spots: true, scale: 1,
  },
  mochi: {
    id: 'mochi', name: 'Mochi', breed: 'Pug',
    body: '#E9CF9F', belly: '#F3E0BD', ear: '#3A2E2A', muzzle: '#3A2E2A', paw: '#E9CF9F',
    nose: '#120C0A', eye: '#1E1410', tongue: '#F07A84', collar: '#7C5CFF', tag: '#F6C445',
    bodyW: 200, bodyH: 122, legLen: 50, legW: 30, headR: 72,
    earType: 'fold', earLen: 0.5, tailType: 'curly', tailLen: 46, tailW: 12, chest: 'none', snout: 0.85, wrinkles: true, scale: 0.9,
  },
  disco: {
    id: 'disco', name: 'Disco', breed: 'Poodle',
    body: '#F4A3C8', belly: '#F9C6DD', ear: '#F08DBB', muzzle: '#FBD3E4', paw: '#F4A3C8',
    nose: '#2A1A22', eye: '#1E1410', tongue: '#F07A84', collar: '#3FD8E8', tag: '#F6C445',
    bodyW: 200, bodyH: 100, legLen: 86, legW: 21, headR: 58,
    earType: 'fluffy', earLen: 1.0, tailType: 'pom', tailLen: 60, tailW: 7, chest: 'none', fluffy: true, scale: 1,
  },
  juniper: {
    id: 'juniper', name: 'Juniper', breed: 'Husky',
    body: '#6F7B8C', belly: '#F4F6F8', ear: '#6F7B8C', earInner: '#F3B3C0', muzzle: '#F4F6F8', paw: '#F4F6F8',
    nose: '#1F1D22', eye: '#3FA9F5', tongue: '#F07A84', collar: '#F25F4C', tag: '#F6C445',
    bodyW: 246, bodyH: 120, legLen: 76, legW: 30, headR: 64,
    earType: 'pointy', earLen: 0.85, tailType: 'fluffy', tailLen: 66, tailW: 17, chest: 'belly', mask: 'husky', scale: 1,
  },
  noodle: {
    id: 'noodle', name: 'Noodle', breed: 'Dachshund',
    body: '#9C512B', belly: '#C98A5A', ear: '#6E3519', muzzle: '#B9733F', paw: '#9C512B',
    nose: '#1F1410', eye: '#1E1410', tongue: '#F07A84', collar: '#FFD23F', tag: '#3BA7E8',
    bodyW: 330, bodyH: 94, legLen: 34, legW: 26, headR: 58,
    earType: 'floppy', earLen: 1.35, tailType: 'straight', tailLen: 80, tailW: 10, chest: 'belly', snout: 1.4, headDX: 18, headDY: 10, scale: 0.95,
  },
  waffles: {
    id: 'waffles', name: 'Waffles', breed: 'Corgi',
    body: '#EB8A35', belly: '#FFF6EA', ear: '#EB8A35', earInner: '#F8C9A6', muzzle: '#FFF6EA', paw: '#FFF6EA',
    nose: '#1F1A18', eye: '#1E1410', tongue: '#F07A84', collar: '#2BA59B', tag: '#F6C445',
    bodyW: 268, bodyH: 116, legLen: 36, legW: 31, headR: 66,
    earType: 'pointy', earLen: 1.15, tailType: 'stub', tailLen: 30, tailW: 20, chest: 'front', blaze: true, scale: 0.95,
  },
};

const SPOTS_BODY = [[-0.55, -0.35, 0.12], [-0.12, 0.25, 0.1], [0.28, -0.42, 0.11], [0.52, 0.32, 0.08], [-0.75, 0.38, 0.09], [0.0, -0.66, 0.07], [0.18, 0.58, 0.07], [-0.36, -0.75, 0.06], [-0.4, 0.05, 0.06]];
const SPOTS_HEAD = [[-0.55, -0.42, 0.11], [0.12, -0.6, 0.08], [-0.25, 0.48, 0.07]];

// Build every visible part of a dog in screen space.
// P: { x, y (ground), s, facing, phase, walk, hop, squash, wag, headTilt, blink, happy, tongue, tuck, breath }
function buildDog(D, P) {
  const parts = [];
  const s = (D.scale || 1) * (P.s || 1), f = P.facing || 1, sq = P.squash || 0;
  const m = M.mul(M.tr(P.x, P.y - (P.hop || 0)), M.sc(s * f * (1 + sq), s * (1 - sq)));
  const mShadow = M.mul(M.tr(P.x, P.y), M.sc(s * f, s));
  const add = (name, pts, color, o = {}) => {
    const mm = o.mat ? M.mul(m, o.mat) : m;
    parts.push({
      uid: D.id + ':' + name, name, color,
      pts: xf(pts, mm), kind: o.kind || 'fill', alpha: o.alpha == null ? 1 : o.alpha,
      clip: o.clip || null, lw: (o.lw || 0) * s, big: !!o.big, dark: luminance(color) < 0.22, scale: s,
    });
    return parts[parts.length - 1];
  };

  const w = D.bodyW / 2, h = D.bodyH / 2, R = D.headR, L = D.legLen;
  const ph = P.phase || 0, wk = P.walk || 0;
  const bob = -wk * 7 * (1 - Math.cos(2 * ph)) / 2 + (P.breath || 0);
  const bodyCY0 = -(L + h * 0.85);
  const bodyCY = bodyCY0 + bob;
  const tilt = (P.bodyTilt || 0) + wk * 0.025 * Math.sin(2 * ph + 0.4);
  const mb = M.about(0, bodyCY, M.rot(tilt)); // body frame (local, pre-transform)

  // shadow (stays on the ground while hopping)
  const shR = 1 - clamp((P.hop || 0) / 300, 0, 0.55);
  parts.push({ uid: D.id + ':shadow', name: 'shadow', kind: 'shadow', color: '#000000', alpha: 1, scale: s,
    pts: xf(ellipsePts(w * 0.12, 0, w * 1.05 * shR, 13 * shR, 32), mShadow) });

  // ----- legs -----
  const legDefs = [
    { id: 'BF', hx: -0.6 * w + 12, far: true, off: 0 },
    { id: 'FF', hx: 0.55 * w + 12, far: true, off: Math.PI },
    { id: 'BN', hx: -0.6 * w, far: false, off: Math.PI },
    { id: 'FN', hx: 0.55 * w, far: false, off: 0 },
  ];
  const legPts = (lg) => {
    const hipY = bodyCY + 0.38 * h;
    const pawR = D.legW * 0.4;
    const lphase = ph + lg.off;
    let a = wk * 0.5 * Math.sin(lphase);
    const tuck = P.tuck || 0;
    a += tuck * (lg.id[0] === 'F' ? 0.55 : -0.55);
    const lift = wk * Math.max(0, Math.cos(lphase)) * 9 + tuck * 10;
    const Lg = (0 - pawR * 0.7) - (bodyCY0 + 0.38 * h) - lift;
    const hip = xp([lg.hx, hipY], mb);
    const paw = [hip[0] + Math.sin(a) * Lg, hip[1] + Math.cos(a) * Lg];
    const leg = capsule(hip[0], hip[1], paw[0], paw[1], D.legW / 2, D.legW * 0.43);
    const pawShape = ellipsePts(paw[0] + D.legW * 0.2, paw[1] + D.legW * 0.04, D.legW * 0.62, D.legW * 0.4, 20);
    return { leg, pawShape, paw };
  };
  const drawLeg = (lg) => {
    const { leg, pawShape, paw } = legPts(lg);
    const col = lg.far ? shade(D.body, -0.14) : D.body;
    const pawCol = lg.far ? shade(D.paw || D.body, -0.14) : (D.paw || D.body);
    add('leg' + lg.id, leg, col, { big: !lg.far });
    add('paw' + lg.id, pawShape, pawCol);
    if (D.fluffy) add('cuff' + lg.id, scallopPts(paw[0], paw[1] - D.legW * 0.55, D.legW * 0.78, D.legW * 0.62, 7, 0.18, 40), lg.far ? shade(D.belly, -0.12) : D.belly);
  };
  drawLeg(legDefs[0]); drawLeg(legDefs[1]);

  // ----- tail -----
  {
    const T = D.tailLen, tw = D.tailW;
    const anchor = xp([-0.93 * w, bodyCY - 0.32 * h], mb);
    const mt = M.about(anchor[0], anchor[1], M.rot(P.wag || 0));
    const at = (pts) => pts.map(([x, y]) => [anchor[0] + x, anchor[1] + y]);
    if (D.tailType === 'curl' || D.tailType === 'fluffy') {
      const line = catmull(at([[0, 0], [-0.32 * T, -0.42 * T], [-0.22 * T, -0.95 * T], [0.14 * T, -1.05 * T]]), false, 6);
      add('tail', tapered(line, tw * (D.tailType === 'fluffy' ? 1.2 : 1), tw * (D.tailType === 'fluffy' ? 0.85 : 0.42)), D.body, { mat: mt });
      if (D.tailType === 'fluffy') add('tailTip', ellipsePts(anchor[0] + 0.1 * T, anchor[1] - 1.02 * T, tw * 0.95, tw * 0.75, 20), D.belly, { mat: mt });
    } else if (D.tailType === 'straight') {
      const line = catmull(at([[0, 0], [-0.45 * T, -0.22 * T], [-0.95 * T, -0.5 * T]]), false, 6);
      add('tail', tapered(line, tw, tw * 0.3), D.body, { mat: mt });
    } else if (D.tailType === 'curly') {
      const sp = [];
      for (let i = 0; i <= 14; i++) { const a = Math.PI * 0.9 - (i / 14) * Math.PI * 1.9, r = T * (0.55 - i * 0.022); sp.push([-0.2 * T + Math.cos(a) * r, -0.55 * T + Math.sin(a) * r]); }
      sp.unshift([0, 0]);
      add('tail', tapered(at(sp), tw, tw * 0.55), D.body, { mat: mt });
    } else if (D.tailType === 'pom') {
      const line = catmull(at([[0, 0], [-0.3 * T, -0.5 * T], [-0.32 * T, -0.9 * T]]), false, 5);
      add('tail', tapered(line, tw, tw * 0.8), D.body, { mat: mt });
      add('tailPom', scallopPts(anchor[0] - 0.32 * T, anchor[1] - 0.95 * T, 21, 19, 7, 0.18, 40), D.belly, { mat: mt });
    } else if (D.tailType === 'stub') {
      add('tail', ellipsePts(anchor[0] - 4, anchor[1] - 2, tw, tw * 0.8, 24), D.body, { mat: mt });
    }
  }

  // ----- body -----
  const bodyLocal = D.fluffy
    ? scallopPts(0, bodyCY, w * 0.98, h * 0.98, 12, 0.07, 120)
    : catmull([[-w, -0.15 * h], [-0.78 * w, -0.88 * h], [-0.1 * w, -h], [0.6 * w, -0.92 * h], [0.98 * w, -0.3 * h], [0.86 * w, 0.62 * h], [0.1 * w, 0.95 * h], [-0.78 * w, 0.8 * h]].map(([x, y]) => [x, y + bodyCY]), true, 6);
  const body = add('body', bodyLocal, D.body, { mat: mb, big: true });
  if (D.chest === 'front') add('chest', ellipsePts(0.68 * w, bodyCY + 0.12 * h, 0.36 * w, 0.85 * h, 32), D.belly, { mat: mb, clip: body.pts });
  if (D.chest === 'belly') add('belly', ellipsePts(0.05 * w, bodyCY + 0.95 * h, 1.05 * w, 0.58 * h, 40), D.belly, { mat: mb, clip: body.pts });
  if (D.spots) SPOTS_BODY.forEach(([x, y, r], i) => add('spot' + i, ellipsePts(x * w, bodyCY + y * h, r * w, r * w * 0.85, 18, i), D.spot, { mat: mb, clip: body.pts }));

  drawLeg(legDefs[2]); drawLeg(legDefs[3]);

  // ----- head frame -----
  const hc0 = xp([0.62 * w + 0.15 * R + (D.headDX || 0), bodyCY - h - 0.2 * R + (D.headDY || 0)], mb);
  const hBob = wk * 3 * Math.sin(2 * ph + 0.6);
  const mh = M.mul(M.tr(hc0[0], hc0[1] + hBob), M.rot((P.headTilt || 0)));
  const H_ = (pts) => xf(pts, mh); // head-local -> dog-local

  const earAnchorsF = [[-0.6 * R, -0.58 * R, 0.38], [0.58 * R, -0.7 * R, -0.36]];
  const floppyEar = ([ax, ay, ang], len, wid, flop) => {
    const pts = catmull([[-0.45 * wid, 0], [0.45 * wid, 0], [0.55 * wid, 0.5 * len], [0.3 * wid, 0.95 * len], [0, len], [-0.35 * wid, 0.9 * len], [-0.55 * wid, 0.45 * len]], true, 6);
    return H_(xf(pts, M.mul(M.tr(ax, ay), M.rot(ang + flop))));
  };
  const flop = (P.earFlop || 0) + wk * 0.12 * Math.sin(2 * ph - 0.6);

  // pointy ears sit behind the head
  if (D.earType === 'pointy') {
    [[-0.5 * R, -0.62 * R, -0.36], [0.44 * R, -0.74 * R, 0.3]].forEach(([ax, ay, ang], i) => {
      const L2 = D.earLen * R, W2 = 0.62 * R;
      const shape = catmull([[-0.5 * W2, 0.15 * L2], [-0.32 * W2, -0.45 * L2], [0, -L2], [0.32 * W2, -0.45 * L2], [0.5 * W2, 0.15 * L2]], true, 6);
      const mm = M.mul(M.tr(ax, ay), M.rot(ang - flop * 0.3));
      add('ear' + i, H_(xf(shape, mm)), D.ear);
      if (D.earInner) add('earIn' + i, H_(xf(xf(shape, M.mul(M.tr(0, -0.06 * L2), M.sc(0.55, 0.62))), mm)), D.earInner);
    });
  }

  // head
  const headLocal = D.fluffy ? scallopPts(0, 0, R * 0.98, R * 0.9, 10, 0.07, 100) : ellipsePts(0, 0, R * 1.02, R * 0.9, 56);
  const head = add('head', H_(headLocal), D.body, { big: true });
  if (D.mask === 'husky') {
    add('mask', H_(ellipsePts(0.1 * R, 0.32 * R, 0.86 * R, 0.6 * R, 36)), D.belly, { clip: head.pts });
    add('brow0', H_(ellipsePts(-0.24 * R, -0.36 * R, 0.09 * R, 0.06 * R, 14)), D.belly);
    add('brow1', H_(ellipsePts(0.28 * R, -0.4 * R, 0.09 * R, 0.06 * R, 14)), D.belly);
  }
  if (D.blaze) add('blaze', H_(ellipsePts(0.04 * R, -0.42 * R, 0.13 * R, 0.5 * R, 24)), D.belly, { clip: head.pts });
  if (D.spots) SPOTS_HEAD.forEach(([x, y, r], i) => add('hspot' + i, H_(ellipsePts(x * R, y * R, r * R, r * R * 0.85, 16)), D.spot, { clip: head.pts }));
  add('blush', H_(ellipsePts(-0.5 * R, 0.24 * R, 0.13 * R, 0.08 * R, 18)), '#F28B8B', { alpha: 0.5 });
  if (D.fluffy) [[-0.36, -0.82, 0.3], [0.04, -0.98, 0.33], [0.42, -0.84, 0.29]].forEach(([x, y, r], i) => add('top' + i, H_(scallopPts(x * R, y * R, r * R, r * R * 0.9, 6, 0.15, 36)), D.belly));

  // eyes
  const blink = P.blink == null ? 1 : P.blink;
  [[-0.22 * R, -0.1 * R], [0.3 * R, -0.14 * R]].forEach(([ex, ey], i) => {
    if (P.happy) {
      add('eyeH' + i, H_(catmull([[ex - 0.12 * R, ey + 0.04 * R], [ex, ey - 0.09 * R], [ex + 0.12 * R, ey + 0.04 * R]], false, 6)), '#1E1410', { kind: 'line', lw: 0.055 * R });
    } else {
      const ry = 0.15 * R * Math.max(0.1, blink);
      add('eye' + i, H_(ellipsePts(ex, ey, 0.115 * R, ry, 24)), D.eye);
      if (D.eye !== '#1E1410') add('pupil' + i, H_(ellipsePts(ex + 0.02 * R, ey, 0.055 * R, ry * 0.5, 16)), '#1E1410');
      if (blink > 0.5) add('glint' + i, H_(ellipsePts(ex + 0.035 * R, ey - 0.05 * R, 0.042 * R, 0.042 * R, 12)), '#FFFFFF');
    }
  });
  if (D.wrinkles) add('wrinkle', H_(catmull([[-0.25 * R, -0.5 * R], [0.05 * R, -0.58 * R], [0.35 * R, -0.5 * R]], false, 6)), shade(D.body, -0.35), { kind: 'line', lw: 0.04 * R });

  // muzzle, nose, mouth
  const sn = D.snout || 1;
  const mc = [0.3 * R * sn + (sn - 1) * 0.2 * R, 0.34 * R], mrx = 0.5 * R * sn, mry = 0.34 * R;
  add('muzzle', H_(ellipsePts(mc[0], mc[1], mrx, mry, 36)), D.muzzle, { big: true });
  const nx = mc[0] + mrx * 0.52, ny = mc[1] - mry * 0.45;
  const tg = P.tongue || 0;
  if (tg > 0.02) add('tongue', H_(catmull([[nx - 0.13 * R, ny + 0.26 * R], [nx + 0.07 * R, ny + 0.26 * R], [nx + 0.06 * R, ny + (0.3 + 0.2 * tg) * R], [nx - 0.03 * R, ny + (0.36 + 0.2 * tg) * R], [nx - 0.12 * R, ny + (0.3 + 0.2 * tg) * R]], true, 5)), D.tongue);
  add('nose', H_(catmull([[nx - 0.17 * R, ny - 0.07 * R], [nx + 0.15 * R, ny - 0.08 * R], [nx + 0.05 * R, ny + 0.1 * R], [nx - 0.06 * R, ny + 0.1 * R]], true, 6)), D.nose);
  add('noseGlint', H_(ellipsePts(nx - 0.05 * R, ny - 0.03 * R, 0.05 * R, 0.028 * R, 10)), '#FFFFFF', { alpha: 0.75 });
  const mouthCol = D.muzzle === D.nose || luminance(D.muzzle) < 0.3 ? '#120C0A' : '#2B1D18';
  add('mouth', H_(catmull([[nx - 0.22 * R, ny + 0.2 * R], [nx - 0.11 * R, ny + 0.29 * R], [nx - 0.01 * R, ny + 0.16 * R], [nx + 0.09 * R, ny + 0.28 * R], [nx + 0.19 * R, ny + 0.19 * R]], false, 5)), mouthCol, { kind: 'line', lw: 0.045 * R });
  add('philtrum', H_([[nx - 0.01 * R, ny + 0.08 * R], [nx - 0.01 * R, ny + 0.17 * R]]), mouthCol, { kind: 'line', lw: 0.045 * R });

  // floppy / folded / fluffy ears hang in front
  if (D.earType === 'floppy') earAnchorsF.forEach((a, i) => add('ear' + i, floppyEar(a, D.earLen * 0.95 * R, 0.5 * R, flop * (i ? -1 : 1)), D.ear, { big: true }));
  if (D.earType === 'fold') [[-0.62 * R, -0.62 * R, 1.0], [0.52 * R, -0.74 * R, -0.95]].forEach((a, i) => add('ear' + i, floppyEar(a, 0.45 * R, 0.42 * R, flop * (i ? -1 : 1)), D.ear));
  if (D.earType === 'fluffy') earAnchorsF.forEach(([ax, ay, ang], i) => {
    for (let k = 0; k < 4; k++) {
      const a = ang + flop * (i ? -1 : 1), d = 0.12 * R + k * 0.24 * R;
      const cx = ax - Math.sin(a) * d, cy = ay + Math.cos(a) * d;
      add('ear' + i + k, H_(scallopPts(cx, cy, 0.24 * R, 0.21 * R, 6, 0.16, 30)), k % 2 ? D.ear : shade(D.ear, 0.08));
    }
  });

  // collar + tag
  const collarLine = catmull([[-0.72 * R, 0.68 * R], [-0.2 * R, 1.0 * R], [0.38 * R, 0.94 * R]], false, 6);
  add('collar', H_(tapered(collarLine, 0.085 * R, 0.085 * R, 4)), D.collar);
  add('tag', H_(ellipsePts(-0.12 * R, 1.13 * R, 0.11 * R, 0.11 * R, 18)), D.tag);

  const headTop = xp(H_([[0, -1.25 * R]])[0], m);
  const headC = xp(H_([[0, 0]])[0], m);
  const mouthPt = xp(H_([[nx, ny + 0.2 * R]])[0], m);
  return { parts, headTop, headC, mouth: mouthPt, scale: s };
}
