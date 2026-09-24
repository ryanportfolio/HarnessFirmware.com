/* Builds README.md and its art. README.md is a build artifact: edit this folder, not the page.

   node scripts/readme/build.mjs     regenerate everything below, in order, stopping at the first failure
   node scripts/readme/verify.mjs    the same build, then fail if any committed output changed (CI)
   node scripts/readme/social.mjs    rasterize the social preview PNG (needs Playwright; not run in CI) */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { absolute } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

for (const input of ["site/hero-pillars.mjs", "site/server.mjs", "scripts/readme/glyphs.json", "scripts/readme/items.json", "scripts/readme/repo.json"]) {
  if (!fs.existsSync(absolute(input))) {
    process.stderr.write(`FAIL build input missing: ${input}\n`);
    process.exit(1);
  }
}

const steps = [
  ["panels.mjs", [], "hero art from site/hero-pillars.mjs, four variants, and the social preview source"],
  ["readme.mjs", [], "README.md and its invariants"],
  ["meta.mjs", ["--lint"], "About panel: repo.json shape"],
];
for (const [file, args, what] of steps) {
  process.stderr.write(`-> ${file}  (${what})\n`);
  execFileSync(process.execPath, [path.join(here, file), ...args], { stdio: "inherit" });
}
