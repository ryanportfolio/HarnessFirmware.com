import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { test } from 'node:test';
import {
  HARNESS_REMOVAL_RECORD_PATH,
  HARNESS_SESSION_COOKIE,
  HARNESS_TEMPLATE_MANIFEST_PATH,
  HarnessManifestError,
  createPkceChallenge,
  createPkceVerifier,
  decryptHarnessPayload,
  encryptHarnessPayload,
  githubAppConfigured,
  handleCreatorRequest,
  isValidRepositoryName,
  manifestEntryMatches,
  manifestRemovalProblems,
  mergeSkillOverrides,
  normalizeDisabledSkills,
  parseTemplateManifest,
  plannedRepositorySetup,
  plannedSkillSelection,
  removalRecordText,
  sameOriginRequest,
  signHarnessPayload,
  skillDeletionEntries,
  verifyHarnessPayload,
} from './github-creator.mjs';
import {
  HARNESS_SKILL_CATALOG,
  HARNESS_SKILL_GROUPS,
  harnessMinimumSkills,
  harnessRemovalProblems,
  harnessSkillFolders,
  toggleHarnessSkill,
} from './new/skill-catalog.js';
import { HARNESS_REQUIRED_SKILLS, HARNESS_SKILL_DEPENDENCIES } from './new/skill-rules.js';

// Recorded upstream tree; refresh with node scripts/refresh-upstream-skills.mjs.
const upstream = JSON.parse(readFileSync(new URL('./new/upstream-skills.json', import.meta.url), 'utf8'));

test('skill selection accepts only unique optional catalog entries', () => {
  assert.deepEqual(normalizeDisabledSkills(['lab', 'refine']), ['refine', 'lab']);
  assert.deepEqual(normalizeDisabledSkills([]), []);
  assert.equal(normalizeDisabledSkills(['init-project']), null);
  assert.equal(normalizeDisabledSkills(['lab', 'lab']), null);
  assert.equal(normalizeDisabledSkills(['unknown-skill']), null);
  assert.equal(normalizeDisabledSkills(['external-review']), null);
  for (const retired of ['verify-this', 'automate-me', 'merge']) assert.equal(normalizeDisabledSkills([retired]), null);
  assert.equal(normalizeDisabledSkills('lab'), null);
});

test('skill overrides merge without disturbing repository settings', () => {
  const settings = JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'safe-command' }] }] },
    skillOverrides: { bro: 'off', refine: 'on', 'team-local-skill': 'off' },
  });
  const merged = JSON.parse(mergeSkillOverrides(settings, ['refine', 'lab']));
  assert.deepEqual(merged.hooks, { SessionStart: [{ hooks: [{ type: 'command', command: 'safe-command' }] }] });
  assert.deepEqual(merged.skillOverrides, { refine: 'off', 'team-local-skill': 'off', lab: 'off' });
  assert.equal(JSON.parse(mergeSkillOverrides('{}', [])).skillOverrides, undefined);
  assert.throws(() => mergeSkillOverrides('[]', []));
});

test('GitHub App mode requires every server secret', () => {
  const full = {
    GITHUB_APP_ID: '1', GITHUB_APP_SLUG: 'harness', GITHUB_APP_CLIENT_ID: 'id',
    GITHUB_APP_CLIENT_SECRET: 'secret', HARNESS_SESSION_SECRET: 'x'.repeat(32),
  };
  assert.equal(githubAppConfigured(full), true);
  for (const key of Object.keys(full)) assert.equal(githubAppConfigured({ ...full, [key]: '' }), false);
});

test('signed OAuth state payloads reject tampering', () => {
  const signed = signHarnessPayload({ nonce: 'abc', issuedAt: 1 }, 'secret');
  assert.deepEqual(verifyHarnessPayload(signed, 'secret'), { nonce: 'abc', issuedAt: 1 });
  assert.equal(verifyHarnessPayload(signed, 'other'), null);
  assert.equal(verifyHarnessPayload(`${signed}x`, 'secret'), null);
  assert.equal(verifyHarnessPayload('nope', 'secret'), null);
});

