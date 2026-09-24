/* Records which skill folders a repository generated from the Harness-Firmware template contains,
   so github-creator.test.mjs can check the /new catalog offline.

   node scripts/refresh-upstream-skills.mjs      rewrite site/new/upstream-skills.json from main

   Uses the public GitHub API; set GITHUB_TOKEN to lift the anonymous rate limit. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'ryanportfolio/Harness-Firmware';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'harnessfirmware.com',
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};

async function get(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

const branch = await get(`https://api.github.com/repos/${REPO}/branches/main`);
const commit = branch.commit.sha;
const tree = await get(`https://api.github.com/repos/${REPO}/git/trees/${commit}?recursive=1`);
if (tree.truncated) throw new Error('GitHub truncated the tree listing');

const skillsIn = (folder) => tree.tree
  .map((entry) => entry.path.match(new RegExp(`^${folder.replace('.', '\.')}/([^/]+)/SKILL\.md$`))?.[1])
  .filter(Boolean)
  .sort();

const capabilities = await get(`https://raw.githubusercontent.com/${REPO}/${commit}/.agents/skill-capabilities.json`);

const record = {
  repository: REPO,
  commit,
  claude: skillsIn('.claude/skills'),
  codex: skillsIn('.agents/skills'),
  retired: Object.keys(capabilities.retired ?? {}).sort(),
};
fs.writeFileSync(path.join(root, 'site/new/upstream-skills.json'), `${JSON.stringify(record, null, 2)}\n`);
process.stdout.write(`${REPO}@${commit.slice(0, 7)}: ${record.claude.length} Claude Code, ${record.codex.length} Codex, ${record.retired.length} retired\n`);
