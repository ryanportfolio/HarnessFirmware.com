/* Everything the README and its art state about the site, read from the site's own source.

   Nothing here is typed in twice. The pillar words, their lines and the skills behind them
   come from the DEFAULT_PILLARS export in site/hero-pillars.mjs, the headline lead-in and
   the motion constants from that module's DEFAULTS block, the port from site/server.mjs, and
   the one-line description of each skill or memory file from scripts/readme/items.json, which
   must match the pillars' names one to one. Every skill or memory file a pillar names has to
   exist in this repository, or the build stops. */
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

  const { items } = readJson("scripts/readme/items.json");
  const named = pillars.flatMap((p) => p.skills.map((sk) => sk.name));
  for (const name of named) need(typeof items[name] === "string" && items[name], `items.json has no line for ${name}`);
  const unused = Object.keys(items).filter((name) => !named.includes(name));
  need(!unused.length, `items.json lines for names no pillar shows: ${unused.join(", ")}`);
  for (const p of pillars) for (const sk of p.skills) sk.about = items[sk.name];

  return { pillars, motion, port };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(await collectFacts(), null, 2)}\n`);
}
