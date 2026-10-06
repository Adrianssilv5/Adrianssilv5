// Renderer, studio lighting environments and the 2D type layer shared by every shot.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { W, H, clamp, seg, ease, lerp } from './util.js';

export function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

// A black product studio: two big softboxes and a thin strip light. Rotating scene.environmentRotation
// slides the reflections across the pod (the "light sweep").
export function studioEnvironment(renderer, { bright = 1, strip = 6 } = {}) {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#000000');
  const box = new THREE.BoxGeometry(1, 1, 1);
  const lightMat = (k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k) });
  const add = (w, h, d, x, y, z, k) => { const m = new THREE.Mesh(box, lightMat(k * bright)); m.scale.set(w, h, d); m.position.set(x, y, z); env.add(m); };
  add(10, 0.2, 6, 0, 6, 0, 3.2);        // top softbox
  add(0.2, 6, 8, -7, 1, 0, 1.6);        // left softbox
  add(0.6, 9, 0.6, 6, 1.5, -3, strip);  // narrow strip (the sweep highlight)
  add(0.3, 4, 3, 7, 0, 4, 0.8);         // weak right fill
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return t;
}
export function roomEnvironment(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(new RoomEnvironment(), 0.03).texture;
  pm.dispose();
  return t;
}

// ---------- 2D type layer ----------
const FONT_H = '"Inter Tight", Inter, sans-serif', FONT_B = 'Inter, sans-serif';
export class UI {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); }
  clear() { this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, W, H); this.g.globalAlpha = 1; }
  // Apple-style headline: words rise from a mask, staggered, then fade before the cut.
  headline(text, { x = 160, y = 780, size = 120, weight = 600, color = '#F5F5F7', align = 'left', t, at, out = null, stagger = 0.07, track = -0.025, maxW = 1600, lineH = 1.02 }) {
    const g = this.g;
    if (t < at) return;
    const fade = out == null ? 1 : 1 - seg(t, out - 0.3, out);
    if (fade <= 0) return;
    g.save();
    g.font = `${weight} ${size}px ${FONT_H}`;
    g.letterSpacing = `${track * size}px`;
    g.textBaseline = 'alphabetic';
    g.fillStyle = color;
    const lines = this.wrap(text, maxW);
    let wi = 0;
    lines.forEach((line, li) => {
      const words = line.split(' ');
      const lw = g.measureText(line).width;
      let cx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x;
      const ly = y + li * size * lineH;
      words.forEach((w) => {
        const p = ease.expo(seg(t, at + wi * stagger, at + wi * stagger + 0.7));
        const ww = g.measureText(w + ' ').width;
        g.save();
        g.beginPath(); g.rect(cx - 10, ly - size * 1.05, ww + 20, size * 1.35); g.clip();
        g.globalAlpha = fade * clamp(p * 1.4);
        g.fillText(w, cx, ly + (1 - p) * size * 0.55);
        g.restore();
        cx += ww; wi++;
      });
    });
    g.restore();
    return lines.length;
  }
  wrap(text, maxW) {
    const g = this.g, out = [];
    text.split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((w) => {
        const test = line ? line + ' ' + w : w;
        if (g.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test;
      });
      out.push(line);
    });
    return out;
  }
  text(text, { x, y, size = 34, weight = 400, color = '#F5F5F7', alpha = 1, align = 'left', font = FONT_B, track = 0, t = 1, at = 0, out = null, rise = 14, maxW = 1200, lineH = 1.3, baseline = 'alphabetic' }) {
    if (t < at) return;
    const g = this.g;
    const p = ease.expo(seg(t, at, at + 0.6));
    const fade = out == null ? 1 : 1 - seg(t, out - 0.3, out);
    const a = alpha * p * fade;
    if (a <= 0.003) return;
    g.save();
    g.globalAlpha = a;
    g.font = `${weight} ${size}px ${font}`;
    g.letterSpacing = `${track}px`;
    g.textAlign = align; g.textBaseline = baseline;
    g.fillStyle = color;
    this.wrap(text, maxW).forEach((l, i) => g.fillText(l, x, y + (1 - p) * rise + i * size * lineH));
    g.restore();
  }
  // hairline callout anchored to a projected 3D point
  callout(label, [px, py], { dx = 160, dy = -60, t, at, out = null, color = '#F5F5F7', size = 20, alpha = 1 }) {
    if (t < at) return;
    const g = this.g;
    const p = ease.expo(seg(t, at, at + 0.5));
    const fade = out == null ? 1 : 1 - seg(t, out - 0.3, out);
    if (fade <= 0) return;
    const ex = px + dx * p, ey = py + dy * p;
    g.save();
    g.globalAlpha = alpha * fade;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.5;
    g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(px, py); g.lineTo(ex, ey); g.lineTo(ex + (dx >= 0 ? 24 : -24) * p, ey); g.stroke();
    g.globalAlpha = alpha * fade * seg(t, at + 0.2, at + 0.6);
    g.font = `500 ${size}px ${FONT_B}`; g.letterSpacing = '0.6px';
    g.textAlign = dx >= 0 ? 'left' : 'right'; g.textBaseline = 'middle';
    g.fillText(label, ex + (dx >= 0 ? 34 : -34), ey);
    g.restore();
  }
  fill(color, a) { if (a <= 0) return; const g = this.g; g.save(); g.globalAlpha = a; g.fillStyle = color; g.fillRect(0, 0, W, H); g.restore(); }
  footnote(text, { t, at = 0, out = null, color = '#F5F5F7', alpha = 0.5, x = 160, y = 1030 }) {
    this.text(text, { x, y, size: 17, color, alpha, t, at, out, rise: 0 });
  }
}

// project a world position to screen pixels
export function toScreen(v3, camera) {
  const p = v3.clone().project(camera);
  return [(p.x * 0.5 + 0.5) * W, (-p.y * 0.5 + 0.5) * H];
}
export { THREE, lerp };
