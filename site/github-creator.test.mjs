import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { test } from 'node:test';
import {
  HARNESS_REMOVAL_RECORD_PATH,
  HARNESS_SESSION_COOKIE,
  createPkceChallenge,
  createPkceVerifier,
  decryptHarnessPayload,
  encryptHarnessPayload,
  githubAppConfigured,
  handleCreatorRequest,
  isValidRepositoryName,
  mergeSkillOverrides,
  normalizeDisabledSkills,
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

test('create endpoint rejects a crafted selection that breaks the removal rules', async () => {
  const secret = 'x'.repeat(32);
  const appEnvironment = {
    GITHUB_APP_ID: '1', GITHUB_APP_SLUG: 'harness', GITHUB_APP_CLIENT_ID: 'id',
    GITHUB_APP_CLIENT_SECRET: 'secret', HARNESS_SESSION_SECRET: secret,
  };
  const saved = Object.fromEntries(Object.keys(appEnvironment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, appEnvironment);
  const server = http.createServer((req, res) => handleCreatorRequest(req, res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
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
    let response = await create(['codex-fullreview']);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /astra-fullreview needs codex-fullreview/);
    response = await create(['external-review']);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /external-review is required/);
    response = await create(['not-a-skill']);
    assert.equal(response.status, 422);
  } finally {
    server.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
