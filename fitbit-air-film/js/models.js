// Procedural models: the pod, its internals, bands, charger. 1 unit = 10 mm.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCanvas, rng, TAU } from './util.js';

// Official size: 34.9 x 17 x 8.3 mm
export const POD = { a: 1.745, b: 0.85, top: 0.45, bottom: 0.38 };

const sgnPow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

// Superellipsoid: pill-shaped in plan (exponent m), soft rounded profile (exponent n).
// vRange lets us build only the upper or lower shell for the exploded view.
export function superellipsoid({ a, b, top, bottom, m = 2.8, n = 2.5, U = 160, V = 72, v0 = -Math.PI / 2, v1 = Math.PI / 2 }) {
  const P = (u, v) => {
    const cv = sgnPow(Math.cos(v), 2 / n), sv = sgnPow(Math.sin(v), 2 / n);
    return [a * cv * sgnPow(Math.cos(u), 2 / m), (sv >= 0 ? top : bottom) * sv, b * cv * sgnPow(Math.sin(u), 2 / m)];
  };
  const pos = [], nor = [], uv = [], idx = [];
  const e = 1e-4;
  for (let j = 0; j <= V; j++) {
    const v = v0 + (v1 - v0) * (j / V);
    for (let i = 0; i <= U; i++) {
      const u = -Math.PI + TAU * (i / U);
      const p = P(u, v);
      pos.push(...p);
      let nx, ny, nz;
      if (Math.abs(Math.abs(v) - Math.PI / 2) < 1e-6) { nx = 0; ny = Math.sign(v); nz = 0; }
      else {
        const pu = P(u + e, v), pv = P(u, v + e);
        const du = [pu[0] - p[0], pu[1] - p[1], pu[2] - p[2]], dv = [pv[0] - p[0], pv[1] - p[1], pv[2] - p[2]];
        nx = du[1] * dv[2] - du[2] * dv[1]; ny = du[2] * dv[0] - du[0] * dv[2]; nz = du[0] * dv[1] - du[1] * dv[0];
        const l = Math.hypot(nx, ny, nz) || 1; nx /= -l; ny /= -l; nz /= -l;
        // make sure normals point outward
        if (nx * p[0] + ny * p[1] + nz * p[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      }
      nor.push(nx, ny, nz);
      uv.push(i / U, j / V);
    }
  }
  for (let j = 0; j < V; j++) for (let i = 0; i < U; i++) {
    const a0 = j * (U + 1) + i, b0 = a0 + U + 1;
    idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ---------- textures ----------
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(0.18, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// woven textile height map -> normal map (Performance Loop)
function weaveTextures(kind) {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d'), r = rng(kind === 'weave' ? 3 : 9);
  const img = g.createImageData(S, S), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v;
    if (kind === 'weave') {
      const cell = 16, cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      const fx = (x % cell) / cell, fy = (y % cell) / cell;
      const over = (cx + cy) % 2 === 0;
      v = over ? Math.sin(Math.PI * fy) * 0.9 + 0.1 * Math.sin(Math.PI * fx) : Math.sin(Math.PI * fx) * 0.9 + 0.1 * Math.sin(Math.PI * fy);
      v = v * 0.85 + 0.15 * (r() - 0.5) + 0.08 * Math.sin(y * 0.9);
    } else { // silicone: soft ribs
      v = 0.5 + 0.5 * Math.sin((x / S) * TAU * 24) * 0.6 + 0.02 * (r() - 0.5);
    }
    h[y * S + x] = v;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hl = h[y * S + ((x - 1 + S) % S)], hr = h[y * S + ((x + 1) % S)], hu = h[((y - 1 + S) % S) * S + x], hd = h[((y + 1) % S) * S + x];
    const k = kind === 'weave' ? 2.2 : 1.2;
    let nx = (hl - hr) * k, ny = (hu - hd) * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * S + x) * 4;
    img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const normal = new THREE.CanvasTexture(c);
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  const ac = makeCanvas(S, S), ag = ac.getContext('2d'), aimg = ag.createImageData(S, S);
  for (let i = 0; i < S * S; i++) { const v = 150 + h[i] * 105; aimg.data[i * 4] = aimg.data[i * 4 + 1] = aimg.data[i * 4 + 2] = v; aimg.data[i * 4 + 3] = 255; }
  ag.putImageData(aimg, 0, 0);
  const ao = new THREE.CanvasTexture(ac); ao.wrapS = ao.wrapT = THREE.RepeatWrapping; ao.colorSpace = THREE.SRGBColorSpace;
  return { normal, ao };
}
let TEX = null;
function tex() {
  if (!TEX) TEX = { weave: weaveTextures('weave'), rib: weaveTextures('rib'), glow: glowTexture() };
  return TEX;
}

// ---------- the pod ----------
export const PODMAT = () => new THREE.MeshPhysicalMaterial({ color: '#1a1a1e', roughness: 0.38, metalness: 0.0, clearcoat: 0.45, clearcoatRoughness: 0.28, sheen: 0.3, sheenColor: new THREE.Color('#6a6a78'), sheenRoughness: 0.55 });

export function makePod() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(superellipsoid(POD), PODMAT());
  group.add(body);
  // underside sensor window: a glossy dark lens
  const lensGeo = new THREE.SphereGeometry(1, 64, 32, 0, TAU, Math.PI / 2, Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, new THREE.MeshPhysicalMaterial({ color: '#050507', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5, reflectivity: 0.9 }));
  lens.scale.set(0.62, 0.06, 0.5); lens.position.y = -POD.bottom + 0.02;
  group.add(lens);
  // emitters + detectors under the lens
  const emit = (x, z, r, color) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: '#111114', transparent: true, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.set(x, -POD.bottom + 0.02 - 0.06 - 0.004, z); m.userData.on = new THREE.Color(color);
    group.add(m); return m;
  };
  const emitters = {
    hr: [emit(-0.12, 0, 0.075, '#E8FFF4'), emit(0.12, 0, 0.075, '#E8FFF4')],
    red: emit(0, -0.2, 0.06, '#FF3D3D'),
    ir: emit(0, 0.2, 0.06, '#B03CFF'),
    det: [emit(-0.38, -0.12, 0.05, '#7FA7FF'), emit(-0.38, 0.12, 0.05, '#7FA7FF'), emit(0.38, 0, 0.05, '#7FA7FF')],
  };
  // charging contacts
  const pinMat = new THREE.MeshStandardMaterial({ color: '#C9CCD2', metalness: 1, roughness: 0.25 });
  [-1.05, 1.05].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 24), pinMat); p.position.set(x, -POD.bottom * 0.8 - 0.01, 0); group.add(p); });
  // status LED on the left side
  const ledMat = new THREE.MeshBasicMaterial({ color: '#2a2a2e' });
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), ledMat);
  led.position.set(-0.55, 0.04, -POD.b * 0.985); led.rotation.y = Math.PI;
  group.add(led);
  const ledGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex().glow, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ledGlow.position.copy(led.position).add(new THREE.Vector3(0, 0, -0.05)); ledGlow.scale.setScalar(0.9);
  group.add(ledGlow);
  const setLED = (color, k) => {
    ledMat.color.set(color).multiplyScalar(0.25 + 0.75 * k);
    ledGlow.material.color.set(color); ledGlow.material.opacity = k;
  };
  const setEmit = (key, k) => [].concat(emitters[key]).forEach((m) => { m.material.color.set('#111114').lerp(m.userData.on, k); });
  setLED('#ffffff', 0);
  return { group, body, lens, emitters, setEmit, led, ledGlow, setLED };
}

