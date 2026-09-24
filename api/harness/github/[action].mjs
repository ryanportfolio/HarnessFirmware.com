// Vercel function for /api/harness/github/{status,connect,callback,select,disconnect,create}.
// Delegates to the same node:http handler the local preview server mounts.
import { Readable } from 'node:stream';
import { handleCreatorRequest } from '../../../site/github-creator.mjs';

// Vercel's Node helpers read the body before the handler runs and replay it only through
// 'data'/'end' listeners, which async iteration does not use. Buffer it here and hand the
// creator a fresh stream carrying the same method, URL and headers.
async function replayable(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return req;
  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
  return Object.assign(Readable.from(body.length ? [body] : []), {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });
}

export default async function handler(req, res) {
  if (await handleCreatorRequest(await replayable(req), res)) return;
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: 'Not found' }));
}
