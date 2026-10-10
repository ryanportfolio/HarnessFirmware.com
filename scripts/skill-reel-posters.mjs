/* Poster frames for the skills-reel cards on /skills.

   Each card shows site/skill-reel/posters/<id>.webp the moment the page paints; the live canvas
   replaces it once its scene has painted t = 0. The poster is that same t = 0 frame, drawn the way
   site/skill-reel/cards.mjs paints a card (ink fill, stage scaled to the canvas, the scene's own
   vignette and card line weights), at POSTER_W x POSTER_H. That is under the kit's card threshold
   (0.45 device px per stage unit), as every card canvas is (cards.mjs caps the backing store at
   862 px wide), so poster and live card use the same line weights at any width and DPR.

   The reel player above the cards shows site/skill-reel/posters/reel.webp until the visitor presses
   play: the reel's intro at REEL_T, the title and product line fully on over the waiting /merge
   station, drawn by site/skill-reel/reel.mjs (the player's renderer) at REEL_W x REEL_H. Regenerate it
   when the intro, the merge opener's first frame or the reel's captions change.

   Regenerate the posters whenever a scene's t = 0 frame changes (any edit to its rest pose, kit
   materials or the bench), or the swap from poster to live card will jump:

     node scripts/skill-reel-posters.mjs            render and write all nine and the reel's
     node scripts/skill-reel-posters.mjs --check    exit 1 if a poster differs from a fresh render:
                                                    any 16 x 16 px block (compared at half size)
                                                    off by more than BLOCK_MAX / 255 on average
     options: --port <n> (4415), --quality <0..1> (0.85; the reel's 0.8), --only <id,id> (reel for the reel's),
              --shift <n> (with --check: move the brightest part of each fresh render n stage
              units first, to prove the check catches a small rest-pose edit)

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
export const POSTER_W = 848, POSTER_H = 477; // 16:9; 848 / 1920 = 0.442 device px per stage unit
export const REEL_W = 1920, REEL_H = 1080, REEL_T = 3.5; // the reel poster: its intro at 3.5 s
const REEL_QUALITY = 0.8;

// --check metric: both images downscaled 2x (to 424 x 238, which averages away the film grain the
// WebP encoder smooths), split into 8 x 8 blocks (16 x 16 poster px, about 36 x 36 stage units);
// the worst block's mean absolute difference must stay under BLOCK_MAX (and the whole frame under
// MEAN_MAX). BLOCK_MAX sits between the WebP noise of an up-to-date poster (worst block 6.8 to 14.8)
// and moving one bright part of a scene 24 stage units (worst block 46 to 154), measured on all nine.
const BLOCK_MAX = 25, MEAN_MAX = 3;

let qGiven = false;
const opt = { port: 4415, quality: 0.85, check: false, only: null, shift: 0 };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--check') opt.check = true;
  else if (a === '--port') opt.port = Number(argv[++i]);
  else if (a === '--quality') { opt.quality = Number(argv[++i]); qGiven = true; }
  else if (a === '--only') opt.only = argv[++i].split(',');
  else if (a === '--shift') opt.shift = Number(argv[++i]); // test of --check: move the brightest part N stage units first
  else throw new Error(`unknown option ${a}`);
}
const ids = opt.only || [...IDS, 'reel'];

const server = spawn(process.execPath, [path.join(ROOT, 'docs/skill-reel/animatic/serve.mjs')], {
  env: { ...process.env, PORT: String(opt.port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser = null;
let failed = false;
try {
  // Wait for this checkout's server to report its port. If the port is taken, it exits instead, and
  // rendering from whatever else answers there would write or check another checkout's frames.
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve.mjs did not start in 10 s')), 10000);
    server.stdout.on('data', (d) => {
      if (String(d).includes(`:${opt.port}/`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (d) => process.stderr.write(d));
    server.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`serve.mjs exited with ${code} (is port ${opt.port} in use? pass --port)`));
    });
  });
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
    const isReel = id === 'reel';
    const r = await page.evaluate(async ({ id, W, H, q, old, shift, isReel, reelT }) => {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d');
      if (isReel) {
        // as player.mjs paints a frame: the reel renderer into a canvas of the poster's size
        const R = await import('/site/skill-reel/reel.mjs');
        const scenes = await R.loadReel();
        R.drawReel(ctx, R.buildReel(scenes), scenes, reelT);
      } else {
        const scene = (await import(`/site/skill-reel/scenes/${id}.mjs`)).default;
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
      }
      if (!old) return { url: cv.toDataURL('image/webp', q) };
      if (shift) {
        // a stand-in for a small rest-pose edit: the brightest 120 x 80 stage-unit patch moves right
        const x = cv.getContext('2d', { willReadFrequently: true });
        const k = W / 1920, pw = Math.round(120 * k), ph = Math.round(80 * k), dx = Math.round(shift * k);
        const d = x.getImageData(0, 0, W, H).data;
        let best = -1, bx = 0, by = 0;
        for (let y = 0; y + ph < H; y += 8) for (let xx = 0; xx + pw + dx < W; xx += 8) {
          let lum = 0;
          for (let yy = y; yy < y + ph; yy += 4) for (let x2 = xx; x2 < xx + pw; x2 += 4) { const i = (yy * W + x2) * 4; lum += d[i] + d[i + 1] + d[i + 2]; }
          if (lum > best) { best = lum; bx = xx; by = y; }
        }
        const patch = x.getImageData(bx, by, pw, ph);
        x.fillStyle = '#0f1210';
        x.fillRect(bx, by, pw, ph);
        x.putImageData(patch, bx + dx, by);
      }
      const img = new Image();
      img.src = 'data:image/webp;base64,' + old;
      await img.decode();
      const sw = Math.round(W / 2), sh = Math.round(H / 2);
      const half = (src) => {
        const c = document.createElement('canvas');
        c.width = sw;
        c.height = sh;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingQuality = 'high';
        x.drawImage(src, 0, 0, sw, sh);
        return x.getImageData(0, 0, sw, sh).data;
      };
      const a = half(cv), b = half(img);
      let sum = 0, worst = 0;
      for (let by = 0; by < sh; by += 8) for (let bx = 0; bx < sw; bx += 8) {
        let bs = 0, n = 0;
        for (let y = by; y < Math.min(sh, by + 8); y++) for (let x = bx; x < Math.min(sw, bx + 8); x++) {
          const i = (y * sw + x) * 4;
          const dv = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
          bs += dv;
          n++;
        }
        sum += bs;
        if (bs / n > worst) worst = bs / n;
      }
      return { mad: sum / (sw * sh), worst };
    }, { id, W: isReel ? REEL_W : POSTER_W, H: isReel ? REEL_H : POSTER_H, q: isReel && !qGiven ? REEL_QUALITY : opt.quality, old, shift: opt.shift, isReel, reelT: REEL_T });
    if (opt.check) {
      const ok = r.worst <= BLOCK_MAX && r.mad <= MEAN_MAX;
      if (!ok) failed = true;
      console.log(`${ok ? 'ok   ' : 'STALE'} ${id}: worst block ${r.worst.toFixed(2)} (max ${BLOCK_MAX}), mean ${r.mad.toFixed(2)} (max ${MEAN_MAX}) / 255`);
    } else {
      writeFileSync(file, Buffer.from(r.url.slice(r.url.indexOf(',') + 1), 'base64'));
      console.log(`${id}.webp  ${isReel ? REEL_W : POSTER_W}x${isReel ? REEL_H : POSTER_H}  ${(statSync(file).size / 1024).toFixed(1)} KB`);
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