// ---------- exploded internals ----------
export function makeExploded() {
  const g = new THREE.Group();
  const shellMat = PODMAT();
  const top = new THREE.Mesh(superellipsoid({ ...POD, v0: 0.02, v1: Math.PI / 2 }), shellMat); top.material.side = THREE.DoubleSide;
  const bottom = new THREE.Mesh(superellipsoid({ ...POD, v0: -Math.PI / 2, v1: -0.02 }), shellMat.clone()); bottom.material.side = THREE.DoubleSide;
  const motor = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.26, 48), new THREE.MeshStandardMaterial({ color: '#B8BCC4', metalness: 1, roughness: 0.28 }));
  motor.add(can);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 48), new THREE.MeshStandardMaterial({ color: '#D9B36C', metalness: 1, roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.13; motor.add(ring);
  motor.position.x = 0.95;
  const battery = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.22, 1.1, 6, 0.1), new THREE.MeshPhysicalMaterial({ color: '#C7CBD2', metalness: 0.9, roughness: 0.35, clearcoat: 0.4 }));
  battery.position.x = -0.35;
  // circuit board with gold traces
  const c = makeCanvas(512, 256), cg = c.getContext('2d'), r = rng(21);
  cg.fillStyle = '#0d1512'; cg.fillRect(0, 0, 512, 256);
  cg.strokeStyle = '#C9A45C'; cg.lineWidth = 2;
  for (let k = 0; k < 70; k++) {
    let x = r() * 512, y = r() * 256; cg.beginPath(); cg.moveTo(x, y);
    for (let s = 0; s < 4; s++) { if (s % 2) x += (r() - 0.5) * 160; else y += (r() - 0.5) * 120; cg.lineTo(x, y); }
    cg.stroke();
  }
  cg.fillStyle = '#1b1f22'; [[90, 70, 120, 90], [300, 110, 70, 70], [400, 40, 60, 40]].forEach(([x, y, w, h]) => cg.fillRect(x, y, w, h));
  const pcbTex = new THREE.CanvasTexture(c); pcbTex.colorSpace = THREE.SRGBColorSpace;
  const pcbShape = new THREE.Shape();
  const N = 64;
  for (let k = 0; k <= N; k++) {
    const u = -Math.PI + TAU * (k / N);
    const x = 1.5 * sgnPow(Math.cos(u), 2 / 2.8), z = 0.72 * sgnPow(Math.sin(u), 2 / 2.8);
    if (k === 0) pcbShape.moveTo(x, z); else pcbShape.lineTo(x, z);
  }
  const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, { depth: 0.05, bevelEnabled: false });
  pcbGeo.rotateX(Math.PI / 2);
  const uvAttr = pcbGeo.attributes.uv, posAttr = pcbGeo.attributes.position;
  for (let i = 0; i < uvAttr.count; i++) uvAttr.setXY(i, (posAttr.getX(i) + 1.5) / 3, (posAttr.getZ(i) + 0.72) / 1.44);
  const pcb = new THREE.Mesh(pcbGeo, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.5, metalness: 0.3 }));
  const sensor = new THREE.Group();
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#050507', roughness: 0.04, clearcoat: 1 }));
  lens.scale.set(0.62, 0.06, 0.5); sensor.add(lens);
  [[-0.12, 0, '#E8FFF4'], [0.12, 0, '#E8FFF4'], [0, -0.2, '#FF3D3D'], [0, 0.2, '#B03CFF']].forEach(([x, z, col]) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshBasicMaterial({ color: col }));
    d.rotation.x = -Math.PI / 2; d.position.set(x, 0.005, z); sensor.add(d);
  });
  sensor.rotation.x = Math.PI; // faces down
  const parts = [
    { key: 'top', mesh: top, rest: 0, label: 'Recycled polycarbonate + PBT housing' },
    { key: 'motor', mesh: motor, rest: 0.05, label: 'Vibration motor' },
    { key: 'battery', mesh: battery, rest: 0.02, label: 'Lithium-polymer battery' },
    { key: 'pcb', mesh: pcb, rest: -0.12, label: 'Sensors + Bluetooth 5.0' },
    { key: 'bottom', mesh: bottom, rest: 0, label: null },
    { key: 'sensor', mesh: sensor, rest: -POD.bottom - 0.01, label: 'Optical sensor window' },
  ];
  parts.forEach((p) => g.add(p.mesh));
  return { group: g, parts };
}