test('encrypted payloads reject disclosure and tampering', () => {
  const encrypted = encryptHarnessPayload({ accessToken: 'ghu_token' }, 'secret');
  assert.ok(!encrypted.includes('ghu_token'));
  assert.deepEqual(decryptHarnessPayload(encrypted, 'secret'), { accessToken: 'ghu_token' });
  assert.equal(decryptHarnessPayload(encrypted, 'other'), null);
  const [iv, tag, body] = encrypted.split('.');
  assert.equal(decryptHarnessPayload(`${iv}.${tag}.${body.slice(0, -2)}AA`, 'secret'), null);
});

test('repository names reject paths and all-dot values', () => {
  assert.equal(isValidRepositoryName('my-new_project.v2'), true);
  assert.equal(isValidRepositoryName('..'), false);
  assert.equal(isValidRepositoryName('a/b'), false);
  assert.equal(isValidRepositoryName(''), false);
  assert.equal(isValidRepositoryName('x'.repeat(101)), false);
});

test('PKCE verifier is secret-bound and produces an S256 challenge', () => {
  const verifier = createPkceVerifier('nonce', 'secret');
  assert.notEqual(verifier, createPkceVerifier('nonce', 'other'));
  assert.match(createPkceChallenge(verifier), /^[A-Za-z0-9_-]{43}$/);
});

test('write requests require an exact same origin', () => {
  const url = new URL('http://127.0.0.1:4347/api/harness/github/create');
  assert.equal(sameOriginRequest('http://127.0.0.1:4347', url), true);
  assert.equal(sameOriginRequest('http://localhost:4347', url), false);
  assert.equal(sameOriginRequest(undefined, url), false);
  assert.equal(sameOriginRequest('garbage', url), false);
});

test('catalog lists exactly the skills a generated repository contains', () => {
  const names = HARNESS_SKILL_CATALOG.map((skill) => skill.name);
  assert.equal(new Set(names).size, names.length, 'duplicate catalog entry');
  const upstreamNames = [...new Set([...upstream.claude, ...upstream.codex])].sort();
  assert.deepEqual([...names].sort(), upstreamNames);
  for (const skill of HARNESS_SKILL_CATALOG) {
    const expected = [
      upstream.claude.includes(skill.name) && `.claude/skills/${skill.name}`,
      upstream.codex.includes(skill.name) && `.agents/skills/${skill.name}`,
    ].filter(Boolean);
    assert.deepEqual(harnessSkillFolders(skill), expected, `${skill.name} runtime folders`);
  }
});

test('catalog names no retired skill', () => {
  const names = new Set(HARNESS_SKILL_CATALOG.map((skill) => skill.name));
  for (const retired of new Set([...upstream.retired, 'verify-this', 'automate-me', 'merge'])) {
    assert.equal(names.has(retired), false, `${retired} is retired upstream`);
  }
});

test('catalog entries are complete', () => {
  const groups = new Set(HARNESS_SKILL_GROUPS.map((group) => group.id));
  for (const skill of HARNESS_SKILL_CATALOG) {
    assert.ok(groups.has(skill.group), `${skill.name} group`);
    assert.ok(skill.label && skill.description, `${skill.name} copy`);
    assert.doesNotMatch(skill.description, /[.—]$|—/, `${skill.name} description punctuation`);
  }
});

test('deselecting a skill deletes its folders in every runtime that holds it', () => {
  const tree = [];
  for (const skill of HARNESS_SKILL_CATALOG) {
    for (const folder of harnessSkillFolders(skill)) {
      tree.push({ path: `${folder}/SKILL.md`, mode: '100644', type: 'blob', sha: 'a' });
      tree.push({ path: `${folder}/references/notes.md`, mode: '100644', type: 'blob', sha: 'b' });
    }
  }
  tree.push({ path: '.claude/skills/lab-extra/SKILL.md', mode: '100644', type: 'blob', sha: 'c' });
  tree.push({ path: '.claude/skills/lab', mode: '040000', type: 'tree', sha: 'd' });

  const paths = (skills) => skillDeletionEntries(tree, skills).map((entry) => entry.path).sort();
  assert.deepEqual(paths(['lab']), [
    '.agents/skills/lab/SKILL.md', '.agents/skills/lab/references/notes.md',
    '.claude/skills/lab/SKILL.md', '.claude/skills/lab/references/notes.md',
  ]);
  assert.deepEqual(paths(['long-horizon-workflows']), [
    '.claude/skills/long-horizon-workflows/SKILL.md', '.claude/skills/long-horizon-workflows/references/notes.md',
  ]);
  assert.ok(skillDeletionEntries(tree, ['lab']).every((entry) => entry.sha === null));
  assert.throws(() => skillDeletionEntries(tree.filter((entry) => entry.path !== '.agents/skills/lab/SKILL.md'), ['lab']), /missing/);
});

