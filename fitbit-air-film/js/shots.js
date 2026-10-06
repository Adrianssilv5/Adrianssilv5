// The sixteen shots of the film. Each shot owns a scene + camera, an update(τ) for 3D and a ui(τ) for type.
// Cuts land on bar lines of the 120 BPM score (one bar = 2 s).
import * as THREE from 'three';
import { W, H, TAU, clamp, lerp, seg, pulse, ease, ppg, hash, rng, makeCanvas } from './util.js';
import { makePod, makeExploded, makeBand, makeCharger, glowSprite, fabricNormal, POD } from './models.js';
import { toScreen } from './stage.js';

const LIGHT = '#F5F5F7', DARK = '#1D1D1F', GREY_D = 'rgba(245,245,247,0.66)', GREY_L = 'rgba(29,29,31,0.62)';
const deg = (d) => (d * Math.PI) / 180;
const camera = (fov = 24) => new THREE.PerspectiveCamera(fov, W / H, 0.05, 600);
function orbit(cam, { r, az, el, target = [0, 0, 0], fov }) {
  const [tx, ty, tz] = target;
  cam.position.set(tx + r * Math.cos(el) * Math.sin(az), ty + r * Math.sin(el), tz + r * Math.cos(el) * Math.cos(az));
  cam.lookAt(tx, ty, tz);
  if (fov && cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}
function scene(bg, env, envI = 1) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  if (env) { s.environment = env; s.environmentIntensity = envI; }
  return s;
}
function keyLights(s, { key = 1.4, rim = 1.2, fill = 0.25 } = {}) {
  const k = new THREE.DirectionalLight('#ffffff', key); k.position.set(4, 7, 5); s.add(k);
  const r = new THREE.DirectionalLight('#dfe6ff', rim); r.position.set(-5, 3, -6); s.add(r);
  const a = new THREE.AmbientLight('#ffffff', fill); s.add(a);
  return { k, r, a };
}
function contactShadow(size = 5, opacity = 0.35) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(0,0,0,${opacity})`); gr.addColorStop(0.45, `rgba(0,0,0,${opacity * 0.45})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.55), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}
const rings2D = (u, [x, y], τ, starts, { color = '255,255,255', max = 120, dur = 0.7, w = 2, squash = 0.42 } = {}) => {
  const g = u.g;
  starts.forEach((s0) => {
    const p = seg(τ, s0, s0 + dur);
    if (p <= 0 || p >= 1) return;
    g.save(); g.strokeStyle = `rgba(${color},${(1 - p) * 0.9})`; g.lineWidth = w;
    g.beginPath(); g.ellipse(x, y, 12 + max * ease.out(p), (12 + max * ease.out(p)) * squash, 0, 0, TAU); g.stroke(); g.restore();
  });
};
const scrim = (u, y0, y1, a0, a1) => { const g = u.g, sc = g.createLinearGradient(0, y0, 0, y1); sc.addColorStop(0, `rgba(0,0,0,${a0})`); sc.addColorStop(1, `rgba(0,0,0,${a1})`); g.fillStyle = sc; g.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0)); };
const mixHex = (a, b, p) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(p)).getHexString();

// ---- one type system: Title 160 / Stat 150 / Section 96, two lockups ----
function lockBottom(u, τ, head, sub, { at = 0.15, subAt = at + 0.5, out = 3.95, color = LIGHT, subColor = GREY_D, align = 'left', maxW = 1600 } = {}) {
  const c = align === 'center';
  u.headline(head, { x: c ? 960 : 160, y: 880, size: 96, align, color, t: τ, at, out, maxW: 1700 });
  if (sub) u.text(sub, { x: c ? 960 : 164, y: 950, size: 34, align, color: subColor, t: τ, at: subAt, out, maxW });
}
function lockTop(u, τ, head, sub, { at = 0.1, subAt = at + 0.5, out = 3.95, color = LIGHT, subColor = GREY_D, align = 'left', maxW = 1600 } = {}) {
  const c = align === 'center';
  u.headline(head, { x: c ? 960 : 160, y: 230, size: 96, align, color, t: τ, at, out, maxW: 1700 });
  if (sub) u.text(sub, { x: c ? 960 : 164, y: 300, size: 34, align, color: subColor, t: τ, at: subAt, out, maxW });
}
function title(u, τ, { at, subAt, out = null }) {
  u.headline('Fitbit Air', { x: 960, y: 820, size: 160, align: 'center', t: τ, at, out, track: -0.035 });
  u.text('All signal. No screen.', { x: 960, y: 890, size: 40, align: 'center', color: GREY_D, t: τ, at: subAt, out });
}

// ---------------------------------------------------------------- 1. First light (0-4)
function shotFirstLight(ctx) {
  const s = scene('#000000', ctx.studio, 0.28), cam = camera(17);
  keyLights(s, { key: 0.0, rim: 0.0, fill: 0.0 });
  const pod = makePod(); pod.group.rotation.y = Math.PI; s.add(pod.group);
  pod.ledGlow.scale.setScalar(0.42);
  const rim = new THREE.DirectionalLight('#ffffff', 0); rim.position.set(0, 3, -5); s.add(rim);
  const ledLight = new THREE.PointLight('#ffffff', 0, 2, 2); ledLight.position.set(0.55, 0.05, 1.0); s.add(ledLight);
  return {
    start: 0, end: 4, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: lerp(11.5, 10.6, ease.sine(seg(τ, 0, 4))), az: deg(lerp(14, 8, τ / 4)), el: deg(24), target: [0.1, -0.35, 0] });
      rim.intensity = 2.6 * ease.out(seg(τ, 0, 1.6));
      s.environmentIntensity = 0.05 + 0.3 * ease.out(seg(τ, 0.2, 2.2));
      const led = ease.out(seg(τ, 2.45, 2.65)) * (1 - 0.35 * seg(τ, 3.0, 3.8));
      pod.setLED('#ffffff', led); ledLight.intensity = led * 1.2;
    },
    ui(u, τ) {
      const top = toScreen(new THREE.Vector3(0.1, POD.top, 0), cam);
      rings2D(u, top, τ, [1.5, 2.0], { max: 150 });
      lockBottom(u, τ, 'Nothing to see here.', 'No buttons. Just a double-tap.', { at: 0.4, subAt: 1.4, align: 'center' });
    },
  };
}

// ---------------------------------------------------------------- 2. Hero (4-8)
function shotHero(ctx) {
  const s = scene('#000000', ctx.studio, 0.75), cam = camera(20);
  keyLights(s, { key: 0.5, rim: 1.6, fill: 0.04 });
  const pod = makePod(); s.add(pod.group);
  const glow = glowSprite('#3a3f55', 12, 0.35); glow.position.set(0, -0.4, -4); s.add(glow);
  return {
    start: 4, end: 8, scene: s, camera: cam,
    update(τ) {
      const p = ease.sine(seg(τ, 0, 4));
      orbit(cam, { r: lerp(6.2, 9.6, p), az: deg(lerp(75, 40, p)), el: deg(lerp(2, 14, p)), target: [0, lerp(-0.3, -0.75, p), 0] });
      s.environmentRotation.set(0, lerp(-1.5, 1.3, ease.inOut(seg(τ, 0, 2.2))), 0);
      pod.group.rotation.y = lerp(0.25, -0.15, τ / 4);
      pod.group.position.y = 0.05 * Math.sin(τ * 1.6);
    },
    ui(u, τ) { title(u, τ, { at: 0.25, subAt: 0.8, out: 3.95 }); },
  };
}

