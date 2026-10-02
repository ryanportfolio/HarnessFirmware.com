// The /skills page is hand-written HTML. These tests keep it in step with the skill catalog that
// /new uses (new/skill-catalog.js), which github-creator.test.mjs keeps in step with the template.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HARNESS_SKILL_CATALOG, harnessSkillFolders } from './new/skill-catalog.js';

const page = readFileSync(new URL('./skills.html', import.meta.url), 'utf8');
const creator = readFileSync(new URL('./new.html', import.meta.url), 'utf8');

// skill-showcase.mjs opens the page on this category; the HTML ships already filtered to it.
const FIRST_CATEGORY = 'audit';

const entries = [...page.matchAll(/<details class="ss-entry"([^>]*)>([\s\S]*?)<\/details>/g)].map(([, attrs, body]) => ({
  id: attrs.match(/\bid="([^"]*)"/)?.[1],
  name: attrs.match(/\bdata-skill-id="([^"]*)"/)?.[1],
  category: attrs.match(/\bdata-category="([^"]*)"/)?.[1],
  off: /\bdata-ss-off\b/.test(attrs),
  source: body.match(/<a href="([^"]*)">Read [^<]* source/)?.[1],
}));

test('the skills page lists exactly the catalog skills', () => {
  const pageNames = entries.map((entry) => entry.name);
  const catalogNames = HARNESS_SKILL_CATALOG.map((skill) => skill.name);
  const duplicates = pageNames.filter((name, index) => pageNames.indexOf(name) !== index);
  const missing = catalogNames.filter((name) => !pageNames.includes(name));
  const extra = pageNames.filter((name) => !catalogNames.includes(name));
  assert.deepEqual(
    { missing, extra, duplicates },
    { missing: [], extra: [], duplicates: [] },
    `site/skills.html and site/new/skill-catalog.js disagree. In the catalog but not on the page: ${missing.join(', ') || 'none'}. On the page but not in the catalog: ${extra.join(', ') || 'none'}. Listed twice: ${duplicates.join(', ') || 'none'}.`,
  );
});

test('each skills page entry links its own anchor and the source folder of its runtime', () => {
  for (const entry of entries) {
    const skill = HARNESS_SKILL_CATALOG.find((item) => item.name === entry.name);
    if (!skill) continue;
    assert.equal(entry.id, `skill-${skill.name}`, `${skill.name}: the entry id must be skill-${skill.name}`);
    const folder = harnessSkillFolders(skill)[0];
    assert.equal(
      entry.source,
      `https://github.com/ryanportfolio/Harness-Firmware/blob/main/${folder}/SKILL.md`,
      `${skill.name}: the source link must point at ${folder}/SKILL.md`,
    );
  }
});

test('the skills page ships filtered to its first category, with the right count', () => {
  const shown = entries.filter((entry) => entry.category === FIRST_CATEGORY);
  for (const entry of entries) {
    assert.equal(entry.off, entry.category !== FIRST_CATEGORY, `${entry.name}: data-ss-off belongs on every entry outside ${FIRST_CATEGORY}, and only there`);
  }
  assert.match(page, new RegExp(`<span class="ss-count"[^>]*>${shown.length} shown</span>`), `the static count must read ${shown.length} shown`);
});

test('the creator page counts every catalog skill before its script runs', () => {
  const total = HARNESS_SKILL_CATALOG.length;
  assert.ok(creator.includes(`aria-label="Customize skills, ${total} enabled"`), `site/new.html: the skills button label must say ${total} enabled`);
  assert.ok(creator.includes(`aria-live="polite">${total} enabled</output>`), `site/new.html: #skill-count must read ${total} enabled`);
  assert.ok(creator.includes(`aria-live="polite">${total} skills enabled</output>`), `site/new.html: #skill-picker-count must read ${total} skills enabled`);
});
