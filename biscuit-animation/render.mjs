// Renders index.html frame-by-frame and encodes biscuit.mp4.
//   node render.mjs                  -> full video (60 fps)
//   node render.mjs --fps 30         -> custom frame rate
//   node render.mjs --stills 1,4.5,9 -> PNG stills at the given seconds
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const fps = Number(opt("fps", 60));
const stills = opt("stills", null);
const outDir = opt("out", join(here, "out"));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, "index.html")).href + "?capture=1");
await page.waitForFunction(() => window.__ready === true);
const duration = await page.evaluate(() => window.DURATION);

async function shoot(t, file) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

if (stills) {
  mkdirSync(outDir, { recursive: true });
  for (const s of stills.split(",").map(Number)) {
    await shoot(s, join(outDir, `still_${s.toFixed(2)}.png`));
  }
  await browser.close();
  process.exit(0);
}

const frameDir = join(outDir, "frames");
rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });
const total = Math.round(duration * fps);
for (let i = 0; i < total; i++) {
  await shoot(i / fps, join(frameDir, `f${String(i).padStart(5, "0")}.png`));
  if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)}s / ${duration}s`);
}
await browser.close();
process.stdout.write("\nencoding…\n");

execFileSync("ffmpeg", [
  "-y", "-loglevel", "error",
  "-framerate", String(fps),
  "-i", join(frameDir, "f%05d.png"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart",
  join(here, "biscuit.mp4"),
], { stdio: "inherit" });
rmSync(frameDir, { recursive: true, force: true });
console.log("wrote biscuit.mp4");
