// Renders index.html frame-by-frame and encodes biscuit-adventure.mp4.
//   node render.mjs                     -> full film (60 fps, 4 parallel workers)
//   node render.mjs --fps 30 --workers 2
//   node render.mjs --stills 3,12,20    -> PNG stills at those seconds
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const fps = Number(opt('fps', 60));
const workers = Number(opt('workers', 4));
const stills = opt('stills', null);
const outDir = opt('out', join(here, 'out'));
const url = pathToFileURL(join(here, 'index.html')).href + '?capture=1';

const browser = await chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true);
  return page;
}
async function shoot(page, t, file) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.locator('#film').screenshot({ path: file, type: 'png' });
}

mkdirSync(outDir, { recursive: true });
if (stills) {
  const page = await openPage();
  for (const s of stills.split(',').map(Number)) await shoot(page, s, join(outDir, `still_${s.toFixed(2).padStart(5, '0')}.png`));
  await browser.close();
  process.exit(0);
}

const duration = 60, total = Math.round(duration * fps);
const frameDir = join(outDir, 'frames');
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
let done = 0;
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const page = await openPage();
  for (let i = w; i < total; i += workers) {
    await shoot(page, i / fps, join(frameDir, `f${String(i).padStart(5, '0')}.png`));
    if (++done % fps === 0) process.stdout.write(`\r${(done / fps).toFixed(0)}s / ${duration}s`);
  }
}));
await browser.close();
process.stdout.write('\nencoding…\n');
const audio = join(here, 'soundtrack.wav');
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error',
  '-framerate', String(fps), '-i', join(frameDir, 'f%05d.png'),
  ...(existsSync(audio) ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  join(here, 'biscuit-adventure.mp4'),
], { stdio: 'inherit' });
rmSync(frameDir, { recursive: true, force: true });
console.log('wrote biscuit-adventure.mp4');
