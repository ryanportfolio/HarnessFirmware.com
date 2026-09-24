/* Assembles README.md from the site's facts, then checks the page it wrote. */
import fs from "node:fs";
import { collectFacts } from "./facts.mjs";
import { MARKER, PRODUCT_REPO, absolute, esc, fail, readJson, writeText } from "./lib.mjs";

const facts = await collectFacts();
const repo = readJson("scripts/readme/repo.json");
const SITE = repo.homepage;
const live = (route) => `${SITE}${route === "/" ? "/" : route}`;

function picture(base, alt) {
  return `<a href="${SITE}"><picture>
<source media="(max-width: 500px) and (prefers-color-scheme: dark)" srcset="assets/readme/${base}-narrow-dark.svg">
<source media="(max-width: 500px)" srcset="assets/readme/${base}-narrow-light.svg">
<source media="(prefers-color-scheme: dark)" srcset="assets/readme/${base}-dark.svg">
<img alt="${esc(alt)}" src="assets/readme/${base}-light.svg" width="100%">
</picture></a>`;
}

const words = facts.pillars.map((p) => p.word);
const heroAlt = `Your agent's work, followed in turn by ${words.slice(0, -1).join(", ")} and ${words.at(-1)}, each with the skills behind it. The headline from the Harness Firmware home page.`;

const pageRows = facts.pages
  .map((p) => `| [\`${p.route}\`](${live(p.route)}) | [\`site/${p.file}\`](site/${p.file}) | ${p.about} |`)
  .join("\n");
const PAGES_START = "<!-- pages:start -->";
const PAGES_END = "<!-- pages:end -->";

const actions = facts.actions.map((a) => `\`${a}\``);
const m = facts.motion;

const readme = `${MARKER}

${picture("hero", heroAlt)}

This repository is the source of [harnessfirmware.com](${SITE}), the website for [Harness Firmware](${PRODUCT_REPO}). Harness Firmware is a repository starter for Claude Code and Codex: project memory committed to the repo, skills that load when a task calls them, review by a second model or a second vendor, and long-running work split into audited rounds. The firmware has its own repository; this one holds the site that explains it.

## Run it locally

The site is plain HTML, CSS and ES modules. There is nothing to install and no build step; the preview server needs Node.js.

\`\`\`sh
node site/server.mjs
\`\`\`

Then open http://127.0.0.1:${facts.port}. Set \`PORT\` to use another port. The server serves only \`site/\`, answers the same clean routes Vercel does, and mounts the API behind \`/new\`.

## Pages

${PAGES_START}
| Route | Source | What it shows |
| --- | --- | --- |
${pageRows}
${PAGES_END}

## Repository layout

| Path | What it holds |
| --- | --- |
| [\`site/\`](site) | The site: pages, styles, modules, fonts and images. [\`site/README.md\`](site/README.md) documents the fonts, the motion modules and the creator; [\`site/PROVENANCE.md\`](site/PROVENANCE.md) lists third-party assets and their licenses. |
| [\`api/harness/github/[action].mjs\`](api/harness/github) | The Vercel function behind \`/new\`, answering ${actions.slice(0, -1).join(", ")} and ${actions.at(-1)}. It passes each request to \`site/github-creator.mjs\`, the handler the local server mounts. |
| [\`vercel.json\`](vercel.json), [\`.vercelignore\`](.vercelignore) | Deploy settings: \`site/\` as the output directory, clean URLs, security headers and caching. Only \`site/\`, \`api/\` and \`vercel.json\` are uploaded. |
| [\`scripts/readme/\`](scripts/readme) | Builds this README, its art and the repository's About panel. |
| \`.claude/\`, \`.agents/\`, \`docs/\`, \`CLAUDE.md\`, \`AGENTS.md\`, \`GUIDE.md\` | Harness Firmware itself, installed here: the rules, memory and skills the agents working on this site follow. [\`GUIDE.md\`](GUIDE.md) explains them. |

## The /new creator

Without credentials, \`/new\` links to the GitHub template page for Harness Firmware. With a GitHub App configured, a visitor authorizes once and picks the skills they want; the server creates the repository from \`ryanportfolio/Harness-Firmware\`, commits the skill settings and removes the skills they left out. Tokens stay in encrypted HttpOnly cookies scoped to \`/api/harness/github\`.

To run it locally, copy \`site/.env.example\` to \`site/.env\`, fill in the GitHub App values, and start the server with the file:

\`\`\`sh
node --env-file=site/.env site/server.mjs
\`\`\`

\`--env-file\` needs Node.js 20.6 or newer. The app's permissions and callback URL are in [\`site/README.md\`](site/README.md#project-creator-new).

## Deploy

Vercel runs no build here. It serves \`site/\` as static files and \`api/\` as Node functions, as \`vercel.json\` sets out, and every push to \`main\` goes live at harnessfirmware.com. The creator's GitHub App credentials are Vercel environment variables, named as in \`site/.env.example\`.

## Tests

\`\`\`sh
node --test site/github-creator.test.mjs
node scripts/readme/verify.mjs
\`\`\`

The first covers the creator's security checks: OAuth state signing, cookie encryption, same-origin writes, repository names and skill selection. The second rebuilds this README and its art and fails if the committed copies are stale. CI runs both on every pull request.

## The README art

\`node scripts/readme/build.mjs\` draws the headline at the top of this page. It reads the ${words.length} pillar words, their lines and the skills behind each from \`site/hero-pillars.mjs\`, the module that animates the home page, and keeps that module's timing: a ${m.duration} ms entrance, a ${m.hold} ms rest, and letters that start ${m.wave} ms apart per em of width. GitHub shows README images without scripts or web fonts, so the letters are outlines cut from the site's own font files by \`scripts/readme/glyphs.py\`. Change a pillar on the site, run the build, and commit both.

## License

Code: [MIT](LICENSE). The four fonts in \`site/assets/fonts/\` are under the SIL Open Font License 1.1, and the outlines in the README art come from the same files; sources and versions are in [\`site/PROVENANCE.md\`](site/PROVENANCE.md).
`;

writeText("README.md", readme);

// Invariants of the page just written.
const md = fs.readFileSync(absolute("README.md"), "utf8");
if (md.split("\n")[0] !== MARKER) fail("README: generated marker is not the first line");
const table = md.slice(md.indexOf(PAGES_START), md.indexOf(PAGES_END));
for (const p of facts.pages) {
  const hits = table.split(`](${live(p.route)})`).length - 1;
  if (hits !== 1) fail(`README: ${p.route} linked ${hits} times in the pages table`);
}
for (const section of ["## Run it locally", "## Pages", "## Deploy", "## Tests", "## License"]) {
  if (!md.includes(`\n${section}\n`)) fail(`README: missing section ${section}`);
}
if (!md.includes("```sh\nnode site/server.mjs\n```")) fail("README: run command missing");
for (const url of [SITE, PRODUCT_REPO]) if (!md.includes(`](${url})`)) fail(`README: no link to ${url}`);
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
