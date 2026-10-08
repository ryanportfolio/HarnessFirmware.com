// Frame-stepped MP4 export of the skills reel (motion-design verify-export.md, "Frame-stepped PNG export").
// Starts docs/skill-reel/animatic/serve.mjs (repo root), opens the reel in headed Chrome through
// launchPlacedChrome (offscreen), calls window.grabFrame(t) for every frame at 1920x1080, pipes the PNGs
// to ffmpeg, and encodes H.264 High, yuv420p, BT.709, no audio stream. Then checks the file with ffprobe.
//
//   node docs/skill-reel/reel/export.mjs                      full reel
//   node docs/skill-reel/reel/export.mjs --from 13 --dur 2    a 2 s dry run
//
// Options: --from <s> (0), --dur <s> (to the end), --fps <n> (60), --blur <n> sub-frames during camera
// moves (6), --crf <n> (16), --port <n> (4378), --out <file> (D:\CoreWise\_artifacts\HarnessFirmware.com\
// skill-reel\skills-reel.mp4; a partial range gets a -<from>-<to> suffix), --ffmpeg <path>.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');

function args() {
  const o = { from: 0, dur: null, fps: 60, blur: 6, crf: 16, port: 4378, out: null, ffmpeg: null };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i].replace(/^--/, '');
    if (!(k in o)) throw new Error(`unknown option ${a[i]}`);
    const v = a[++i];
    o[k] = ['out', 'ffmpeg'].includes(k) ? v : Number(v);
  }
  return o;
}

// Find ffmpeg: --ffmpeg, then PATH (where.exe lists every match), then common install folders.
function findTool(name, hint) {
  if (hint && existsSync(hint)) return hint;
  const w = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [name], { encoding: 'utf8' });
  const hit = (w.stdout || '').split(/\r?\n/).map((s) => s.trim()).find((s) => s && existsSync(s) && statSync(s).size > 0);
  if (hit) return hit;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    path.join(home, 'ffmpeg', 'bin', name + '.exe'),
    'C:\\ffmpeg\\bin\\' + name + '.exe',
    'C:\\Program Files\\ffmpeg\\bin\\' + name + '.exe',
    'C:\\ProgramData\\chocolatey\\bin\\' + name + '.exe',
    path.join(home, 'scoop', 'shims', name + '.exe'),
  ];
  return candidates.find((c) => existsSync(c)) || null;
}

function waitForServer(child, port) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('serve.mjs did not start in 10 s')), 10000);
    child.stdout.on('data', (d) => {
      if (String(d).includes(String(port))) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('exit', (code) => reject(new Error(`serve.mjs exited with ${code}`)));
  });
}

