import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createPkceChallenge,
  createPkceVerifier,
  decryptHarnessPayload,
  encryptHarnessPayload,
  githubAppConfigured,
  isValidRepositoryName,
  mergeSkillOverrides,
  normalizeDisabledSkills,
  sameOriginRequest,
  signHarnessPayload,
  verifyHarnessPayload,
} from './github-creator.mjs';

test('skill selection accepts only unique optional catalog entries', () => {
  assert.deepEqual(normalizeDisabledSkills(['lab', 'merge']), ['merge', 'lab']);
  assert.deepEqual(normalizeDisabledSkills([]), []);
  assert.equal(normalizeDisabledSkills(['init-project']), null);
  assert.equal(normalizeDisabledSkills(['lab', 'lab']), null);
  assert.equal(normalizeDisabledSkills(['unknown-skill']), null);
  assert.equal(normalizeDisabledSkills('lab'), null);
});

test('skill overrides merge without disturbing repository settings', () => {
  const settings = JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'safe-command' }] }] },
    skillOverrides: { humanizer: 'off', merge: 'on', 'team-local-skill': 'off' },
  });
  const merged = JSON.parse(mergeSkillOverrides(settings, ['merge', 'lab']));
  assert.deepEqual(merged.hooks, { SessionStart: [{ hooks: [{ type: 'command', command: 'safe-command' }] }] });
  assert.deepEqual(merged.skillOverrides, { merge: 'off', 'team-local-skill': 'off', lab: 'off' });
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
