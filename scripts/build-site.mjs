/* Deploy build. Copies site/ to dist/ and minifies its JavaScript and CSS with esbuild, file by
   file (no bundling, so every module keeps its URL and its imports). Vercel runs it through
   vercel.json's buildCommand and serves dist/; the repository keeps the readable source.
   HTML, SVG, images, fonts and JSON are copied unchanged.

     npm install && node scripts/build-site.mjs      (then: PORT=4350 node dist/server.mjs) */
import { transform } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "site");
const out = path.join(root, "dist");
const loaders = { ".js": "js", ".mjs": "js", ".css": "css" };

await fs.rm(out, { recursive: true, force: true });
await fs.cp(source, out, { recursive: true, filter: (file) => !path.basename(file).startsWith(".") });

let before = 0, after = 0, files = 0;
for (const entry of await fs.readdir(out, { recursive: true, withFileTypes: true })) {
  const loader = entry.isFile() && loaders[path.extname(entry.name)];
  if (!loader) continue;
  const file = path.join(entry.parentPath, entry.name);
  const code = await fs.readFile(file, "utf8");
  const result = await transform(code, { loader, minify: true, legalComments: "inline", sourcefile: path.relative(out, file) });
  for (const warning of result.warnings) console.warn(`${path.relative(out, file)}: ${warning.text}`);
  await fs.writeFile(file, result.code);
  before += Buffer.byteLength(code); after += Buffer.byteLength(result.code); files++;
}
console.log(`dist/: minified ${files} JS and CSS files, ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