async function main() {
  const o = args();
  const ffmpeg = findTool('ffmpeg', o.ffmpeg);
  const ffprobe = findTool('ffprobe', o.ffmpeg && path.join(path.dirname(o.ffmpeg), 'ffprobe.exe'));
  if (!ffmpeg) throw new Error('ffmpeg not found on PATH or in the usual folders; pass --ffmpeg <path>');
  console.log(`ffmpeg: ${ffmpeg}`);

  const server = spawn(process.execPath, [path.join(ROOT, 'docs/skill-reel/animatic/serve.mjs')], {
    env: { ...process.env, PORT: String(o.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser = null;
  let enc = null; // function scope so cleanup can stop the encoder whatever failed
  try {
    await waitForServer(server, o.port);
    const { launchPlacedChrome } = await import(new URL('../../../scripts/lib/launch-chrome.mjs', import.meta.url));
    try {
      browser = await launchPlacedChrome({ place: process.env.CHROME_PLACE || 'offscreen', channel: 'chrome' });
    } catch {
      browser = await launchPlacedChrome({ place: process.env.CHROME_PLACE || 'offscreen' });
    }
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    const url = `http://127.0.0.1:${o.port}/docs/skill-reel/reel/?export=1&fps=${o.fps}&blur=${o.blur}`;
    await page.goto(url);
    await page.waitForFunction(() => window.reelReady === true, null, { timeout: 60000 });
    const info = await page.evaluate(() => window.reelInfo);
    console.log(`reel total ${info.total.toFixed(3)} s (${info.formula})`);
    if (info.placeholders.length) console.warn(`placeholders in this export: ${info.placeholders.join(', ')}`);

    const from = Math.max(0, o.from);
    const to = o.dur == null ? info.total : Math.min(info.total, from + o.dur);
    const f0 = Math.round(from * o.fps), f1 = Math.round(to * o.fps);
    const partial = f0 > 0 || to < info.total;
    const defaultDir = 'D:\\CoreWise\\_artifacts\\HarnessFirmware.com\\skill-reel';
    let out = o.out || path.join(defaultDir, partial ? `skills-reel-${from}-${to}.mp4` : 'skills-reel.mp4');
    mkdirSync(path.dirname(out), { recursive: true });

    enc = spawn(ffmpeg, [
      '-y', '-v', 'error',
      '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'png', '-i', '-',
      // ffmpeg 8 takes colour tags from the frames, and PNG frames carry none: setparams writes them
      // (the -color_* output options alone left primaries and transfer "unknown", measured 2026-10-08)
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,setparams=range=tv:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709',
      '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-crf', String(o.crf), '-tune', 'grain', '-x264-params', 'aq-mode=3',
      '-g', String(o.fps * 2), '-bf', '2',
      '-color_primaries', 'bt709', '-colorspace', 'bt709', '-color_trc', 'iec61966-2-1',
      '-an', '-movflags', '+faststart',
      out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const encDone = new Promise((res, rej) => enc.on('exit', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited with ${c}`)))));
    // An encoder that dies mid-export is recorded at once (no unhandled rejection) and stops the frame loop.
    let encError = null;
    encDone.catch((e) => { encError = e; });
    enc.stdin.on('error', (e) => { encError ||= e; });

    const started = Date.now();
    let firstPng = null;
    for (let f = f0; f < f1; f++) {
      if (encError) throw encError;
      const url = await page.evaluate((t) => window.grabFrame(t), f / o.fps);
      const png = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      // Every frame must be exactly 1920 x 1080 (?export=1 fixes the canvas at that size whatever
      // the viewport); the PNG header holds width and height at bytes 16 and 20. Abort otherwise.
      const pw = png.length > 24 ? png.readUInt32BE(16) : 0, ph = png.length > 24 ? png.readUInt32BE(20) : 0;
      if (pw !== 1920 || ph !== 1080) throw new Error(`frame ${f} is ${pw}x${ph}, not 1920x1080: export aborted, ${out} is incomplete`);
      if (f === f0) firstPng = png;
      if (!enc.stdin.write(png)) await new Promise((r) => { enc.stdin.once('drain', r); enc.once('exit', r); });
      const n = f - f0 + 1;
      if (n % 60 === 0 || f === f1 - 1) {
        const s = (Date.now() - started) / 1000;
        process.stdout.write(`\rframe ${n}/${f1 - f0}  ${(n / s).toFixed(1)} fps  ${s.toFixed(0)} s`);
      }
    }
    enc.stdin.end();
    await encDone;
    process.stdout.write('\n');
    const secs = (Date.now() - started) / 1000;
    console.log(`encoded ${f1 - f0} frames in ${secs.toFixed(1)} s -> ${out} (${(statSync(out).size / 1048576).toFixed(2)} MB)`);
    if (errors.length) console.warn(`page errors:\n  ${errors.join('\n  ')}`);

    // Checks: stream facts, no audio, and a first-frame PSNR against the source PNG.
    if (ffprobe) {
      const pr = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames,color_range,color_space,color_primaries,color_transfer:format=duration', '-of', 'json', out], { encoding: 'utf8' });
      const j = JSON.parse(pr.stdout || '{}');
      const v = (j.streams || []).filter((s) => s.codec_type === 'video');
      const a = (j.streams || []).filter((s) => s.codec_type === 'audio');
      console.log('ffprobe:', JSON.stringify({ video: v, audioStreams: a.length, duration: j.format && j.format.duration }));
    }
    if (firstPng) {
      const p = path.parse(out);
      const ref = path.join(p.dir, `${p.name}-first.png`); // never the video path, whatever its extension
      writeFileSync(ref, firstPng);
      const ps = spawnSync(ffmpeg, ['-v', 'info', '-i', out, '-i', ref, '-frames:v', '1', '-lavfi', '[0:v]format=rgb24[a];[1:v]format=rgb24[b];[a][b]psnr', '-f', 'null', '-'], { encoding: 'utf8' });
      const m = /PSNR.*average:([\d.inf]+)/.exec(ps.stderr || '');
      console.log(`first frame PSNR vs source PNG: ${m ? m[1] : 'n/a'} dB (${ref})`);
    }
  } finally {
    if (enc && enc.exitCode === null && enc.signalCode === null) {
      enc.stdin.destroy();
      enc.kill();
    }
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