// ---------------------------------------------------------------- 3. Scale (8-12)
function shotScale(ctx) {
  const s = scene('#F4F3F0', ctx.room, 0.9), cam = camera(14);
  keyLights(s, { key: 1.0, rim: 0.5, fill: 0.35 });
  const pod = makePod(); s.add(pod.group);
  const sh = contactShadow(6, 0.4); sh.position.y = -POD.bottom - 0.02; s.add(sh);
  return {
    start: 8, end: 12, scene: s, camera: cam,
    update(τ) {
      const p = ease.inOut(seg(τ, 1.4, 2.4));
      orbit(cam, { r: 17, az: 0, el: deg(lerp(89.5, 6, p)), target: [lerp(-1.0, -0.85, p), lerp(0, 0.25, p), lerp(-0.3, 0, p)], fov: 14 });
      sh.material.opacity = lerp(0.1, 1, p);
    },
    ui(u, τ) {
      const g = u.g;
      const P = (x, y, z) => toScreen(new THREE.Vector3(x, y, z), cam);
      const line = (a, b, label, at, out, side = 1) => {
        const k = ease.expo(seg(τ, at, at + 0.5)) * (out ? 1 - seg(τ, out - 0.25, out) : 1);
        if (k <= 0) return;
        g.save(); g.globalAlpha = k; g.strokeStyle = DARK; g.fillStyle = DARK; g.lineWidth = 1.5;
        const mx = lerp(a[0], b[0], 0.5), my = lerp(a[1], b[1], 0.5);
        const ex = lerp(mx, a[0], k), ey = lerp(my, a[1], k), fx = lerp(mx, b[0], k), fy = lerp(my, b[1], k);
        g.beginPath(); g.moveTo(ex, ey); g.lineTo(fx, fy); g.stroke();
        const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
        [[ex, ey], [fx, fy]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - (nx / nl) * 9, y - (ny / nl) * 9); g.lineTo(x + (nx / nl) * 9, y + (ny / nl) * 9); g.stroke(); });
        g.font = '500 22px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(label, mx + (nx / nl) * 40 * side, my + (ny / nl) * 40 * side);
        g.restore();
      };
      line(P(-POD.a, 0, POD.b + 0.35), P(POD.a, 0, POD.b + 0.35), '34.9 mm', 0.5, 1.5, -1);
      line(P(POD.a + 0.35, 0, -POD.b), P(POD.a + 0.35, 0, POD.b), '17 mm', 1.0, 1.5, 1);
      line(P(-POD.a - 0.45, -POD.bottom, 0), P(-POD.a - 0.45, POD.top, 0), '8.3 mm', 2.5, null, -1.45);
      u.headline('5.2 grams.', { x: 160, y: 300, size: 150, color: DARK, t: τ, at: 0.35, out: 3.95 });
      u.text('Google’s smallest, lightest tracker yet.', { x: 166, y: 380, size: 34, color: GREY_L, t: τ, at: 1.0, out: 3.95 });
      u.text('12 g with the band. Half the size of Inspire 3.*', { x: 166, y: 428, size: 34, color: GREY_L, t: τ, at: 2.6, out: 3.95 });
      u.footnote('*Per Google.', { t: τ, at: 2.6, out: 3.95, color: DARK, alpha: 0.5 });
    },
  };
}

// ---------------------------------------------------------------- 4. Exploded view (12-16)
function shotInside(ctx) {
  const s = scene('#F4F3F0', ctx.room, 0.55), cam = camera(25);
  keyLights(s, { key: 1.3, rim: 0.6, fill: 0.4 });
  const ex = makeExploded(); s.add(ex.group);
  ex.group.position.x = 0.2;
  const sh = contactShadow(6, 0.28); sh.position.set(0.2, -2.25, 0); s.add(sh);
  const OFF = { top: 1.75, motor: 1.0, battery: 0.45, pcb: -0.05, bottom: -0.75, sensor: -1.55 };
  const EDGE = { top: 1.5, motor: 0.22, battery: 0.85, pcb: 1.4, sensor: 0.6 };
  const LABEL = { top: 'Recycled polycarbonate + PBT', motor: 'Vibration motor', battery: 'Lithium-polymer battery', pcb: 'Sensors + Bluetooth 5.0', sensor: 'Optical sensor window' };
  let open = 0;
  return {
    start: 12, end: 16, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: 15.5, az: deg(lerp(32, 46, τ / 4)), el: deg(lerp(22, 18, τ / 4)), target: [-0.55, 0.05, 0], fov: lerp(25, 23.5, ease.sine(τ / 4)) });
      ex.parts.forEach((p, i) => {
        const o = ease.outBack(seg(τ, 0.05 + i * 0.22, 0.6 + i * 0.22), 1.3) * (1 - ease.inOut(seg(τ, 3.25, 3.7)));
        p.mesh.position.y = p.rest + OFF[p.key] * o;
        p.mesh.rotation.y = 0.15 * o * (i % 2 ? 1 : -1);
        if (i === 0) open = o;
      });
      sh.material.opacity = 1 - 0.6 * open;
    },
    ui(u, τ) {
      const at = { top: 0.7, motor: 0.95, battery: 1.2, pcb: 1.45, sensor: 1.7 };
      ex.parts.forEach((p) => {
        if (!LABEL[p.key]) return;
        const wp = new THREE.Vector3(); p.mesh.getWorldPosition(wp);
        const P = toScreen(wp.add(new THREE.Vector3(EDGE[p.key], 0, 0)), cam);
        u.callout(LABEL[p.key], P, { dx: 1406 - P[0], dy: 0, t: τ, at: at[p.key], out: 3.3, color: DARK, size: 22 });
      });
      u.headline('Small.\nNot simple.', { x: 160, y: 470, size: 96, color: DARK, t: τ, at: 0.2, out: 3.95 });
      u.footnote('Stylized illustration, not a teardown.', { t: τ, at: 0.6, out: 3.95, color: DARK, alpha: 0.5 });
    },
  };
}

