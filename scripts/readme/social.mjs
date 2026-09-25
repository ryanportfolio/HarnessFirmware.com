/* Rasterizes assets/readme/social-preview.svg to the 1280 x 640 PNG GitHub uses as the link card.
   GitHub has no API for the social preview: upload the PNG in Settings > General > Social preview.
   The site serves a copy as its Open Graph image (site/assets/social-preview.png), written here too.

   Needs Playwright (the `playwright` package resolvable from this repository) and Chrome; it runs
   headed through scripts/lib/launch-chrome.mjs. Run it after build.mjs whenever the SVG changes. */
import { copyFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { launchPlacedChrome } from "../lib/launch-chrome.mjs";
import { absolute } from "./lib.mjs";

const browser = await launchPlacedChrome();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(absolute("assets/readme/social-preview.svg")).href);
  await page.screenshot({ path: absolute("assets/readme/social-preview.png"), clip: { x: 0, y: 0, width: 1280, height: 640 } });
  copyFileSync(absolute("assets/readme/social-preview.png"), absolute("site/assets/social-preview.png"));
  process.stdout.write("Wrote assets/readme/social-preview.png and site/assets/social-preview.png (1280 x 640).\n");
} finally {
  await browser.close();
}