// A tree holding every catalog skill folder, as a generated repository has.
function fullTree() {
  return HARNESS_SKILL_CATALOG.flatMap((skill) => harnessSkillFolders(skill).map((folder) => (
    { path: `${folder}/SKILL.md`, mode: '100644', type: 'blob', sha: 'a' }
  )));
}

test('skill rules match the template removal block', () => {
  assert.deepEqual(HARNESS_REQUIRED_SKILLS, upstream.removal.required);
  assert.deepEqual(HARNESS_SKILL_DEPENDENCIES, upstream.removal.dependencies);
  const names = new Set(HARNESS_SKILL_CATALOG.map((skill) => skill.name));
  for (const [name, needs] of Object.entries(HARNESS_SKILL_DEPENDENCIES)) {
    for (const skill of [name, ...needs]) assert.ok(names.has(skill), `${skill} is in the catalog`);
  }
  assert.deepEqual(
    HARNESS_SKILL_CATALOG.filter((skill) => skill.required).map((skill) => skill.name).sort(),
    ['external-review', 'init-project'],
  );
});

test('skill selection rejects removals that break a dependency', () => {
  assert.equal(normalizeDisabledSkills(['codex-fullreview']), null);
  assert.equal(normalizeDisabledSkills(['impartial-review']), null);
  assert.equal(normalizeDisabledSkills(['impartial-review', 'codex-fullreview']), null);
  assert.equal(normalizeDisabledSkills(['codex-review']), null);
  assert.deepEqual(normalizeDisabledSkills(['astra-fullreview', 'codex-fullreview']), ['codex-fullreview', 'astra-fullreview']);
  assert.deepEqual(normalizeDisabledSkills(['astra-review', 'codex-review']), ['codex-review', 'astra-review']);
  assert.deepEqual(harnessRemovalProblems(['codex-fullreview']), [
    'astra-fullreview needs codex-fullreview; keep codex-fullreview or remove astra-fullreview too',
  ]);
  assert.deepEqual(harnessRemovalProblems(['init-project']), ['init-project is required and cannot be removed']);
  const optional = HARNESS_SKILL_CATALOG.filter((skill) => !skill.required).map((skill) => skill.name);
  assert.equal(normalizeDisabledSkills(optional).length, optional.length);
});

test('removal record has the exact template format', () => {
  assert.equal(
    removalRecordText(['lab', 'astra-fullreview', 'codex-fullreview']),
    '{\n  "version": 1,\n  "removed": [\n    "astra-fullreview",\n    "codex-fullreview",\n    "lab"\n  ]\n}\n',
  );
});

test('removals write the record in the same change set that deletes the folders', () => {
  const plan = plannedSkillSelection(fullTree(), '{}', ['lab', 'codex-fullreview', 'astra-fullreview']);
  assert.deepEqual(plan.writes.map((write) => write.path), ['.claude/settings.json', HARNESS_REMOVAL_RECORD_PATH]);
  assert.equal(plan.writes[1].content, removalRecordText(['astra-fullreview', 'codex-fullreview', 'lab']));
  assert.deepEqual(
    JSON.parse(plan.writes[0].content).skillOverrides,
    { 'codex-fullreview': 'off', 'astra-fullreview': 'off', lab: 'off' },
  );
  assert.deepEqual(plan.deletions.map((entry) => entry.path).sort(), [
    '.agents/skills/lab/SKILL.md',
    '.claude/skills/astra-fullreview/SKILL.md',
    '.claude/skills/codex-fullreview/SKILL.md',
    '.claude/skills/lab/SKILL.md',
  ]);
});

test('no removals leave the template record untouched', () => {
  const plan = plannedSkillSelection(fullTree(), '{}', []);
  assert.deepEqual(plan.writes.map((write) => write.path), ['.claude/settings.json']);
  assert.deepEqual(plan.deletions, []);
});