// ---------------------------------------------------------------- 5. Sensors light up, dive in (16-20)
function gradientAlpha() {
  const c = makeCanvas(4, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#000'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c);
}
function shotSensors(ctx) {
  const s = scene('#000000', ctx.studio, 0.55), cam = camera(16);
  keyLights(s, { key: 0.6, rim: 1.0, fill: 0.03 });
  const pod = makePod(); pod.group.rotation.x = Math.PI; s.add(pod.group);
  pod.lens.material.color.set('#020203'); pod.lens.material.envMapIntensity = 0.12; pod.lens.material.clearcoat = 0.2; pod.lens.material.roughness = 0.2;
  const glows = { hr: [glowSprite('#9CFFD9', 0.38, 0), glowSprite('#9CFFD9', 0.38, 0)], red: glowSprite('#FF3D3D', 0.34, 0), ir: glowSprite('#B03CFF', 0.34, 0) };
  const place = (sp, x, z) => { sp.position.set(x, POD.bottom + 0.12, z); s.add(sp); };
  // the pod is flipped about X, so the red emitter (local z -0.2) sits at world z +0.2
  place(glows.hr[0], -0.12, 0); place(glows.hr[1], 0.12, 0); place(glows.red, 0, 0.2); place(glows.ir, 0, -0.2);
  const alpha = gradientAlpha();
  const cone = (color, tilt) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.2, 48, 1, true), new THREE.MeshBasicMaterial({ color, alphaMap: alpha, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.set(Math.PI, 0, tilt); m.position.y = POD.bottom + 1.6; s.add(m); return m;
  };
  const cones = { hr: cone('#59F2B8', 0), red: cone('#FF3D3D', -0.25), ir: cone('#9B3CFF', 0.25) };
  const flash = glowSprite('#7DFFC9', 2, 0); flash.position.set(0.12, POD.bottom + 0.4, 0); s.add(flash);
  return {
    start: 16, end: 20, scene: s, camera: cam,
    update(τ) {
      const dive = ease.inOut(seg(τ, 2.3, 3.8));
      const tgt = new THREE.Vector3(0, POD.bottom - 0.35, 0).lerp(new THREE.Vector3(0.12, POD.bottom, 0), dive);
      orbit(cam, { r: lerp(10.8, 0.7, dive), az: deg(lerp(24, 6, seg(τ, 0, 4))), el: deg(lerp(52, 88, ease.inOut(seg(τ, 0, 3.8)))), target: [tgt.x, tgt.y, tgt.z], fov: lerp(16, 55, dive) });
      cam.setViewOffset(W, H, 0, 130 * (1 - dive), W, H);
      s.environmentRotation.set(0, lerp(-0.8, 0.9, ease.inOut(seg(τ, 0, 1.2))), 0);
      const on = { hr: ease.out(seg(τ, 0.4, 0.6)), red: ease.out(seg(τ, 0.6, 0.8)), ir: ease.out(seg(τ, 0.8, 1.0)) };
      pod.setEmit('hr', on.hr); pod.setEmit('red', on.red); pod.setEmit('ir', on.ir); pod.setEmit('det', 0);
      const flick = (k, ph) => k * (0.75 + 0.25 * Math.sin(τ * 14 + ph));
      glows.hr.forEach((g, i) => { g.material.opacity = flick(on.hr, i); });
      glows.red.material.opacity = flick(on.red, 2); glows.ir.material.opacity = flick(on.ir, 3) * 0.8;
      const coneK = 0.6 * (1 - seg(τ, 2.3, 2.6));
      cones.hr.material.opacity = 0.09 * on.hr * coneK; cones.red.material.opacity = 0.08 * on.red * coneK; cones.ir.material.opacity = 0.07 * on.ir * coneK;
      flash.material.opacity = ease.in(seg(τ, 3.4, 4.0)); flash.scale.setScalar(lerp(2, 9, ease.in(seg(τ, 3.4, 4.0))));
    },
    ui(u, τ) {
      const P = (x, z, y = POD.bottom + 0.05) => toScreen(new THREE.Vector3(x, y, z), cam);
      const col = (p, side) => ({ dx: (side > 0 ? 1326 : 594) - p[0], dy: clamp(p[1] - 140, 260, 800) - p[1] });
      const hr = P(0.12, 0), rd = P(0, 0.2);
      u.callout('Optical heart rate', hr, { ...col(hr, 1), t: τ, at: 0.4, out: 2.3, size: 22 });
      u.callout('Red + infrared (SpO2)', rd, { ...col(rd, -1), t: τ, at: 0.6, out: 2.3, size: 22 });
      lockBottom(u, τ, 'It reads you in light.', 'Plus an accelerometer, gyroscope and temperature sensor inside.', { at: 0.1, subAt: 0.8, out: 2.3, align: 'center' });
      u.footnote('Stylized illustration, not the actual sensor layout.', { t: τ, at: 0.6, out: 2.3 });
      u.fill('#C9FFE9', ease.in(seg(τ, 3.55, 4.0)) * 0.85);
    },
  };
}

// ---------------------------------------------------------------- 6. Rhythm, checked quietly (20-22)
function shotRhythm() {
  const s = scene('#000000'), cam = camera(30); cam.position.set(0, 0, 10);
  return {
    start: 20, end: 22, scene: s, camera: cam,
    update() {},
    ui(u, τ) {
      const g = u.g, y0 = 720, x0 = 160, x1 = 1760, period = 200, A = 170;
      const scan = lerp(x0, x1 + 40, seg(τ, 0.15, 1.85));
      g.save();
      const line = (alpha, w, blur) => {
        g.beginPath();
        for (let x = x0; x <= x1; x += 2) { const v = ppg((x - x0) / period + 0.02); g.lineTo(x, y0 - v * A); }
        g.strokeStyle = `rgba(92,255,200,${alpha})`; g.lineWidth = w; g.shadowColor = 'rgba(92,255,200,0.8)'; g.shadowBlur = blur; g.stroke();
      };
      line(0.22, 2, 0);
      g.save(); g.beginPath(); g.rect(0, 0, scan, H); g.clip(); line(1, 3, 16); g.restore();
      g.shadowBlur = 0;
      for (let k = 0; k < 8; k++) {
        const pa = x0 + (k + 0.16) * period, pb = pa + period;
        if (pb > x1 || scan < pb) continue;
        const a = seg(scan, pb, pb + 60);
        g.strokeStyle = `rgba(245,245,247,${0.7 * a})`; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(pa, y0 - A - 40); g.lineTo(pb, y0 - A - 40); g.stroke();
        [pa, pb].forEach((x) => { g.beginPath(); g.moveTo(x, y0 - A - 50); g.lineTo(x, y0 - A - 30); g.stroke(); });
      }
      const top = y0 - A - 90, hgt = A + 160;
      const sg = g.createLinearGradient(scan - 140, 0, scan, 0); sg.addColorStop(0, 'rgba(92,255,200,0)'); sg.addColorStop(1, 'rgba(92,255,200,0.3)');
      g.fillStyle = sg; g.fillRect(scan - 140, top, 140, hgt);
      const fg = g.createLinearGradient(0, top, 0, top + hgt); fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(0.25, 'rgba(0,0,0,0)'); fg.addColorStop(0.75, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = fg; g.fillRect(scan - 142, top, 146, hgt);
      g.fillStyle = 'rgba(200,255,235,0.9)'; g.fillRect(scan - 1, top + hgt * 0.2, 2, hgt * 0.6);
      g.restore();
      u.fill('#C9FFE9', 0.85 * (1 - ease.out(seg(τ, 0, 0.45))));
      lockTop(u, τ, 'Rhythm, checked quietly.', 'Background AFib alerts in the Google Health app.*', { at: 0.05, subAt: 0.4, out: 1.97, align: 'center' });
      u.footnote('*Irregular rhythm notifications are not available in all regions. Not a diagnosis.', { t: τ, at: 0.5, out: 1.97 });
    },
  };
}

// ---------------------------------------------------------------- shared: the pulse ocean
const OCEAN_VS = `
uniform float uTime; uniform float uAmp; uniform float uSize; uniform float uSpeed;
varying float vH; varying float vFade;
float ppg(float x){ float f = fract(x); return exp(-pow((f-0.18)/0.075,2.0)) + 0.38*exp(-pow((f-0.42)/0.09,2.0)); }
void main(){
  vec3 p = position;
  float w = ppg(p.z*0.045 + uTime*uSpeed + sin(p.x*0.06)*0.08);
  p.y += uAmp * (w*1.9 + 0.18*sin(p.x*0.35+uTime*1.1)*cos(p.z*0.21+uTime*0.7));
  vH = w;
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  gl_PointSize = uSize * (260.0 / -mv.z) * (0.55 + 0.75*w);
  vFade = smoothstep(150.0, 12.0, -mv.z) * smoothstep(0.5, 4.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const OCEAN_FS = `
uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity;
varying float vH; varying float vFade;
void main(){
  vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.0, r);
  vec3 col = mix(uColor2, uColor, clamp(vH, 0.0, 1.0));
  gl_FragColor = vec4(col, a * uOpacity * vFade * (0.3 + 0.7*vH));
}`;
function makeOcean() {
  const NX = 300, NZ = 260, pos = new Float32Array(NX * NZ * 3);
  let k = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    pos[k++] = (i / (NX - 1) - 0.5) * 120 + (hash(i * 7 + j) - 0.5) * 0.12;
    pos[k++] = 0;
    pos[k++] = -150 + (j / (NZ - 1)) * 160;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: OCEAN_VS, fragmentShader: OCEAN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 1.6 }, uSize: { value: 1.6 }, uSpeed: { value: 1 }, uColor: { value: new THREE.Color('#5CFFC8') }, uColor2: { value: new THREE.Color('#0E6B53') }, uOpacity: { value: 1 } },
  });
  return { points: new THREE.Points(g, mat), mat };
}
const starTexture = (() => { let t = null; return () => { if (t) return t; const c = makeCanvas(64, 64), x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
function makeStars(n = 2600, seed = 5, size = 2.4) {
  const r = rng(seed), pos = new Float32Array(n * 3), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const az = r() * TAU, el = Math.asin(r() * 0.98), R = 120;
    pos[i * 3] = base[i * 3] = Math.cos(el) * Math.sin(az) * R;
    pos[i * 3 + 1] = base[i * 3 + 1] = Math.sin(el) * R * 0.9 + 2;
    pos[i * 3 + 2] = base[i * 3 + 2] = -Math.cos(el) * Math.cos(az) * R;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: starTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#EAF0FF', sizeAttenuation: true, opacity: 0 });
  return { points: new THREE.Points(g, mat), mat, base, geo: g };
}
const OCEAN_END = { pos: [Math.sin(1.2) * 1.2, 8.5, 3] };

// ---------------------------------------------------------------- 7. Pulse becomes ocean (22-26)
function shotOcean() {
  const s = scene('#000000'), cam = camera(48);
  s.fog = new THREE.FogExp2('#000000', 0.012);
  const oc = makeOcean(); s.add(oc.points);
  return {
    start: 22, end: 26, scene: s, camera: cam,
    update(τ, t) {
      oc.mat.uniforms.uTime.value = t; oc.mat.uniforms.uAmp.value = 1.6;
      cam.position.set(Math.sin(τ * 0.3) * 1.2, lerp(7.5, 8.5, ease.sine(seg(τ, 0, 4))) + 0.2 * Math.sin(τ * TAU * 0.5), lerp(8, 3, τ / 4));
      cam.lookAt(0, -3.5, -30);
      oc.mat.uniforms.uOpacity.value = ease.out(seg(τ, 0, 0.5));
    },
    ui(u, τ) {
      scrim(u, 700, H, 0, 0.85);
      lockBottom(u, τ, 'Your heart. Day and night.', '24/7 heart rate, plus resting heart rate and HRV.', { at: 0.45, subAt: 1.0, align: 'center' });
    },
  };
}

// ---------------------------------------------------------------- 8. Blood oxygen, while you sleep (26-30)
function shotSpO2() {
  const s = scene('#000000'), cam = camera(48);
  s.fog = new THREE.FogExp2('#000000', 0.012);
  const oc = makeOcean(); s.add(oc.points);
  const st = makeStars(2600, 9); s.add(st.points);
  const moon = glowSprite('#E9EEFF', 9, 0); moon.position.set(30, 30, -100); s.add(moon);
  const moonCore = glowSprite('#ffffff', 1.6, 0); moonCore.position.copy(moon.position); s.add(moonCore);
  const C = { em: new THREE.Color('#5CFFC8'), red: new THREE.Color('#FF3D57'), plum: new THREE.Color('#9A3CFF'), ind: new THREE.Color('#2A3A8C') };
  return {
    start: 26, end: 30, scene: s, camera: cam,
    update(τ, t) {
      const a = seg(τ, 0, 1.2), b = seg(τ, 1.2, 2.4), c = seg(τ, 2.2, 3.6);
      const col = C.em.clone().lerp(C.red, ease.inOut(a)).lerp(C.plum, ease.inOut(b)).lerp(C.ind, ease.inOut(c));
      oc.mat.uniforms.uColor.value.copy(col); oc.mat.uniforms.uColor2.value.copy(col).multiplyScalar(0.25);
      oc.mat.uniforms.uTime.value = t; oc.mat.uniforms.uSpeed.value = lerp(1, 0.45, seg(τ, 0.5, 3.5));
      oc.mat.uniforms.uAmp.value = 1.6 * lerp(1, 0.08, ease.inOut(seg(τ, 0.8, 3.6)));
      oc.mat.uniforms.uOpacity.value = lerp(1, 0.75, seg(τ, 2, 4));
      // starts exactly where the ocean shot ended, then tilts up to the sky
      const tilt = ease.inOut(seg(τ, 0.6, 4));
      cam.position.set(lerp(OCEAN_END.pos[0], 0, tilt), lerp(OCEAN_END.pos[1], 4.0, tilt), lerp(OCEAN_END.pos[2], 0, τ / 4));
      cam.lookAt(0, lerp(-3.5, 14, tilt), lerp(-30, -60, tilt));
      st.mat.opacity = ease.out(seg(τ, 1.4, 3.4)) * 0.95;
      moon.material.opacity = ease.out(seg(τ, 2.0, 3.6)) * 0.35; moonCore.material.opacity = ease.out(seg(τ, 2.0, 3.6));
    },
    ui(u, τ) {
      const g = u.g, sc = g.createLinearGradient(0, 680, 0, H); sc.addColorStop(0, 'rgba(0,0,0,0)'); sc.addColorStop(0.35, 'rgba(0,0,0,0.85)'); sc.addColorStop(1, 'rgba(0,0,0,0.92)');
      g.fillStyle = sc; g.fillRect(0, 680, W, H - 680);
      lockBottom(u, τ, 'Blood oxygen, while you sleep.', 'Red and infrared sensors estimate SpO2 overnight.*', { at: 0.2, subAt: 0.8, align: 'center' });
      u.footnote('*SpO2 is not available in all regions.', { t: τ, at: 0.9, out: 3.95 });
    },
  };
}

// ---------------------------------------------------------------- 9. Your night, in constellations (30-34)
function shotSleep() {
  const s = scene('#03040C'), cam = camera(40); cam.position.set(0, 0, 0); cam.lookAt(0, 0, -1);
  const st = makeStars(2400, 9); s.add(st.points); st.mat.opacity = 0.45;
  const moon = glowSprite('#E9EEFF', 9, 0.35); moon.position.set(29, 8, -100); s.add(moon);
  const moonCore = glowSprite('#ffffff', 1.6, 1); moonCore.position.copy(moon.position); s.add(moonCore);
  // illustrative hypnogram: deep sleep early, REM growing toward morning
  const levels = [0, 2, 3, 3, 2, 1, 2, 3, 2, 1, 2, 2, 1, 0, 2, 1, 2, 1, 0];
  const pathPts = [], X0 = -27, X1 = 27, Z = -60, LY = (l) => 7.6 - l * 4.5;
  levels.forEach((l, i) => {
    const xa = lerp(X0, X1, i / levels.length), xb = lerp(X0, X1, (i + 1) / levels.length);
    pathPts.push(new THREE.Vector3(xa, LY(l), Z), new THREE.Vector3(xb, LY(l), Z));
  });
  const curve = new THREE.CurvePath(); for (let i = 0; i < pathPts.length - 1; i++) curve.add(new THREE.LineCurve3(pathPts[i], pathPts[i + 1]));
  const N = 260, targets = curve.getSpacedPoints(N - 1);
  // the path stars: brighter points that leave the sky and settle onto the hypnogram
  const pp = new Float32Array(N * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const path = new THREE.Points(pg, new THREE.PointsMaterial({ size: 3.2, map: starTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#DDE4FF', opacity: 1 }));
  s.add(path);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(targets);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#AFC0FF', transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  s.add(line);
  return {
    start: 30, end: 34, scene: s, camera: cam,
    update(τ) {
      const mk = 1 - seg(τ, 0.6, 1.4); moon.material.opacity = 0.35 * mk; moonCore.material.opacity = mk;
      st.points.scale.setScalar(1 + 0.012 * Math.sin(τ * TAU * 0.5));
      for (let i = 0; i < N; i++) {
        const p = ease.inOut(seg(τ, (i / N) * 0.6, 1.0 + (i / N) * 0.6));
        pp[i * 3] = lerp(st.base[i * 3], targets[i].x, p); pp[i * 3 + 1] = lerp(st.base[i * 3 + 1], targets[i].y, p); pp[i * 3 + 2] = lerp(st.base[i * 3 + 2], targets[i].z, p);
      }
      pg.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, Math.floor(N * ease.inOut(seg(τ, 0.5, 1.9))));
      line.material.opacity = 0.8 * seg(τ, 0.5, 0.8);
      cam.rotation.z = deg(lerp(-2.5, 1.5, τ / 4));
      cam.position.z = lerp(0, -6, ease.sine(τ / 4));
    },
    ui(u, τ) {
      const g = u.g;
      const lab = (txt, l) => { const p = toScreen(new THREE.Vector3(X0 - 1.5, LY(l), Z), cam); u.text(txt, { x: p[0], y: p[1] + 7, size: 19, align: 'right', color: 'rgba(200,210,255,0.75)', t: τ, at: 0.9 + l * 0.1, out: 3.95, rise: 0 }); };
      ['Awake', 'REM', 'Light', 'Deep'].forEach(lab);
      const k = ease.expo(seg(τ, 1.9, 2.9)), fade = 1 - seg(τ, 3.65, 3.95);
      if (k > 0) {
        const cy = 160, cols = [660, 960, 1260];
        g.save(); g.globalAlpha = fade;
        g.lineWidth = 7; g.lineCap = 'round';
        g.strokeStyle = 'rgba(175,192,255,0.18)'; g.beginPath(); g.arc(cols[0], cy, 42, 0, TAU); g.stroke();
        g.strokeStyle = '#AFC0FF'; g.beginPath(); g.arc(cols[0], cy, 42, -Math.PI / 2, -Math.PI / 2 + TAU * 0.86 * k); g.stroke();
        g.globalAlpha = fade * seg(τ, 2.2, 2.6); g.lineWidth = 2.5; g.beginPath();
        for (let x = -70; x <= 70; x += 3) g.lineTo(cols[1] + x, cy + Math.sin((x / 140) * TAU * 1.5 + τ * 2) * 16 * k);
        g.stroke();
        g.globalAlpha = fade * seg(τ, 2.5, 2.9);
        g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,179,107,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cols[2] - 70, cy); g.lineTo(cols[2] + 70, cy); g.stroke();
        g.setLineDash([]); g.strokeStyle = '#FFB36B'; g.lineWidth = 2.5; g.beginPath();
        for (let x = 0; x <= 140 * k; x += 3) g.lineTo(cols[2] - 70 + x, cy - Math.sin(x / 26) * 9 - x * 0.04);
        g.stroke(); g.restore();
        [['Sleep Score', 1.9], ['Breathing rate', 2.2], ['Skin temperature variation', 2.5]].forEach(([l, at], i) =>
          u.text(l, { x: cols[i], y: cy + 78, size: 20, weight: 500, align: 'center', color: i === 2 ? 'rgba(255,200,150,0.9)' : 'rgba(200,210,255,0.85)', t: τ, at, out: 3.95, rise: 0 }));
      }
      lockBottom(u, τ, 'Your night, in constellations.', 'Sleep stages, Sleep Score, breathing rate and skin temperature variation.', { at: 0.3, subAt: 0.9, align: 'center', maxW: 1700 });
    },
  };
}

// ---------------------------------------------------------------- 10. Smart Wake (34-38)
function gradientBG(top, bottom) {
  const c = makeCanvas(4, 512), g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const paint = (t0, b0) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, t0); gr.addColorStop(1, b0); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); tex.needsUpdate = true; };
  paint(top, bottom);
  return { tex, paint };
}
function shotWake(ctx) {
  const bg = gradientBG('#0A0F2C', '#1b1d3d');
  const s = scene('#000'), cam = camera(26); s.background = bg.tex; s.environment = ctx.room; s.environmentIntensity = 0.25;
  const L = keyLights(s, { key: 0.5, rim: 0.4, fill: 0.1 });
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshPhysicalMaterial({ color: '#d9dbe6', roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff'), normalMap: fabricNormal(10, 6), normalScale: new THREE.Vector2(0.25, 0.25) }));
  pillow.scale.set(30, 1.6, 18); pillow.position.y = -3.75; s.add(pillow);
  const band = makeBand('lavender'); const pod = makePod(); band.seat.add(pod.group);
  band.group.rotation.set(0, deg(-30), 0); band.group.position.set(0, 0.1, 0); s.add(band.group);
  const sh = contactShadow(7, 0.35); sh.position.set(0, -2.13, 0); s.add(sh);
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 160), new THREE.MeshBasicMaterial({ color: '#E8823A', transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = Math.PI / 2; s.add(m); return m; });
  const wakeAt = [1.0, 1.5, 2.0];
  return {
    start: 34, end: 38, scene: s, camera: cam,
    update(τ) {
      const d = ease.inOut(seg(τ, 0.2, 2.6));
      bg.paint(mixHex('#0A0F2C', '#F2B37A', d), mixHex('#1b1d3d', '#FCE6CF', d));
      L.k.intensity = lerp(0.4, 2.2, d); L.k.color.set(mixHex('#8EA2FF', '#FFD2A1', d)); L.a.intensity = lerp(0.08, 0.5, d);
      s.environmentIntensity = lerp(0.2, 0.9, d);
      const shake = wakeAt.reduce((acc, a0) => acc + pulse(τ, a0, a0 + 0.18), 0) * (τ < 2.75 ? 1 : 0);
      orbit(cam, { r: lerp(24, 21, ease.sine(τ / 4)), az: deg(28) + shake * 0.004, el: deg(24) + shake * 0.004, target: [-3.2, -0.6, 0] });
      rings.forEach((m, i) => {
        const p = seg(τ, wakeAt[i], wakeAt[i] + 0.9);
        const stop = τ > 2.7 ? 1 - seg(τ, 2.7, 2.9) : 1;
        m.material.opacity = (p > 0 && p < 1 ? (1 - p) * 0.4 : 0) * stop;
        m.scale.setScalar(lerp(2.4, 3.4, ease.out(p)));
        m.position.set(0, -1.2, 0);
      });
    },
    ui(u, τ) {
      const g = u.g, d = ease.inOut(seg(τ, 0.2, 2.6));
      const ink = mixHex(LIGHT, DARK, seg(d, 0.3, 0.7));
      const k = ease.expo(seg(τ, 0.3, 1.0)), fade = 1 - seg(τ, 2.45, 2.7);
      if (k > 0 && fade > 0) {
        const x0 = 1140, x1 = 1700, y = 220;
        g.save();
        g.strokeStyle = ink; g.globalAlpha = fade * k * 0.3; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
        g.globalAlpha = fade * k;
        g.strokeStyle = '#E8823A'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, 0.6 * ease.out(seg(τ, 0.4, 1.0))), y); g.stroke();
        g.fillStyle = '#E8823A'; g.beginPath(); g.arc(lerp(x0, x1, 0.6), y, 9 * seg(τ, 0.9, 1.0), 0, TAU); g.fill();
        g.font = '500 20px Inter'; g.fillStyle = ink; g.textAlign = 'center';
        g.fillText('6:30', x0, y + 40); g.fillText('7:00 alarm', x1, y + 40);
        g.font = '600 20px Inter'; g.fillText('Lighter sleep · 6:48', lerp(x0, x1, 0.6), y - 26);
        g.restore();
      }
      const tap = toScreen(new THREE.Vector3(0, 2.35, 0), this.camera);
      rings2D(u, tap, τ, [2.75, 3.0], { color: '29,29,31', max: 90 });
      u.text('Double-tap to stop.', { x: 1420, y: 228, size: 26, align: 'center', color: DARK, t: τ, at: 2.8, out: 3.95 });
      lockBottom(u, τ, 'A quieter way to wake.', 'Smart Wake vibrates in lighter sleep, up to 30 minutes before your alarm.', { at: 0.2, subAt: 0.8, color: DARK, subColor: GREY_L });
    },
  };
}

// ---------------------------------------------------------------- 11. Readiness, then Coach (38-42)
function shotCoach(ctx) {
  const s = scene('#141A2E', ctx.studio, 0.6), cam = camera(22);
  keyLights(s, { key: 0.5, rim: 1.2, fill: 0.05 });
  const halo = glowSprite('#2a4a86', 26, 0.45); halo.position.set(2, 0, -8); s.add(halo);
  return {
    start: 38, end: 42, scene: s, camera: cam,
    update(τ) { orbit(cam, { r: 16, az: 0, el: deg(4), target: [0, 0, 0] }); halo.position.x = lerp(3, -1, τ / 4); },
    ui(u, τ) {
      const g = u.g;
      // Readiness dial: a lower morning score (illustrative), so the Coach's advice follows from it
      const rk = ease.expo(seg(τ, 0.1, 1.2)), rOut = 1 - seg(τ, 1.6, 1.85);
      if (rOut > 0) {
        const cx = 1240, cy = 470, R = 190;
        g.save(); g.globalAlpha = rOut;
        ['HRV', 'Sleep', 'Resting heart rate'].forEach((lab, i) => {
          const sy = 290 + i * 180, p = ease.inOut(seg(τ, 0.05 + i * 0.1, 0.9 + i * 0.1));
          const ex = lerp(560, cx - R - 28, p), ey = lerp(sy, cy - 24 + i * 24, p * p);
          g.strokeStyle = ['#5CE1FF', '#8F7CFF', '#FF6B8B'][i]; g.lineWidth = 3;
          g.beginPath(); g.moveTo(560, sy); g.bezierCurveTo(lerp(560, ex, 0.5), sy, lerp(560, ex, 0.5), ey, ex, ey); g.stroke();
          if (p > 0.98) { g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(ex, ey, 6, 0, TAU); g.fill(); }
          g.font = '500 20px Inter'; g.fillStyle = g.strokeStyle; g.textAlign = 'right'; g.fillText(lab, 540, sy + 7);
        });
        g.lineWidth = 16; g.lineCap = 'round';
        g.strokeStyle = 'rgba(245,245,247,0.12)'; g.beginPath(); g.arc(cx, cy, R, deg(135), deg(405)); g.stroke();
        const grd = g.createLinearGradient(cx - R, cy, cx + R, cy); grd.addColorStop(0, '#FFD60A'); grd.addColorStop(1, '#FF9F0A');
        g.strokeStyle = grd; g.beginPath(); g.arc(cx, cy, R, deg(135), deg(135) + deg(270) * 0.58 * rk); g.stroke();
        g.fillStyle = LIGHT; g.textAlign = 'center'; g.font = '600 120px "Inter Tight"'; g.fillText(String(Math.round(58 * rk)), cx, cy + 40);
        g.font = '500 24px Inter'; g.fillStyle = GREY_D; g.fillText('Readiness  ·  out of 100', cx, cy + 92);
        g.restore();
      }
      lockBottom(u, τ, 'Know when to ease off.', 'Daily Readiness. No subscription needed.', { at: 0.05, subAt: 0.5, out: 1.75 });
      // Ask Coach
      const ck = ease.expo(seg(τ, 1.75, 2.3));
      if (ck > 0) {
        const fade = 1 - seg(τ, 3.7, 3.97), px = 960 - 430, py = 220 + (1 - ck) * 40, pw = 860, ph = 360;
        g.save(); g.globalAlpha = fade * ck;
        g.fillStyle = 'rgba(255,255,255,0.08)'; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1.5;
        g.beginPath(); g.roundRect(px, py, pw, ph, 36); g.fill(); g.stroke();
        g.font = '600 22px Inter'; g.fillStyle = LIGHT; g.textAlign = 'left'; g.fillText('Ask Coach', px + 40, py + 56);
        g.font = '500 18px Inter'; g.fillStyle = 'rgba(245,245,247,0.5)'; g.textAlign = 'right'; g.fillText('Illustrative conversation', px + pw - 40, py + 56);
        const bubble = (txt, at, typeDur, mine, y) => {
          const p = ease.expo(seg(τ, at, at + 0.4));
          if (p <= 0) return;
          const shown = txt.slice(0, Math.ceil(txt.length * clamp((τ - at) / typeDur)));
          g.font = '400 28px Inter';
          const full = u.wrap(txt, 600), lines = u.wrap(shown, 600);
          const bw = Math.max(...full.map((l) => g.measureText(l).width)) + 56, bh = full.length * 38 + 34;
          const bx = mine ? px + pw - 40 - bw : px + 40;
          g.globalAlpha = fade * p;
          g.fillStyle = mine ? '#0A84FF' : 'rgba(255,255,255,0.14)';
          g.beginPath(); g.roundRect(bx, y + (1 - p) * 18, bw, bh, 24); g.fill();
          g.fillStyle = LIGHT; g.textAlign = 'left';
          lines.forEach((l, i) => g.fillText(l, bx + 28, y + (1 - p) * 18 + 46 + i * 38));
        };
        bubble('Slept badly. Run today?', 1.9, 0.3, true, py + 96);
        bubble('Readiness is lower than usual. Try an easy 30-minute run instead.', 2.2, 0.6, false, py + 196);
        g.restore();
      }
      lockBottom(u, τ, 'Your data, in conversation.', 'Google Health Coach, built with Gemini. With Premium.*', { at: 1.85, subAt: 2.2, out: 3.97 });
      u.footnote('*Requires Google Health Premium: 3 months included, then $9.99/mo. 18+, select countries. AI responses can be inaccurate.', { t: τ, at: 2.2, out: 3.97 });
    },
  };
}

// ---------------------------------------------------------------- 12. Move. It notices. (42-46)
const GLYPHS = ['Walk', 'Run', 'Ride', 'Row', 'Elliptical'];
function drawGlyph(g, kind, x, y, s, phase) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  const head = (hx, hy) => { g.beginPath(); g.arc(hx, hy, 7, 0, TAU); g.fill(); };
  const sw = Math.sin(phase) * 0.6;
  const limb = (x0, y0, a, l) => { const x1 = x0 + Math.sin(a) * l, y1 = y0 + Math.cos(a) * l; g.moveTo(x0, y0); g.lineTo(x1, y1); return [x1, y1]; };
  g.beginPath();
  if (kind === 'Walk' || kind === 'Run') {
    const lean = kind === 'Run' ? 0.25 : 0.05, k = kind === 'Run' ? 1.4 : 0.8;
    head(4 + lean * 30, -40);
    g.beginPath(); g.moveTo(lean * 22, -30); g.lineTo(0, 2);
    limb(0, 2, sw * k, 22); limb(0, 2, -sw * k, 22);
    limb(lean * 16, -22, -sw * k * 0.9, 18); limb(lean * 16, -22, sw * k * 0.9, 18);
  } else if (kind === 'Ride') {
    g.moveTo(-13, 18); g.arc(-26, 18, 13, 0, TAU); g.moveTo(39, 18); g.arc(26, 18, 13, 0, TAU);
    g.moveTo(-26, 18); g.lineTo(-4, 0); g.lineTo(18, 0); g.lineTo(26, 18); g.moveTo(-4, 0); g.lineTo(0, 18);
    g.stroke();
    head(10, -30); g.beginPath(); g.moveTo(6, -22); g.lineTo(-6, -2); g.lineTo(18, 0);
    const pa = phase * 2; g.moveTo(-6, -2); g.lineTo(Math.cos(pa) * 8, 18 + Math.sin(pa) * 8);
  } else if (kind === 'Row') {
    g.moveTo(-40, 22); g.lineTo(40, 22);
    g.stroke();
    const r = sw * 10; head(-4 + r, -18);
    g.beginPath(); g.moveTo(-6 + r, -10); g.lineTo(-10 + r * 0.5, 14); g.lineTo(14, 18); g.moveTo(-4 + r, -4); g.lineTo(26, -2 + Math.cos(phase) * 4); g.lineTo(44, 10);
  } else {
    head(0, -40); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 2);
    const e = Math.sin(phase); g.moveTo(0, 2); g.lineTo(-14 + e * 8, 22); g.moveTo(0, 2); g.lineTo(14 - e * 8, 22);
    g.moveTo(-22 + e * 6, 26); g.lineTo(22 - e * 6, 26); g.moveTo(0, -22); g.lineTo(18, -34 + e * 6); g.moveTo(0, -22); g.lineTo(-16, -30 - e * 6);
  }
  g.stroke(); g.restore();
}
function shotMove(ctx) {
  const s = scene('#F4F3F0', ctx.room, 0.9), cam = camera(30);
  keyLights(s, { key: 1.1, rim: 0.6, fill: 0.35 });
  const band = makeBand('obsidian'); const pod = makePod(); band.seat.add(pod.group);
  band.group.scale.setScalar(0.5); s.add(band.group);
  const trailCols = ['#3D8BFF', '#5CE1FF', '#8F7CFF'];
  const trails = trailCols.map((c) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, depthWrite: false })); s.add(m); return m; });
  const pathAt = (τ) => { const a = Math.sin(τ * 2.6) * 1.1; return new THREE.Vector3(Math.sin(a) * 3.2, -Math.cos(a) * 1.4 + 0.6, Math.sin(τ * 1.3) * 0.6); };
  const REST = new THREE.Vector3(3.2, 0.1, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.16, 24, 160, 0.001), new THREE.MeshBasicMaterial({ color: '#3D8BFF', toneMapped: false }));
  s.add(ring);
  const green = new THREE.Color('#34C759'), blue = new THREE.Color('#3D8BFF');
  let lastArc = -1;
  return {
    start: 42, end: 46, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: 15, az: deg(lerp(-8, 8, τ / 4)), el: deg(8), target: [0, 0.3, 0] });
      const settle = ease.inOut(seg(τ, 2.4, 3.0));
      band.group.position.copy(pathAt(Math.min(τ, 2.4)).lerp(REST, settle));
      band.group.rotation.set(Math.sin(τ * 2.6) * 0.5 * (1 - settle), lerp(0.9 + τ * 0.6, 1.15, settle), Math.sin(τ * 1.9) * 0.4 * (1 - settle));
      trails.forEach((m, i) => {
        const pts = [];
        for (let k = 0; k < 40; k++) { const tt = Math.min(τ, 2.4) - k * 0.018; if (tt < 0) break; const q = pathAt(tt); q.y += (i - 1) * 0.18; q.z += (i - 1) * 0.12; pts.push(q); }
        m.geometry.dispose();
        if (pts.length > 2) {
          const curve = new THREE.CatmullRomCurve3(pts), SEGS = 60, RAD = 8;
          const tube = new THREE.TubeGeometry(curve, SEGS, 0.06, RAD, false);
          // taper the trail from the head (full width) to the tail (zero)
          const pos = tube.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
          for (let j = 0; j < pos.count; j++) { const f = Math.floor(j / (RAD + 1)) / SEGS; curve.getPointAt(Math.min(1, f), c); v.fromBufferAttribute(pos, j).sub(c).multiplyScalar(1 - f).add(c); pos.setXYZ(j, v.x, v.y, v.z); }
          m.geometry = tube;
        } else m.geometry = new THREE.BufferGeometry();
        m.material.opacity = 0.5 * (1 - settle);
      });
      const arcP = ease.inOut(seg(τ, 2.6, 3.4));
      const arc = Math.max(0.001, arcP * TAU);
      if (Math.abs(arc - lastArc) > 1e-4) { ring.geometry.dispose(); ring.geometry = new THREE.TorusGeometry(2.4, 0.16, 24, 160, arc); lastArc = arc; }
      ring.position.set(REST.x, REST.y, -0.6); ring.rotation.z = Math.PI / 2; ring.scale.setScalar(0.75);
      ring.material.color.copy(blue).lerp(green, ease.out(seg(τ, 3.4, 3.55)));
      ring.visible = arcP > 0.002;
    },
    ui(u, τ) {
      const g = u.g;
      GLYPHS.forEach((name, i) => {
        const at = 0.35 + i * 0.4, on = ease.expo(seg(τ, at, at + 0.35)), fade = 1 - seg(τ, 3.65, 3.95);
        const x = 260 + i * 170, y = 940;
        g.save(); g.globalAlpha = fade * (0.25 + 0.75 * on);
        g.strokeStyle = on > 0.5 ? '#1D1D1F' : 'rgba(29,29,31,0.5)'; g.fillStyle = g.strokeStyle; g.lineWidth = 3.5;
        drawGlyph(g, name, x, y - 24, 1.25, τ * 9 + i);
        g.font = '500 22px Inter'; g.textAlign = 'center'; g.fillText(name, x, y + 58);
        g.restore();
      });
      lockTop(u, τ, 'Move. It notices.', 'Steps, calories and Active Zone Minutes, all day. Workouts detected automatically.', { color: DARK, subColor: GREY_L, maxW: 900 });
      u.text('Weekly Cardio Load target', { x: 1390, y: 850, size: 24, weight: 500, align: 'center', color: τ > 3.45 ? '#248A3D' : GREY_L, t: τ, at: 2.7, out: 3.95 });
    },
  };
}

// ---------------------------------------------------------------- 13. Seven days, rain, swim (46-50)
function shotSevenDays(ctx) {
  const bg = gradientBG('#7FB2E8', '#DCEBFA');
  const s = scene('#000'), cam = camera(26); s.background = bg.tex; s.environment = ctx.room; s.environmentIntensity = 0.8;
  cam.setViewOffset(W, H, -430, 0, W, H);
  const L = keyLights(s, { key: 1.6, rim: 0.6, fill: 0.3 });
  const prof = [new THREE.Vector2(0, -0.3), new THREE.Vector2(2.3, -0.3), new THREE.Vector2(2.4, -0.22), new THREE.Vector2(2.4, 0.22), new THREE.Vector2(2.3, 0.3), new THREE.Vector2(0, 0.3)];
  const plinth = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), new THREE.MeshPhysicalMaterial({ color: '#f2f2f0', roughness: 0.6, clearcoat: 0.2 }));
  plinth.position.y = -2.0; s.add(plinth);
  const band = makeBand('obsidian'); const pod = makePod(); band.seat.add(pod.group); s.add(band.group);
  band.group.rotation.y = deg(-80); band.group.scale.setScalar(0.62); band.group.position.y = -0.2;
  const sun = glowSprite('#FFF2C8', 7, 1); s.add(sun);
  const moon = glowSprite('#DDE6FF', 4, 1); s.add(moon);
  const RN = 900, rp = new Float32Array(RN * 6), rr = rng(4);
  for (let i = 0; i < RN; i++) { const x = (rr() - 0.5) * 30, y = rr() * 20, z = (rr() - 0.5) * 16 - 2; rp.set([x, y, z, x - 0.05, y - 0.6, z], i * 6); }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#dfe9ff', transparent: true, opacity: 0 })); s.add(rain);
  const rainBase = rp.slice();
  const water = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 40), new THREE.MeshBasicMaterial({ color: '#1B6E8C', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  s.add(water);
  const bubbles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 600 }, (_, i) => [(hash(i) - 0.5) * 10, hash(i + 9) * 8 - 3, (hash(i + 3) - 0.5) * 6][i % 3])), 3)), new THREE.PointsMaterial({ color: '#d8f3ff', size: 0.14, transparent: true, opacity: 0 }));
  s.add(bubbles);
  const C = (h) => new THREE.Color(h);
  let wk = 0;
  return {
    start: 46, end: 50, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: 19, az: deg(lerp(0, 35, ease.sine(τ / 4))), el: deg(14), target: [0, -0.4, 0] });
      const day = Math.min(6, Math.floor(τ / 0.5)), f = (τ % 0.5) / 0.5;
      const isDay = f < 0.6, dayK = clamp(Math.sin(clamp(f / 0.6) * Math.PI) * 1.4);
      const top = C('#2B3D6B').lerp(C('#6FA8E6'), dayK), bot = C('#4A5A85').lerp(C('#E4F0FB'), dayK);
      if (day === 2) { top.lerp(C('#59677a'), 0.6); bot.lerp(C('#a9b4c2'), 0.6); }
      bg.paint('#' + top.getHexString(), '#' + bot.getHexString());
      L.k.intensity = lerp(0.6, 1.8, dayK); L.k.color.copy(C('#9fb0ff').lerp(C('#fff4e0'), dayK)); s.environmentIntensity = lerp(0.3, 0.8, dayK);
      const ang = clamp(f / 0.6) * Math.PI;
      sun.position.set(Math.cos(ang) * -14, Math.sin(ang) * 8 + 1, -14); sun.material.opacity = isDay ? Math.sin(ang) : 0;
      const ma = clamp((f - 0.6) / 0.4) * Math.PI;
      moon.position.set(Math.cos(ma) * -14, Math.sin(ma) * 7 + 1, -14); moon.material.opacity = !isDay ? Math.sin(ma) : 0;
      const rk = day === 2 ? 1 : 0;
      rain.material.opacity = 0.55 * rk;
      if (rk) { const a = rainGeo.attributes.position.array; for (let i = 0; i < a.length; i += 3) a[i + 1] = ((rainBase[i + 1] - τ * 38) % 20 + 20) % 20 - 4; rainGeo.attributes.position.needsUpdate = true; }
      wk = pulse(τ, 1.9, 2.75);
      water.position.y = -18 + 15 * ease.inOut(wk) + 0.15 * Math.sin(τ * 6);
      water.visible = wk > 0.01;
      bubbles.material.opacity = wk > 0.5 ? 0.6 : 0; bubbles.position.y = (τ * 3) % 3;
      pod.setLED('#ff3b30', τ > 3.2 ? 0.5 + 0.5 * Math.sin((τ - 3.2) * 30) : 0);
    },
    ui(u, τ) {
      const g = u.g, day = Math.min(7, Math.floor(τ / 0.5) + 1), fade = 1 - seg(τ, 3.7, 3.97);
      if (wk > 0.01) u.fill('#0B4F6C', 0.35 * wk);
      const cx = 1640, cy = 200, R = 72;
      g.save(); g.globalAlpha = fade * ease.expo(seg(τ, 0, 0.4));
      for (let i = 0; i < 7; i++) {
        const a0 = -Math.PI / 2 + (i / 7) * TAU + 0.05, a1 = a0 + TAU / 7 - 0.1;
        g.strokeStyle = i < day ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)'; g.lineWidth = 10; g.lineCap = 'round';
        g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      }
      g.fillStyle = '#ffffff'; g.font = '600 34px "Inter Tight"'; g.textAlign = 'center'; g.fillText(`Day ${day}`, cx, cy + 12);
      g.restore();
      if (τ > 1.9 && τ < 2.75) u.text('50 m', { x: 160, y: 300, size: 150, weight: 600, font: '"Inter Tight"', color: 'rgba(255,255,255,0.95)', t: τ, at: 1.95, out: 2.75 });
      const lb = ease.expo(seg(τ, 3.2, 3.8)) * (1 - seg(τ, 3.67, 3.97));
      if (lb > 0) { g.save(); g.globalAlpha = lb; g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.roundRect(1162, 184, 384, 40, 20); g.fill(); g.restore(); }
      u.text('Low battery? It tells you in red.', { x: 1530, y: 212, size: 24, weight: 500, align: 'right', color: '#ffffff', t: τ, at: 3.2, out: 3.97 });
      scrim(u, 640, 820, 0, 0.5); scrim(u, 820, H, 0.5, 0.6);
      lockBottom(u, τ, 'Up to 7 days per charge.', 'Water resistant to 50 m. Shower, swim, sleep, repeat.', { at: 0.1, subAt: 0.6, out: 3.97, subColor: 'rgba(245,245,247,0.82)' });
    },
  };
}

// ---------------------------------------------------------------- 14. Five minutes (50-52)
function shotCharge(ctx) {
  const s = scene('#000000', ctx.studio, 0.8), cam = camera(20);
  keyLights(s, { key: 0.7, rim: 1.4, fill: 0.04 });
  const pod = makePod(); pod.group.rotation.x = Math.PI; s.add(pod.group);
  pod.ledGlow.material.depthTest = false; pod.ledGlow.scale.setScalar(0.45);
  const ch = makeCharger(); s.add(ch);
  return {
    start: 50, end: 52, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: lerp(15, 14, τ / 2), az: deg(lerp(38, 46, τ / 2)), el: deg(12), target: [-2.0, 0.4, 0] });
      const p = ease.out(seg(τ, 0, 0.6)), flip = ease.inOut(seg(τ, 0.05, 0.45));
      ch.position.set(lerp(-1.5, 0, p), lerp(4.5, POD.bottom + 0.43, p) + 0.04 * pulse(τ, 0.6, 0.7), lerp(-3, 0, p));
      ch.rotation.set(Math.PI, lerp(Math.PI, 0, flip), 0);
      pod.group.position.y = -0.05 * pulse(τ, 0.6, 0.72);
      pod.setLED('#ffffff', τ > 0.65 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((τ - 0.65) * 6)) : 0);
    },
    ui(u, τ) {
      const g = u.g;
      const k = ease.expo(seg(τ, 0.7, 1.3)), fade = 1 - seg(τ, 1.7, 1.97);
      if (k > 0) {
        const cx = 275, cy = 640, R = 110;
        g.save(); g.globalAlpha = fade; g.lineWidth = 10; g.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a0 = -Math.PI / 2 + (i / 7) * TAU + 0.05, a1 = a0 + TAU / 7 - 0.1;
          g.strokeStyle = 'rgba(245,245,247,0.15)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
          if (i === 0) { g.strokeStyle = '#34C759'; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * k); g.stroke(); }
        }
        g.fillStyle = LIGHT; g.textAlign = 'center'; g.font = '600 44px "Inter Tight"'; g.fillText('5 min', cx, cy - 2);
        g.font = '500 22px Inter'; g.fillStyle = GREY_D; g.fillText('≈ 1 day', cx, cy + 34);
        g.restore();
      }
      lockBottom(u, τ, 'Five minutes. About a day.', 'Full charge in about 90 minutes.', { at: 0.05, subAt: 0.4, out: 1.97 });
    },
  };
}

// ---------------------------------------------------------------- 15. One Air. Every look. (52-56)
function shotBands(ctx) {
  const s = scene('#F4F3F0', ctx.room, 0.95), cam = camera(24);
  keyLights(s, { key: 1.2, rim: 0.7, fill: 0.35 });
  const order = ['obsidian', 'fog', 'lavender', 'berry'];
  const loops = order.map((k) => { const b = makeBand(k); s.add(b.group); return b; });
  const extras = ['activeLav', 'porcelain'].map((k) => { const b = makeBand(k); s.add(b.group); return b; });
  const pod = makePod(); s.add(pod.group);
  const sh = contactShadow(9, 0.22); sh.position.y = -3.0; s.add(sh);
  const fan = [-6.6, -3.96, -1.32, 1.32, 4.3, 7.4];
  const all = loops.concat(extras);
  const seatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
  return {
    start: 52, end: 56, scene: s, camera: cam,
    update(τ) {
      const pull = ease.inOut(seg(τ, 2.05, 3.0));
      orbit(cam, { r: lerp(19, 33, pull), az: deg(lerp(30, 0, pull)), el: deg(lerp(14, 10, pull)), target: [lerp(-3.2, -0.25, pull), lerp(0, 0.3, pull), 0] });
      const cur = Math.min(3, Math.floor(τ / 0.5));
      all.forEach((b, i) => {
        if (i < 4) {
          const inT = i * 0.5, outT = (i + 1) * 0.5;
          let x = 0, vis = true;
          if (pull <= 0) {
            const pin = ease.out(seg(τ, inT - 0.2, inT)), pout = i === 3 ? 0 : ease.in(seg(τ, outT - 0.12, outT + 0.1));
            x = lerp(-14, 0, pin) + lerp(0, 14, pout);
            vis = τ > inT - 0.2 && (i === 3 || τ < outT + 0.1);
          }
          b.group.visible = vis || pull > 0;
          b.group.position.set(pull > 0 ? fan[i] * pull : x, 0, 0);
          b.group.rotation.set(0, deg(lerp(-25, -40, pull)), 0);
        } else {
          b.group.visible = pull > 0.02;
          b.group.position.set(lerp(fan[i] * 1.8, fan[i], pull), 0, 0);
          b.group.rotation.set(0, deg(-40), 0);
        }
      });
      // the pod pops out downward, the next band arrives, and the pod snaps up into its cradle
      const target = loops[cur];
      target.group.updateMatrixWorld(true);
      const seatPos = new THREE.Vector3(); target.seat.getWorldPosition(seatPos);
      const lt = τ - cur * 0.5;
      const land = cur === 0 ? 1 : ease.out(seg(lt, 0, 0.22));
      const drop = cur < 3 ? ease.in(seg(lt, 0.36, 0.5)) * 0.9 : 0;
      pod.group.position.copy(seatPos).add(new THREE.Vector3(0, -(1 - land) * 1.4 - drop + 0.04 * pulse(lt, 0.18, 0.26), 0));
      pod.group.quaternion.copy(target.group.quaternion).multiply(seatQ);
      sh.scale.setScalar(lerp(1, 2.4, pull));
    },
    ui(u, τ) {
      const names = ['Obsidian', 'Fog', 'Lavender', 'Berry'];
      const cur = Math.min(3, Math.floor(τ / 0.5));
      if (τ < 2.0) u.text(names[cur], { x: 160, y: 370, size: 28, weight: 600, color: DARK, t: τ, at: cur * 0.5, out: cur === 3 ? 2.0 : (cur + 1) * 0.5, rise: 10 });
      if (τ > 2.6) {
        const cxOf = (i) => toScreen(all[i].group.position.clone(), this.camera)[0];
        const k = ease.expo(seg(τ, 2.75, 3.2)) * (1 - seg(τ, 3.7, 3.97)), g = u.g;
        const l0 = cxOf(0) - 120, l1 = cxOf(3) + 120;
        g.save(); g.globalAlpha = k; g.strokeStyle = GREY_L; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(l0, 764); g.lineTo(l0, 772); g.lineTo(l1, 772); g.lineTo(l1, 764); g.stroke(); g.restore();
        u.text('Performance Loop', { x: (l0 + l1) / 2, y: 806, size: 22, weight: 500, align: 'center', color: GREY_L, t: τ, at: 2.75, out: 3.97 });
        u.text('Active Band', { x: cxOf(4), y: 806, size: 22, weight: 500, align: 'center', color: GREY_L, t: τ, at: 2.87, out: 3.97 });
        u.text('Elevated Modern Band', { x: cxOf(5), y: 806, size: 22, weight: 500, align: 'center', color: GREY_L, t: τ, at: 2.99, out: 3.97 });
      }
      lockTop(u, τ, 'One Air. Every look.', 'Pops out, snaps in. Swap Fitbit Air bands in seconds.', { at: 0.05, subAt: 0.5, out: 3.97, color: DARK, subColor: GREY_L });
    },
  };
}

// ---------------------------------------------------------------- 16. End card (56-60)
function shotEnd(ctx) {
  const s = scene('#000000', ctx.studio, 1.0), cam = camera(20);
  keyLights(s, { key: 0.5, rim: 2.6, fill: 0.04 });
  const band = makeBand('obsidian'); const pod = makePod(); band.seat.add(pod.group); s.add(band.group);
  band.group.scale.setScalar(0.5);
  return {
    start: 56, end: 60, scene: s, camera: cam,
    update(τ) {
      orbit(cam, { r: lerp(17, 18.5, τ / 4), az: deg(lerp(30, 55, τ / 4)), el: deg(18), target: [0, -0.2, 0] });
      s.environmentRotation.set(0, lerp(-1.4, 1.2, ease.inOut(seg(τ, 0, 1.4))), 0);
      band.group.rotation.y = lerp(-0.4, 0.3, τ / 4);
      band.group.position.y = 0.7;
      pod.setLED('#ffffff', pulse(τ, 3.0, 3.25));
    },
    ui(u, τ) {
      title(u, τ, { at: 0.6, subAt: 1.1 });
      u.text('$99.99 in the US  ·  Core tracking with no subscription', { x: 960, y: 950, size: 30, weight: 500, align: 'center', color: LIGHT, t: τ, at: 1.5 });
      u.text('Requires a Google Account and the Google Health app on Android 11+ or iOS 16.4+. AFib alerts and SpO2 not available in all regions. Data and conversations shown are illustrative.', { x: 960, y: 1004, size: 17, align: 'center', color: 'rgba(245,245,247,0.55)', t: τ, at: 2.0, rise: 0, maxW: 1760 });
      u.text('Fan-made concept film. Not affiliated with Google.', { x: 960, y: 1032, size: 17, align: 'center', color: 'rgba(245,245,247,0.55)', t: τ, at: 2.0, rise: 0 });
      u.fill('#000000', seg(τ, 3.5, 4.0));
    },
  };
}

export const SHOT_FACTORIES = [shotFirstLight, shotHero, shotScale, shotInside, shotSensors, shotRhythm, shotOcean, shotSpO2, shotSleep, shotWake, shotCoach, shotMove, shotSevenDays, shotCharge, shotBands, shotEnd];