// ---------- bands ----------
export const BANDS = {
  obsidian: { color: '#1d1d22', buckle: '#2a2a2e', bmetal: 0.6, family: 'loop' },
  fog: { color: '#b9c1bb', buckle: '#c8cbd0', bmetal: 1, family: 'loop' },
  lavender: { color: '#9a9cd6', buckle: '#c8cbd0', bmetal: 1, family: 'loop' },
  berry: { color: '#a8203f', buckle: '#d6bb8a', bmetal: 1, family: 'loop' },
  activeLav: { color: '#b2b0e0', family: 'active' },
  activeObs: { color: '#1c1c20', family: 'active' },
  moonstone: { color: '#909ba8', buckle: '#bfc3c9', bmetal: 1, family: 'modern' },
  porcelain: { color: '#ece7de', buckle: '#d2b98c', bmetal: 1, family: 'modern' },
};
// A closed band loop as if around an invisible wrist; the pod sits on the INSIDE at the top.
// Loop lies in the Y-Z plane, band width along X.
export function makeBand(key, { ry = 2.15, rz = 2.85, width = 1.82, thick = 0.13 } = {}) {
  const spec = BANDS[key];
  const T = tex();
  const SEG = 220, ACROSS = 10;
  const pos = [], nor = [], uv = [], idx = [];
  const ring = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * TAU;
    // squarish-ellipse so the top is flatter where the pod sits
    const c = Math.cos(a), s = Math.sin(a);
    const y = ry * Math.sign(s) * Math.pow(Math.abs(s), 0.8), z = rz * Math.sign(c) * Math.pow(Math.abs(c), 0.8);
    ring.push([y, z]);
  }
  // cross-section: rounded rectangle (width along x, thickness along normal)
  const cs = [];
  for (let k = 0; k < ACROSS * 4; k++) {
    const t = k / (ACROSS * 4) * TAU;
    const cx = Math.sign(Math.cos(t)) * Math.pow(Math.abs(Math.cos(t)), 0.25) * (width / 2);
    const cn = Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.35) * (thick / 2);
    cs.push([cx, cn]);
  }
  const M = cs.length;
  let len = 0;
  for (let i = 0; i <= SEG; i++) {
    const p = ring[i], q = ring[(i + 1) % SEG], o = ring[(i - 1 + SEG) % SEG];
    const ty = q[0] - o[0], tz = q[1] - o[1], tl = Math.hypot(ty, tz);
    const ny = -tz / tl, nz = ty / tl; // outward normal in the y-z plane
    if (i) len += Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]);
    for (let k = 0; k <= M; k++) {
      const [cx, cn] = cs[k % M];
      pos.push(cx, p[0] + ny * cn, p[1] + nz * cn);
      const tt = (k / M) * TAU;
      const nnx = Math.cos(tt), nnn = Math.sin(tt), l = Math.hypot(nnx, nnn);
      nor.push(nnx / l, (ny * nnn) / l, (nz * nnn) / l);
      uv.push(len * 1.4, k / M);
    }
  }
  for (let i = 0; i < SEG; i++) for (let k = 0; k < M; k++) {
    const a0 = i * (M + 1) + k, b0 = a0 + M + 1;
    idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  let mat;
  if (spec.family === 'loop') {
    const n = T.weave.normal.clone(); n.repeat.set(1.6, 0.55); n.needsUpdate = true;
    const ao = T.weave.ao.clone(); ao.repeat.set(1.6, 0.55); ao.needsUpdate = true;
    mat = new THREE.MeshPhysicalMaterial({ color: spec.color, map: ao, normalMap: n, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.95, sheen: 0.35, sheenColor: new THREE.Color(spec.color).lerp(new THREE.Color('#ffffff'), 0.25), sheenRoughness: 0.6 });
  } else if (spec.family === 'active') {
    const n = T.rib.normal.clone(); n.repeat.set(3, 1); n.needsUpdate = true;
    mat = new THREE.MeshPhysicalMaterial({ color: spec.color, normalMap: n, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  } else {
    mat = new THREE.MeshPhysicalMaterial({ color: spec.color, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  }
  const group = new THREE.Group();
  const band = new THREE.Mesh(geo, mat);
  group.add(band);
  if (spec.buckle) {
    // a slim rounded-rectangle loop the strap passes through, placed low on one side of the loop
    const bm = new THREE.MeshStandardMaterial({ color: spec.buckle, metalness: spec.bmetal, roughness: 0.22 });
    const hw = width / 2 + 0.09, hh = thick / 2 + 0.1, rr = 0.08, pts = [];
    for (let k = 0; k < 4; k++) {
      const cx = (k === 0 || k === 3 ? 1 : -1) * (hw - rr), cy = (k < 2 ? 1 : -1) * (hh - rr);
      for (let q = 0; q <= 6; q++) { const a = (k * Math.PI) / 2 + (q / 6) * (Math.PI / 2); pts.push(new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0)); }
    }
    const frame = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.035, 10, true), bm);
    const i = Math.round(SEG * 0.68), p = ring[i], q = ring[i + 1];
    const holder = new THREE.Group();
    holder.position.set(0, p[0], p[1]);
    holder.rotation.x = -Math.atan2(q[0] - p[0], q[1] - p[1]);
    holder.add(frame); group.add(holder);
  }
  // pod seat: the pod sits inside the loop at the top, long axis along z
  const seat = new THREE.Group();
  seat.position.set(0, ry - thick / 2 - POD.top - 0.02, 0);
  seat.rotation.y = Math.PI / 2;
  group.add(seat);
  return { group, band, seat, mat, spec };
}

// ---------- charger ----------
export function makeCharger() {
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: '#f4f4f2', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const head = new THREE.Mesh(superellipsoid({ a: 1.6, b: 1.05, top: 0.42, bottom: 0.42, m: 2.6, n: 3.2, U: 96, V: 48 }), white);
  g.add(head);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.55, 0, 0), new THREE.Vector3(3.2, -0.2, 0), new THREE.Vector3(5.5, -1.5, 0.8), new THREE.Vector3(8, -3.5, 2.5), new THREE.Vector3(11, -6, 4)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.11, 16, false), white));
  const pinMat = new THREE.MeshStandardMaterial({ color: '#C9A45C', metalness: 1, roughness: 0.3 });
  [-1.05, 1.05].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), pinMat); p.position.set(x, 0.42, 0); g.add(p); });
  return g;
}

export function glowSprite(color = '#ffffff', size = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex().glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}