test('picker keeps a needed skill ticked and names what needs it', () => {
  const all = new Set(HARNESS_SKILL_CATALOG.map((skill) => skill.name));
  let result = toggleHarnessSkill(all, 'codex-fullreview', false);
  assert.ok(result.enabled.has('codex-fullreview'));
  assert.equal(result.note, 'Kept: astra-fullreview needs it');
  result = toggleHarnessSkill(all, 'impartial-review', false);
  assert.ok(result.enabled.has('impartial-review'));
  assert.equal(result.note, 'Kept: codex-fullreview, astra-fullreview need it');
  result = toggleHarnessSkill(all, 'init-project', false);
  assert.ok(result.enabled.has('init-project'));
  result = toggleHarnessSkill(toggleHarnessSkill(all, 'astra-fullreview', false).enabled, 'codex-fullreview', false);
  assert.equal(result.enabled.has('codex-fullreview'), false);
  assert.equal(result.note, null);
});

test('picker ticks what a ticked skill needs', () => {
  const minimum = harnessMinimumSkills();
  assert.deepEqual([...minimum].sort(), ['external-review', 'init-project']);
  const result = toggleHarnessSkill(minimum, 'astra-fullreview', true);
  assert.deepEqual(
    [...result.enabled].sort(),
    ['astra-fullreview', 'codex-fullreview', 'external-review', 'impartial-review', 'init-project'],
  );
  assert.equal(result.note, 'Also on: codex-fullreview, impartial-review');
  const disabled = HARNESS_SKILL_CATALOG.filter((skill) => !result.enabled.has(skill.name)).map((skill) => skill.name);
  assert.deepEqual(harnessRemovalProblems(disabled), []);
});

// ---------------------------------------------------------------------------
// Template manifest and the project setup commit.

// The manifest as the template spec defines it (version 1).
function fixtureManifest(overrides = {}) {
  return {
    version: 1,
    template: 'ryanportfolio/Harness-Firmware',
    requiredFiles: [
      '.agents/template-manifest.json', 'AGENTS.md', '.agents/skills/init-project/SKILL.md',
      '.claude/skills/init-project/SKILL.md', '.claude/scripts/sync-codex-skills.mjs',
    ],
    projectPaths: ['.agents', '.claude', '.gitattributes', '.gitignore', '.mcp.json', 'AGENTS.md', 'CLAUDE.md', 'docs/codex-skills.md', 'scripts/lib'],
    templateOnly: [
      '.claude-plugin', '.github/ISSUE_TEMPLATE', '.github/workflows/validate-template.yml', 'CHANGELOG.md',
      'CONTRIBUTING.md', 'GUIDE.md', 'LICENSE', 'README.md', 'assets/diagrams', 'assets/readme', 'bootstrap',
      'docs/research', 'docs/specs', 'docs/superpowers', 'scripts/diagrams', 'scripts/readme',
    ],
    readmeStub: '# {name}\n',
    skills: {
      groups: [
        { id: 'core', label: 'Core workflows', description: 'Setup, memory, maintenance, and everyday project control', skills: ['init-project'] },
        { id: 'discipline', label: 'Quality disciplines', description: 'Planning, review, and dependable long-form execution', skills: ['codex-review'] },
        { id: 'specialist', label: 'Specialist tools', description: 'Focused modes for design, writing, critique, and delivery', skills: ['lab'] },
      ],
      required: ['external-review', 'init-project'],
      dependencies: {
        'astra-fullreview': ['codex-fullreview', 'impartial-review'],
        'astra-review': ['codex-review', 'external-review'],
        'codex-fullreview': ['impartial-review'],
        'codex-review': ['external-review'],
        'merge-ready': ['codex-fullreview', 'codex-review'],
      },
      presets: { minimal: { omit: ['advocate', 'enhance-prompt', 'fable-mode', 'forge-repo-ui-skill', 'handoff-audit', 'lab', 'why'] } },
    },
    ...overrides,
  };
}

