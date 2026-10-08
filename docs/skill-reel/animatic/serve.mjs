// Tiny static server for the skills-reel animatic. Serves the repo root on 127.0.0.1 so the
// animatic is at /docs/skill-reel/animatic/ and the site fonts at /site/assets/fonts/.
// No dependencies. Usage: node docs/skill-reel/animatic/serve.mjs   (PORT env, default 4361)

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 4361;
const START = '/docs/skill-reel/animatic/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, text, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed', { Allow: 'GET, HEAD' });

  let url, rel;
  try {
    url = new URL(req.url, 'http://localhost');
    rel = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, 'bad request');
  }
  if (rel === '/') return send(res, 302, 'see ' + START, { Location: START });

  // Refuse NUL bytes, any dot segment (.., .git, .env) and anything that resolves outside ROOT.
  if (rel.includes('\0') || rel.split(/[\\/]/).some((s) => s.startsWith('.'))) return send(res, 403, 'forbidden');
  let file = path.resolve(ROOT, '.' + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return send(res, 403, 'forbidden');

  try {
    let st = await stat(file);
    if (st.isDirectory()) {
      if (!url.pathname.endsWith('/')) return send(res, 301, 'moved', { Location: url.pathname + '/' + url.search });
      file = path.join(file, 'index.html');
      st = await stat(file);
    }
    if (!st.isFile()) return send(res, 404, 'not found');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    send(res, 404, 'not found');
  }
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `port ${PORT} is in use; set PORT to another value` : err.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`serving ${ROOT}`);
  console.log(`animatic: http://${HOST}:${PORT}${START}`);
});
