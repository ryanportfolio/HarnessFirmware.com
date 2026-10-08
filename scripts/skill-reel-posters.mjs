/* Poster frames for the skills-reel cards on /skills.

   Each card shows site/skill-reel/posters/<id>.webp the moment the page paints; the live canvas
   fades in over it once its scene has painted t = 0. The poster is that same t = 0 frame, drawn the
   way site/skill-reel/cards.mjs paints a card (ink fill, stage scaled to the canvas, the scene's own
   vignette and card line weights), at POSTER_W x POSTER_H: wide enough for a 2x phone card, and
   under the kit's card threshold (0.45 device px per stage unit), so it uses the same line weights
   as the live card and the swap does not show.

   Regenerate the posters whenever a scene's t = 0 frame changes (any edit to its rest pose, kit
   materials or the bench), or the swap from poster to live card will jump:

     node scripts/skill-reel-posters.mjs            render and write all nine
     node scripts/skill-reel-posters.mjs --check    exit 1 if a poster differs from a fresh render
                                                    (mean absolute difference over 2/255, measured
                                                    at 240 x 135 so WebP noise does not count)
     options: --port <n> (4415), --quality <0..1> (0.8), --only <id,id>

   Uses headed Chrome on the real GPU through launchPlacedChrome (parked offscreen) and serves the
   repository root with docs/skill-reel/animatic/serve.mjs, so the scenes load with the site faces
   the reel page declares. */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'skill-reel', 'posters');
const IDS = ['merge', 'deep-plan', 'long-horizon', 'smart-compact', 'why', 'wow-loop', 'perf-loop', 'arena', 'showpiece'];
export const POSTER_W = 832, POSTER_H = 468; // 16:9; 832 / 1920 = 0.433 device px per stage unit

const opt = { port: 4415, quality: 0.8, check: false, only: null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--check') opt.check = true;
  else if (a === '--port') opt.port = Number(argv[++i]);
  else if (a === '--quality') opt.quality = Number(argv[++i]);
  else if (a === '--only') opt.only = argv[++i].split(',');
  else throw new Error(`unknown option ${a}`);
}
const ids = opt.only || IDS;

const server = spawn(process.execPath, [path.join(ROOT, 'docs/skill-reel/animatic/serve.mjs')], {
  env: { ...process.env, PORT: String(opt.port) },
  stdio: 'ignore',
});
let browser = null;
let failed = false;
try {
  await new Promise((r) => setTimeout(r, 900));
  const { launchPlacedChrome } = await import(new URL('./lib/launch-chrome.mjs', import.meta.url));
  browser = await launchPlacedChrome({ place: process.env.CHROME_PLACE || 'offscreen', channel: 'chrome' })
    .catch(() => launchPlacedChrome({ place: process.env.CHROME_PLACE || 'offscreen' }));
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })).newPage();
  // The reel page declares the site faces and loads them before it reports ready.
  await page.goto(`http://127.0.0.1:${opt.port}/docs/skill-reel/reel/index.html?mode=card&scene=merge`);
  await page.waitForFunction(() => window.reelReady === true, null, { timeout: 60000 });
  mkdirSync(OUT, { recursive: true });
  for (const id of ids) {
    const file = path.join(OUT, `${id}.webp`);
    const old = opt.check ? readFileSync(file).toString('base64') : null;
    const r = await page.evaluate(async ({ id, W, H, q, old }) => {
      const scene = (await import(`/site/skill-reel/scenes/${id}.mjs`)).default;
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      // as cards.mjs paint(): ink, then the 1920 x 1080 stage scaled to the canvas, clipped
      ctx.fillStyle = '#0f1210';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.setTransform(W / 1920, 0, 0, H / 1080, 0, 0);
      ctx.beginPath();
      ctx.rect(0, 0, 1920, 1080);
      ctx.clip();
      scene.draw(ctx, 0);
      for (let i = 0; i < 64; i++) ctx.restore();
      if (!old) return { url: cv.toDataURL('image/webp', q) };
      // compare at 240 x 135 against the existing poster
      const img = new Image();
      img.src = 'data:image/webp;base64,' + old;
      await img.decode();
      const small = (src) => {
        const c = document.createElement('canvas');
        c.width = 240;
        c.height = 135;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingQuality = 'high';
        x.drawImage(src, 0, 0, 240, 135);
        return x.getImageData(0, 0, 240, 135).data;
      };
      const a = small(cv), b = small(img);
      let sum = 0;
      for (let i = 0; i < a.length; i += 4) sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      return { mad: sum / ((a.length / 4) * 3) };
    }, { id, W: POSTER_W, H: POSTER_H, q: opt.quality, old });
    if (opt.check) {
      const ok = r.mad <= 2;
      if (!ok) failed = true;
      console.log(`${ok ? 'ok   ' : 'STALE'} ${id}: mean abs diff ${r.mad.toFixed(2)} / 255`);
    } else {
      writeFileSync(file, Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64'));
      console.log(`${id}.webp  ${POSTER_W}x${POSTER_H}  ${(statSync(file).size / 1024).toFixed(1)} KB`);
    }
  }
} catch (err) {
  failed = true;
  console.error(err && err.stack ? err.stack : err);
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
if (failed) {
  if (opt.check) console.error('posters are stale: run node scripts/skill-reel-posters.mjs');
  process.exitCode = 1;
}