// Files under template-only entries, including files nested in template-only folders.
const TEMPLATE_ONLY_FILES = [
  '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json',
  '.github/ISSUE_TEMPLATE/bug_report.md', '.github/workflows/validate-template.yml',
  'CHANGELOG.md', 'CONTRIBUTING.md', 'GUIDE.md', 'LICENSE', 'README.md',
  'assets/diagrams/flow.svg', 'assets/readme/hero.svg', 'assets/readme/dark/hero-dark.svg',
  'bootstrap/new-claude-project.sh', 'bootstrap/NewProjectCore.psm1', 'bootstrap/tests/check-template-manifest.mjs',
  'docs/research/notes.md', 'docs/specs/2026-10-01-template-manifest-design.md', 'docs/superpowers/plan.md',
  'scripts/diagrams/build.mjs', 'scripts/readme/build.mjs', 'scripts/readme/lib/svg.mjs',
];
// Project files, including names that share a prefix with a template-only entry but are not under it.
const PROJECT_FILES = [
  '.agents/removed-skills.json', '.claude/settings.json', '.claude/scripts/sync-codex-skills.mjs',
  '.gitattributes', '.gitignore', '.mcp.json', 'AGENTS.md', 'CLAUDE.md',
  'docs/codex-skills.md', 'docs/specs-archive/old.md', 'scripts/lib/launch-chrome.mjs', 'scripts/readme.txt',
];

// A generated repository: every catalog skill folder, project files, template-only files, the
// manifest blob (when present), and the folder entries a recursive tree lists.
function generatedTree({ withManifest = true } = {}) {
  const blob = (path, sha = `sha-${path}`) => ({ path, mode: '100644', type: 'blob', sha });
  const entries = [
    ...fullTree(),
    ...PROJECT_FILES.map((path) => blob(path)),
    ...TEMPLATE_ONLY_FILES.map((path) => blob(path)),
    { path: 'bootstrap', mode: '040000', type: 'tree', sha: 'tree-bootstrap' },
    { path: 'docs', mode: '040000', type: 'tree', sha: 'tree-docs' },
  ];
  if (withManifest) entries.push(blob(HARNESS_TEMPLATE_MANIFEST_PATH, 'manifest-sha'));
  return entries;
}

const isTemplateOnly = (manifest, path) => manifest.templateOnly.some((entry) => manifestEntryMatches(entry, path));

// The repository's files after a plan is applied: path -> written content, or true when kept as is.
function applyPlan(tree, plan) {
  const deleted = new Set(plan.deletions.map((entry) => entry.path));
  const files = new Map(tree.filter((entry) => entry.type !== 'tree' && !deleted.has(entry.path)).map((entry) => [entry.path, true]));
  for (const write of plan.writes) files.set(write.path, write.content);
  return files;
}

test('the fixture covers every template-only entry', () => {
  const manifest = fixtureManifest();
  for (const entry of manifest.templateOnly) {
    assert.ok(TEMPLATE_ONLY_FILES.some((path) => manifestEntryMatches(entry, path)), `${entry} has a fixture file`);
  }
  for (const path of PROJECT_FILES) assert.equal(isTemplateOnly(manifest, path), false, `${path} is a project file`);
});

test('setup plan strips every template-only path, keeps required files, and writes the README stub', () => {
  const manifest = fixtureManifest();
  const tree = generatedTree();
  const plan = plannedRepositorySetup({ treeEntries: tree, manifest, repositoryName: 'my-app', settingsText: '{}', disabledSkills: [] });
  const files = applyPlan(tree, plan);

  for (const path of files.keys()) {
    if (path === 'README.md') continue;
    assert.equal(isTemplateOnly(manifest, path), false, `${path} is template-only and must be removed`);
  }
  for (const path of TEMPLATE_ONLY_FILES.filter((path) => path !== 'README.md')) assert.equal(files.has(path), false, `${path} removed`);
  assert.equal(files.get('README.md'), '# my-app\n');
  for (const path of manifest.requiredFiles) assert.ok(files.has(path), `${path} kept`);
  for (const path of PROJECT_FILES) assert.equal(files.get(path), true, `${path} kept unchanged`);
  assert.ok(plan.deletions.every((entry) => entry.sha === null && entry.type === 'blob'));
  assert.equal(plan.deletions.some((entry) => entry.path === 'README.md'), false, 'README is replaced, not deleted');
  // With nothing deselected the settings and the removal record stay as the template shipped them.
  assert.deepEqual(plan.writes.map((write) => write.path), ['README.md']);
});

