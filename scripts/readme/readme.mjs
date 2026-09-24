/* Assembles README.md from the site's facts, then checks the page it wrote. */
import fs from "node:fs";
import { collectFacts } from "./facts.mjs";
import { MARKER, PRODUCT_REPO, absolute, esc, fail, readJson, writeText } from "./lib.mjs";

const facts = await collectFacts();
const repo = readJson("scripts/readme/repo.json");
const SITE = repo.homepage;
const CREATOR = `${SITE}/new`;

// GitHub treats a line starting with a bare <a ...> tag as the start of a raw HTML block only
// when the tag is alone on its line; `<a ...><picture>` on one line is read as inline markdown
// and the link closes before the art. Keep the tags on their own lines, with no blank line inside.
function picture(base, alt) {
  return `<a href="${SITE}">
<picture>
<source media="(max-width: 500px) and (prefers-color-scheme: dark)" srcset="assets/readme/${base}-narrow-dark.svg">
<source media="(max-width: 500px)" srcset="assets/readme/${base}-narrow-light.svg">
<source media="(prefers-color-scheme: dark)" srcset="assets/readme/${base}-dark.svg">
<img alt="${esc(alt)}" src="assets/readme/${base}-light.svg" width="100%">
</picture>
</a>`;
}

const words = facts.pillars.map((p) => p.word);
const heroAlt = `Your agent's work, followed in turn by ${words.slice(0, -1).join(", ")} and ${words.at(-1)}, each with the skills behind it. The headline from the Harness Firmware home page.`;

const heading = (word) => word[0].toUpperCase() + word.slice(1);
const item = (s) => `- \`${s.name}\`${s.tag ? ` (${s.tag})` : ""}: ${s.about}`;
const pillars = facts.pillars
  .map((p) => `### ${heading(p.word)}\n\n${p.line}\n\n${p.skills.map(item).join("\n")}`)
  .join("\n\n");

const readme = `${MARKER}

${picture("hero", heroAlt)}

Coding agents start every session from zero. [Harness Firmware](${PRODUCT_REPO}) is a set of files you add to a repository so Claude Code and Codex work from the project's own rules, memory and workflows. The agent loads a skill or a note only when the task calls for it, a second model reviews the work before you approve it, and what one session learns is written down for the next.

## What it does for your agent

${pillars}

## Get started

Start a new repository with the firmware at [harnessfirmware.com/new](${CREATOR}).

The firmware itself lives in [ryanportfolio/Harness-Firmware](${PRODUCT_REPO}). Use it as a GitHub template, or copy its skills into a repository you already have.

## This repository

This repository is the source of [harnessfirmware.com](${SITE}). To run the site locally with Node.js, with nothing to install:

\`\`\`sh
node site/server.mjs
\`\`\`

Then open http://127.0.0.1:${facts.port}.

Code is under the [MIT License](LICENSE). The fonts in \`site/assets/fonts/\`, and the letter outlines in the art above, are under the SIL Open Font License 1.1; sources and versions are in [\`site/PROVENANCE.md\`](site/PROVENANCE.md).
`;

writeText("README.md", readme);

// Invariants of the page just written.
const md = fs.readFileSync(absolute("README.md"), "utf8");
const count = (needle) => md.split(needle).length - 1;
if (md.split("\n")[0] !== MARKER) fail("README: generated marker is not the first line");
if (!md.includes(`\n\n<a href="${SITE}">\n<picture>\n`) || !md.includes("\n</picture>\n</a>\n\n")) {
  fail("README: the hero link must open and close on lines of its own around <picture>");
}
for (const section of ["## What it does for your agent", "## Get started", "## This repository"]) {
  if (count(`\n${section}\n`) !== 1) fail(`README: section ${section} must appear once`);
}
for (const p of facts.pillars) {
  if (count(`\n### ${heading(p.word)}\n`) !== 1) fail(`README: pillar ${p.word} must have one heading`);
  for (const s of p.skills) {
    if (count(`\n- \`${s.name}\``) !== 1) fail(`README: ${s.name} must be listed once`);
  }
}
if (!md.includes("```sh\nnode site/server.mjs\n```")) fail("README: run command missing");
for (const url of [SITE, CREATOR, PRODUCT_REPO]) if (!md.includes(`](${url})`)) fail(`README: no link to ${url}`);
if (!md.includes("](LICENSE)")) fail("README: no link to LICENSE");
for (const [, target] of md.matchAll(/\]\((?!https?:|#)([^)#]+)(?:#[^)]*)?\)/g)) {
  if (!fs.existsSync(absolute(target))) fail(`README: link target ${target} does not exist`);
}
for (const [, asset] of md.matchAll(/(?:src|srcset)="([^"]+)"/g)) {
  if (!fs.existsSync(absolute(asset))) fail(`README: missing asset ${asset}`);
}
for (const line of md.split("\n")) {
  if (/^#{1,6} .*\.$/.test(line)) fail(`README: heading ends with a period: ${line}`);
}
if (/[\u2013\u2014]/.test(md)) fail("README: contains an en or em dash");

process.stdout.write("Generated README.md.\n");
