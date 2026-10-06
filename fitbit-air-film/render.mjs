// Renders the film frame by frame (WebGL via SwiftShader) and muxes it with soundtrack.wav.
//   node render.mjs                      -> fitbit-air-film.mp4 (60 fps, 4 workers)
//   node render.mjs --stills 2,6,10      -> PNG stills in ./out
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, CHROME_ARGS } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const fps = Number(opt('fps', 60)), workers = Number(opt('workers', 4)), stills = opt('stills', null);
const outDir = opt('out', join(here, 'out'));
const server = await serve(here);
const browser = await chromium.launch({ args: CHROME_ARGS });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
  await page.goto(`http://127.0.0.1:${server.port}/index.html?capture=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  return page;
}
const shoot = async (page, t, file) => { await page.evaluate((tt) => window.renderAt(tt), t); await page.locator('#stage').screenshot({ path: file }); };

mkdirSync(outDir, { recursive: true });
if (stills) {
  const page = await openPage();
  for (const s of stills.split(',').map(Number)) await shoot(page, s, join(outDir, `still_${s.toFixed(2).padStart(5, '0')}.png`));
} else {
  const total = 60 * fps, frames = join(outDir, 'frames');
  rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
  let done = 0;
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await openPage();
    for (let i = w; i < total; i += workers) {
      await shoot(page, i / fps, join(frames, `f${String(i).padStart(5, '0')}.png`));
      if (++done % fps === 0) process.stdout.write(`\r${done / fps}s / 60s`);
    }
  }));
  process.stdout.write('\nencoding…\n');
  const audio = join(here, 'soundtrack.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(frames, 'f%05d.png'),
    ...(existsSync(audio) ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(here, 'fitbit-air-film.mp4')], { stdio: 'inherit' });
  rmSync(frames, { recursive: true, force: true });
  console.log('wrote fitbit-air-film.mp4');
}
await browser.close(); server.close();