test('setup plan also applies skill removals in the same change set', () => {
  const manifest = fixtureManifest();
  const tree = generatedTree();
  const plan = plannedRepositorySetup({ treeEntries: tree, manifest, repositoryName: 'my-app', settingsText: '{}', disabledSkills: ['lab'] });
  assert.deepEqual(plan.writes.map((write) => write.path), ['README.md', '.claude/settings.json', HARNESS_REMOVAL_RECORD_PATH]);
  const files = applyPlan(tree, plan);
  assert.equal(files.has('.claude/skills/lab/SKILL.md'), false);
  assert.equal(files.has('.agents/skills/lab/SKILL.md'), false);
  assert.equal(files.has('bootstrap/new-claude-project.sh'), false);
});

test('setup plan fails when a required file would be missing', () => {
  const tree = generatedTree().filter((entry) => entry.path !== 'AGENTS.md');
  const plan = () => plannedRepositorySetup({ treeEntries: tree, manifest: fixtureManifest(), repositoryName: 'x', settingsText: '{}', disabledSkills: [] });
  assert.throws(plan, /AGENTS\.md/);
  const strippingRequired = fixtureManifest({ templateOnly: [...fixtureManifest().templateOnly, 'AGENTS.md'] });
  assert.throws(
    () => plannedRepositorySetup({ treeEntries: generatedTree(), manifest: strippingRequired, repositoryName: 'x', settingsText: '{}', disabledSkills: [] }),
    /AGENTS\.md/,
  );
});

test('manifest parser accepts version 1 and rejects other versions, unknown keys, and bad paths', () => {
  assert.ok(parseTemplateManifest(fixtureManifest()));
  const rejects = (value, pattern) => assert.throws(() => parseTemplateManifest(value), (error) => error instanceof HarnessManifestError && pattern.test(error.message));
  rejects(fixtureManifest({ version: 2 }), /version 2 is not supported/);
  rejects(fixtureManifest({ extra: true }), /unknown key "extra"/);
  rejects(fixtureManifest({ templateOnly: ['bootstrap/'] }), /invalid path/);
  rejects(fixtureManifest({ templateOnly: ['docs/*.md'] }), /invalid path/);
  rejects(fixtureManifest({ requiredFiles: ['../AGENTS.md'] }), /invalid path/);
  rejects(fixtureManifest({ readmeStub: undefined }), /readmeStub/);
  rejects(fixtureManifest({ skills: { required: [], dependencies: { lab: 'refine' } } }), /dependencies/);
  rejects([], /not a JSON object/);
});

test('manifest removal rules use the manifest, not the built-in list', () => {
  const manifest = fixtureManifest();
  // Allowed by the built-in rules, which predate merge-ready.
  assert.deepEqual(harnessRemovalProblems(['astra-fullreview', 'codex-fullreview']), []);
  assert.deepEqual(manifestRemovalProblems(manifest, ['astra-fullreview', 'codex-fullreview']), [
    'merge-ready needs codex-fullreview; keep codex-fullreview or remove merge-ready too',
  ]);
  assert.deepEqual(manifestRemovalProblems(manifest, ['init-project']), ['init-project is required and cannot be removed']);
  assert.deepEqual(manifestRemovalProblems(manifest, ['lab']), []);
});

