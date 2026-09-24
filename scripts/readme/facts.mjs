/* Everything the README and its art state about the site, read from the site's own source.

   Nothing here is typed in twice. The pillar words, their lines and the skills behind them
   come from the DEFAULT_PILLARS export in site/hero-pillars.mjs, the headline lead-in and
   the motion constants from that module's DEFAULTS block, the routes from site/server.mjs
   (which mirrors vercel.json cleanUrls), the port likewise. Every skill or memory file a
   pillar names has to exist in this repository, or the build stops. */
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { absolute, read, readJson } from "./lib.mjs";

function need(condition, message) {
  if (!condition) throw new Error(`facts: ${message}`);
}

function constant(source, key, pattern) {
  const match = source.match(new RegExp(`^\\s*${key}:\\s*(${pattern}),`, "m"));
  need(match, `site/hero-pillars.mjs has no ${key} in DEFAULTS`);
  return match[1];
}

export async function collectFacts() {
  const heroSource = read("site/hero-pillars.mjs");
  const hero = await import(pathToFileURL(absolute("site/hero-pillars.mjs")).href);
  const pillars = hero.DEFAULT_PILLARS.map((p) => ({
    word: p.word,
    line: p.line,
    stage: p.stage,
    label: p.skillsLabel || "Skills",
    skills: p.skills.map((s) => ({ name: s.name, tag: s.tag || "" })),
  }));
  need(pillars.length === 6, `expected the six home-page pillars, found ${pillars.length}`);

  for (const p of pillars) {
    for (const s of p.skills) {
      const target = s.name.endsWith(".md")
        ? `.claude/reference/${s.name}`
        : `.claude/skills/${s.name.replace(/^\//, "")}/SKILL.md`;
      need(fs.existsSync(absolute(target)), `pillar "${p.word}" names ${s.name}, but ${target} is missing`);
    }
  }

  const easeName = JSON.parse(constant(heroSource, "ease", "'[a-z-]+'").replaceAll("'", '"'));
  const motion = {
    lead: JSON.parse(constant(heroSource, "lead", '"[^"]+"')),
    duration: Number(constant(heroSource, "duration", "\\d+")),
    hold: Number(constant(heroSource, "hold", "\\d+")),
    wave: Number(constant(heroSource, "wave", "\\d+")),
    gap: Number(constant(heroSource, "gap", "\\d+")),
    ease: hero.EASINGS[easeName],
  };
  need(motion.ease, `easing ${easeName} is not in EASINGS`);

  const server = read("site/server.mjs");
  const port = Number(server.match(/Number\(process\.env\.PORT\)\|\|(\d+)/)?.[1]);
  need(port, "site/server.mjs default port not found");
  const routeMap = Object.fromEntries(
    [...server.matchAll(/'(\/[a-z-]+)':'(\/[a-z-]+\.html)'/g)].map((m) => [m[1], m[2].slice(1)]),
  );
  routeMap["/"] = "index.html";

  const inventory = readJson("scripts/readme/items.json");
  const pages = inventory.pages.map((page) => {
    need(routeMap[page.route] === page.file, `${page.route} is served from ${routeMap[page.route]}, items.json says ${page.file}`);
    need(fs.existsSync(absolute(`site/${page.file}`)), `site/${page.file} is missing`);
    return page;
  });
  const unlisted = Object.keys(routeMap).filter((route) => !pages.some((p) => p.route === route));
  need(!unlisted.length, `routes missing from items.json: ${unlisted.join(", ")}`);

  const vercel = readJson("vercel.json");
  need(vercel.outputDirectory === "site" && vercel.cleanUrls === true, "vercel.json no longer serves site/ with clean URLs");
  need(fs.existsSync(absolute("api/harness/github/[action].mjs")), "the creator function moved");
  const actions = read("api/harness/github/[action].mjs").match(/\{([a-z,]+)\}/)?.[1].split(",") ?? [];
  need(actions.length > 0, "creator actions not listed in the function header");

  return { pillars, motion, port, pages, actions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(await collectFacts(), null, 2)}\n`);
}
