/* CI gate: rebuild, then fail if README.md or any generated asset differs from what is committed.
   Line endings are ignored, so a CRLF checkout on Windows does not read as stale. The social
   preview PNG is rasterized by hand (social.mjs), so here it is only checked for its size. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { absolute } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const generated = () => [
  "README.md",
  ...fs.readdirSync(absolute("assets/readme")).filter((f) => f.endsWith(".svg")).map((f) => `assets/readme/${f}`),
];
const text = (p) => (fs.existsSync(absolute(p)) ? fs.readFileSync(absolute(p), "utf8").replaceAll("\r\n", "\n") : null);

const before = new Map(generated().map((p) => [p, text(p)]));
try {
  execFileSync(process.execPath, [path.join(here, "build.mjs")], { stdio: ["ignore", "ignore", "inherit"] });
} catch {
  process.stderr.write("FAIL build.mjs failed\n");
  process.exit(1);
}

let bad = 0;
for (const p of new Set([...before.keys(), ...generated()])) {
  if (before.get(p) !== text(p)) {
    process.stderr.write(`STALE ${p}: run node scripts/readme/build.mjs and commit the result\n`);
    bad += 1;
  }
}

const png = absolute("assets/readme/social-preview.png");
if (!fs.existsSync(png)) {
  process.stderr.write("FAIL assets/readme/social-preview.png is missing: run node scripts/readme/social.mjs\n");
  bad += 1;
} else {
  const head = fs.readFileSync(png).subarray(0, 24);
  const [w, h] = [head.readUInt32BE(16), head.readUInt32BE(20)];
  if (head.toString("latin1", 1, 4) !== "PNG" || w !== 1280 || h !== 640) {
    process.stderr.write(`FAIL social-preview.png is ${w}x${h}, GitHub wants 1280x640\n`);
    bad += 1;
  }
}

if (bad) process.exit(1);
process.stdout.write("README and its art are current.\n");