// A fake GitHub API. Records every request; anything it does not know is reported as unexpected.
function fakeGithub({ templateManifest = fixtureManifest(), tree = generatedTree(), generatedManifest = fixtureManifest() } = {}) {
  const requests = [];
  const unexpected = [];
  const base64 = (text) => Buffer.from(text, 'utf8').toString('base64');
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  let blobCount = 0;
  const routes = {
    'GET /repos/ryanportfolio/Harness-Firmware/contents/.agents/template-manifest.json': () => (
      templateManifest ? reply(200, templateManifest) : reply(404, { message: 'Not Found' })),
    'POST /repos/ryanportfolio/Harness-Firmware/generate': () => reply(201, {
      html_url: 'https://github.com/someone/project', full_name: 'someone/project', private: true, default_branch: 'main',
    }),
    'GET /repos/someone/project/contents/.claude/settings.json?ref=main': () => reply(200, { content: base64('{}\n'), encoding: 'base64', sha: 'settings-sha' }),
    'GET /repos/someone/project/git/ref/heads/main': () => reply(200, { object: { sha: 'head-commit' } }),
    'GET /repos/someone/project/git/commits/head-commit': () => reply(200, { tree: { sha: 'base-tree' } }),
    'GET /repos/someone/project/git/trees/base-tree?recursive=1': () => reply(200, { tree, truncated: false }),
    'GET /repos/someone/project/git/blobs/manifest-sha': () => reply(200, { content: base64(JSON.stringify(generatedManifest)), encoding: 'base64' }),
    'POST /repos/someone/project/git/blobs': () => reply(201, { sha: `new-blob-${(blobCount += 1)}` }),
    'POST /repos/someone/project/git/trees': () => reply(201, { sha: 'new-tree' }),
    'POST /repos/someone/project/git/commits': () => reply(201, { sha: 'new-commit' }),
    'PATCH /repos/someone/project/git/refs/heads/main': () => reply(200, { object: { sha: 'new-commit' } }),
  };
  return {
    requests,
    unexpected,
    find: (key) => requests.filter((request) => request.key === key),
    handle(method, url, init) {
      const key = `${method} ${url.pathname}${url.search}`;
      requests.push({ key, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined });
      const route = routes[key];
      if (!route) {
        unexpected.push(key);
        return reply(500, { message: `Unexpected test request ${key}` });
      }
      return route();
    },
  };
}

// Runs the creator on a local server with app secrets set. Global fetch reaches only that server
// and the fake GitHub; any other host throws, so no test can touch the network.
async function withCreator(github, run) {
  const secret = 'x'.repeat(32);
  const appEnvironment = {
    GITHUB_APP_ID: '1', GITHUB_APP_SLUG: 'harness', GITHUB_APP_CLIENT_ID: 'id',
    GITHUB_APP_CLIENT_SECRET: 'secret', HARNESS_SESSION_SECRET: secret,
  };
  const saved = Object.fromEntries(Object.keys(appEnvironment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, appEnvironment);
  const realFetch = globalThis.fetch;
  const server = http.createServer((req, res) => handleCreatorRequest(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin === origin) return realFetch(input, init);
    if (url.origin === 'https://api.github.com' && github) return github.handle(init.method || 'GET', url, init);
    throw new Error(`Network access is disabled in tests: ${url.origin}`);
  };
  const session = encryptHarnessPayload({
    installationId: 1, owner: 'someone', accessToken: 'token', accessTokenExpiresAt: null, issuedAt: Date.now(),
  }, secret);
  const create = (disabledSkills) => fetch(`${origin}/api/harness/github/create`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: `${HARNESS_SESSION_COOKIE}=${encodeURIComponent(session)}`,
    },
    body: JSON.stringify({ name: 'project', disabledSkills }),
  });
  try {
    await run(create);
  } finally {
    globalThis.fetch = realFetch;
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('create endpoint rejects a crafted selection that breaks the removal rules', async () => {
  await withCreator(null, async (create) => {
    let response = await create(['codex-fullreview']);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /astra-fullreview needs codex-fullreview/);
    response = await create(['external-review']);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /external-review is required/);
    response = await create(['not-a-skill']);
    assert.equal(response.status, 422);
  });
});

test('create endpoint rejects a selection that breaks the template manifest rules before generating', async () => {
  const github = fakeGithub();
  await withCreator(github, async (create) => {
    const response = await create(['astra-fullreview', 'codex-fullreview']);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /merge-ready needs codex-fullreview/);
  });
  const [manifestRequest] = github.find('GET /repos/ryanportfolio/Harness-Firmware/contents/.agents/template-manifest.json');
  assert.equal(manifestRequest.headers.Accept, 'application/vnd.github.raw+json');
  assert.deepEqual(github.find('POST /repos/ryanportfolio/Harness-Firmware/generate'), [], 'no repository generated');
  assert.deepEqual(github.unexpected, []);
});

test('create endpoint refuses to generate when the template manifest is invalid', async () => {
  const github = fakeGithub({ templateManifest: fixtureManifest({ version: 2 }) });
  await withCreator(github, async (create) => {
    const response = await create([]);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /No repository was created because template manifest version 2/);
  });
  assert.deepEqual(github.find('POST /repos/ryanportfolio/Harness-Firmware/generate'), []);
});

test('create flow with no skills removed commits the template-only strip and moves the branch', async () => {
  const github = fakeGithub();
  await withCreator(github, async (create) => {
    const response = await create([]);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.customized, true);
    assert.equal(result.customizationWarning, null);
  });
  assert.deepEqual(github.unexpected, []);

  const [treeRequest] = github.find('POST /repos/someone/project/git/trees');
  assert.equal(treeRequest.body.base_tree, 'base-tree');
  const posted = new Map(treeRequest.body.tree.map((entry) => [entry.path, entry]));
  for (const path of TEMPLATE_ONLY_FILES.filter((path) => path !== 'README.md')) {
    assert.equal(posted.get(path)?.sha, null, `${path} deleted`);
  }
  for (const entry of generatedTree()) {
    if (entry.type !== 'tree' && posted.get(entry.path)?.sha === null) {
      assert.ok(isTemplateOnly(fixtureManifest(), entry.path), `${entry.path} is a project file and must stay`);
    }
  }
  const blobs = github.find('POST /repos/someone/project/git/blobs');
  assert.equal(blobs.length, 1, 'only the README is written');
  assert.equal(Buffer.from(blobs[0].body.content, 'base64').toString('utf8'), '# project\n');
  assert.equal(posted.get('README.md').sha, 'new-blob-1');

  const [commitRequest] = github.find('POST /repos/someone/project/git/commits');
  assert.match(commitRequest.body.message, /^Set up project from Harness Firmware\n/);
  assert.deepEqual(commitRequest.body.parents, ['head-commit']);
  assert.equal(commitRequest.body.tree, 'new-tree');
  const [refRequest] = github.find('PATCH /repos/someone/project/git/refs/heads/main');
  assert.deepEqual(refRequest.body, { sha: 'new-commit', force: false });
});

test('create flow applies skill removals in the same setup commit', async () => {
  const github = fakeGithub();
  await withCreator(github, async (create) => {
    const response = await create(['lab']);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.customized, true);
    assert.equal(result.disabledSkillCount, 1);
  });
  const [treeRequest] = github.find('POST /repos/someone/project/git/trees');
  const paths = new Map(treeRequest.body.tree.map((entry) => [entry.path, entry.sha]));
  assert.equal(paths.get('.claude/skills/lab/SKILL.md'), null);
  assert.equal(paths.get('bootstrap/new-claude-project.sh'), null);
  assert.ok(paths.get('.claude/settings.json'));
  assert.ok(paths.get(HARNESS_REMOVAL_RECORD_PATH));
  assert.equal(github.find('POST /repos/someone/project/git/commits').length, 1);
});

test('create flow keeps the repository and warns when the generated repository has no manifest', async () => {
  // The template has not shipped its manifest yet: the built-in rules apply and generation proceeds.
  const github = fakeGithub({ templateManifest: null, tree: generatedTree({ withManifest: false }) });
  await withCreator(github, async (create) => {
    const response = await create(['lab']);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.customized, false);
    assert.equal(result.disabledSkillCount, 0);
    assert.match(result.customizationWarning, /template manifest could not be used/);
    assert.match(result.customizationWarning, /were not removed/);
    assert.match(result.customizationWarning, /all skills remain enabled/);
  });
  assert.equal(github.find('POST /repos/ryanportfolio/Harness-Firmware/generate').length, 1, 'repository created');
  for (const key of ['POST /repos/someone/project/git/blobs', 'POST /repos/someone/project/git/trees', 'POST /repos/someone/project/git/commits', 'PATCH /repos/someone/project/git/refs/heads/main']) {
    assert.deepEqual(github.find(key), [], `${key} not called`);
  }
  assert.deepEqual(github.unexpected, []);
});

test('create flow warns without committing when the generated manifest is invalid', async () => {
  const github = fakeGithub({ generatedManifest: fixtureManifest({ version: 2 }) });
  await withCreator(github, async (create) => {
    const response = await create([]);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.customized, false);
    assert.match(result.customizationWarning, /were not removed\.$/);
  });
  assert.deepEqual(github.find('POST /repos/someone/project/git/commits'), []);
  assert.deepEqual(github.find('PATCH /repos/someone/project/git/refs/heads/main'), []);
});
