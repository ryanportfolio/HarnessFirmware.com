// Hosted project creator: GitHub App OAuth plus template generation on plain node:http,
// serving the /api/harness/github/* routes. The browser never sees a token; sessions live in encrypted
// HttpOnly cookies scoped to /api/harness/github.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { HARNESS_SKILL_CATALOG } from './new/skill-catalog.js';

export const HARNESS_TEMPLATE_OWNER = 'ryanportfolio';
export const HARNESS_TEMPLATE_REPO = 'Harness-Firmware';
export const HARNESS_TEMPLATE_GENERATE_URL = `https://github.com/${HARNESS_TEMPLATE_OWNER}/${HARNESS_TEMPLATE_REPO}/generate`;
export const HARNESS_SESSION_COOKIE = 'harness_github_session';
export const HARNESS_STATE_COOKIE = 'harness_github_state';
export const HARNESS_OAUTH_COOKIE = 'harness_github_oauth';
export const HARNESS_CANDIDATES_COOKIE = 'harness_github_candidates';
export const HARNESS_COOKIE_PATH = '/api/harness/github';
export const HARNESS_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const HARNESS_CREATOR_PATH = '/new';

const BRIDGE_MAX_AGE_MS = 10 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

const HARNESS_SKILL_NAMES = new Set(HARNESS_SKILL_CATALOG.map((skill) => skill.name));
const REQUIRED_HARNESS_SKILLS = new Set(
  HARNESS_SKILL_CATALOG.filter((skill) => skill.required === true).map((skill) => skill.name),
);

export function normalizeDisabledSkills(value) {
  if (!Array.isArray(value)) return null;
  const supplied = new Set();
  for (const item of value) {
    if (
      typeof item !== 'string'
      || !HARNESS_SKILL_NAMES.has(item)
      || REQUIRED_HARNESS_SKILLS.has(item)
      || supplied.has(item)
    ) {
      return null;
    }
    supplied.add(item);
  }
  return HARNESS_SKILL_CATALOG.filter((skill) => supplied.has(skill.name)).map((skill) => skill.name);
}

export function mergeSkillOverrides(settingsText, disabledSkills) {
  const parsed = JSON.parse(settingsText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Harness settings must contain a JSON object');
  }
  const settings = { ...parsed };
  const current = settings.skillOverrides;
  const overrides = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {};
  const disabled = new Set(disabledSkills);
  for (const skill of HARNESS_SKILL_CATALOG) {
    if (disabled.has(skill.name)) overrides[skill.name] = 'off';
    else if (overrides[skill.name] === 'off') delete overrides[skill.name];
  }
  if (Object.keys(overrides).length > 0) settings.skillOverrides = overrides;
  else delete settings.skillOverrides;
  return `${JSON.stringify(settings, null, 2)}\n`;
}

export function githubAppConfigured(environment = process.env) {
  return Boolean(
    environment.GITHUB_APP_ID
      && environment.GITHUB_APP_SLUG
      && environment.GITHUB_APP_CLIENT_ID
      && environment.GITHUB_APP_CLIENT_SECRET
      && environment.HARNESS_SESSION_SECRET,
  );
}

export function isValidRepositoryName(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 100
    && /^[A-Za-z0-9._-]+$/.test(value)
    && !/^\.+$/.test(value);
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function signHarnessPayload(payload, secret) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyHarnessPayload(value, secret) {
  const [encoded, signature, extra] = value.split('.');
  if (!encoded || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function harnessEncryptionKey(secret) {
  return createHash('sha256').update(secret).digest();
}

export function encryptHarnessPayload(payload, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', harnessEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptHarnessPayload(value, secret) {
  const [encodedIv, encodedTag, encodedCiphertext, extra] = value.split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', harnessEncryptionKey(secret), Buffer.from(encodedIv, 'base64url'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, 'base64url')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}

export function createPkceVerifier(nonce, secret) {
  return createHmac('sha256', secret).update(`harness-pkce:${nonce}`).digest('base64url');
}

export function createPkceChallenge(verifier) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export class GithubApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GithubApiError';
    this.status = status;
  }
}

export async function requestGithubUserCredentials(parameters, now = Date.now()) {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      ...parameters,
    }),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new GithubApiError(
      result.error_description || result.error || 'GitHub authorization failed',
      response.ok ? 401 : response.status,
    );
  }
  return {
    accessToken: result.access_token,
    accessTokenExpiresAt: Number.isFinite(result.expires_in) ? now + Number(result.expires_in) * 1000 : null,
    refreshToken: result.refresh_token || null,
    refreshTokenExpiresAt: Number.isFinite(result.refresh_token_expires_in)
      ? now + Number(result.refresh_token_expires_in) * 1000
      : null,
  };
}

export async function githubApi(path, options = {}, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'harness-firmware-creator',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new GithubApiError(detail.message || `GitHub request failed with ${response.status}`, response.status);
  }
  return response.json();
}

const GENERATED_REPOSITORY_RETRY_DELAYS_MS = [250, 500, 1000, 1500, 2000, 2500, 3000, 3000, 3000, 3000];

export async function applyRepositorySkillSelection({
  owner,
  repository,
  branch,
  disabledSkills,
  token,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const selectedSkills = normalizeDisabledSkills(disabledSkills);
  if (!selectedSkills) throw new Error('Harness skill selection is invalid');
  const repositoryPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  const settingsPath = `${repositoryPath}/contents/.claude/settings.json`;
  let file = null;

  for (let attempt = 0; attempt <= GENERATED_REPOSITORY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      file = await githubApi(`${settingsPath}?ref=${encodeURIComponent(branch)}`, {}, token);
      break;
    } catch (error) {
      if (
        !(error instanceof GithubApiError)
        || error.status !== 404
        || attempt === GENERATED_REPOSITORY_RETRY_DELAYS_MS.length
      ) {
        throw error;
      }
      await sleep(GENERATED_REPOSITORY_RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!file?.content || file.encoding !== 'base64' || !file.sha) {
    throw new Error('Harness settings were not available in the generated repository');
  }

  const currentSettings = Buffer.from(file.content.replaceAll(/\s/g, ''), 'base64').toString('utf8');
  const updatedSettings = mergeSkillOverrides(currentSettings, selectedSkills);
  const settingsBlob = await githubApi(`${repositoryPath}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: Buffer.from(updatedSettings, 'utf8').toString('base64'), encoding: 'base64' }),
  }, token);
  if (!settingsBlob.sha) throw new Error('GitHub did not create the Harness settings blob');

  const encodedBranch = encodeURIComponent(branch);
  const reference = await githubApi(`${repositoryPath}/git/ref/heads/${encodedBranch}`, {}, token);
  const headCommitSha = reference.object?.sha;
  if (!headCommitSha) throw new Error('GitHub did not return the generated repository head');

  const headCommit = await githubApi(`${repositoryPath}/git/commits/${encodeURIComponent(headCommitSha)}`, {}, token);
  if (!headCommit.tree?.sha) throw new Error('GitHub did not return the generated repository tree');

  const baseTree = await githubApi(`${repositoryPath}/git/trees/${encodeURIComponent(headCommit.tree.sha)}?recursive=1`, {}, token);
  if (!baseTree.tree || baseTree.truncated) {
    throw new Error('GitHub did not return the complete generated repository tree');
  }

  const skillPrefixes = selectedSkills.flatMap((skill) => [`.claude/skills/${skill}/`, `.agents/skills/${skill}/`]);
  const deletionEntries = baseTree.tree
    .filter((entry) => {
      const { path, mode, type } = entry;
      return typeof path === 'string'
        && type === 'blob'
        && (mode === '100644' || mode === '100755' || mode === '120000')
        && skillPrefixes.some((prefix) => path.startsWith(prefix));
    })
    .map((entry) => ({ path: entry.path, mode: entry.mode, type: entry.type, sha: null }));

  for (const skill of selectedSkills) {
    if (!deletionEntries.some((entry) => entry.path === `.claude/skills/${skill}/SKILL.md`)) {
      throw new Error(`Harness skill files were missing for ${skill}`);
    }
  }

  const tree = await githubApi(`${repositoryPath}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: [{ path: '.claude/settings.json', mode: '100644', type: 'blob', sha: settingsBlob.sha }, ...deletionEntries],
    }),
  }, token);
  if (!tree.sha) throw new Error('GitHub did not create the customized repository tree');

  const commit = await githubApi(`${repositoryPath}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message: 'Configure Harness skills', tree: tree.sha, parents: [headCommitSha] }),
  }, token);
  if (!commit.sha) throw new Error('GitHub did not create the Harness configuration commit');

  await githubApi(`${repositoryPath}/git/refs/heads/${encodedBranch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  }, token);
}

export async function listHarnessInstallations(accessToken) {
  const appId = Number(process.env.GITHUB_APP_ID);
  const allInstallations = [];
  for (let page = 1; page <= 100; page += 1) {
    const result = await githubApi(`/user/installations?per_page=100&page=${page}`, {}, accessToken);
    const pageInstallations = result.installations || [];
    allInstallations.push(...pageInstallations);
    if (pageInstallations.length < 100) break;
  }
  return allInstallations.flatMap((installation) => {
    const installationId = Number(installation.id);
    const owner = installation.account?.login;
    if (installation.app_id !== appId || !Number.isSafeInteger(installationId) || !owner) return [];
    return [{ installationId, owner }];
  });
}

export function sameOriginRequest(origin, requestUrl) {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// node:http adapter

function parseCookies(header = '') {
  const jar = new Map();
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (name) jar.set(name, decodeURIComponent(part.slice(index + 1).trim()));
  }
  return jar;
}

function serializeCookie(name, value, { maxAge, secure }) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${HARNESS_COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

class Reply {
  constructor(res, secure) {
    this.res = res;
    this.secure = secure;
    this.cookies = [];
  }

  set(name, value, maxAge) {
    this.cookies.push(serializeCookie(name, value, { maxAge, secure: this.secure }));
  }

  clear(name) {
    this.set(name, '', 0);
  }

  headers(extra = {}) {
    return this.cookies.length ? { 'Set-Cookie': this.cookies, ...extra } : extra;
  }

  json(status, body, extra = {}) {
    this.res.writeHead(status, this.headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }));
    this.res.end(JSON.stringify(body));
  }

  redirect(location) {
    this.res.writeHead(302, this.headers({ Location: String(location), 'Cache-Control': 'no-store' }));
    this.res.end();
  }
}

function requestUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return new URL(req.url, `${proto}://${req.headers.host || '127.0.0.1'}`);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sessionCookie(reply, session, secret) {
  reply.set(HARNESS_SESSION_COOKIE, encryptHarnessPayload(session, secret), 30 * 24 * 60 * 60);
}

async function currentUserCredentials(session) {
  const now = Date.now();
  if (session.accessTokenExpiresAt === null || session.accessTokenExpiresAt > now + TOKEN_REFRESH_SKEW_MS) {
    return session;
  }
  if (!session.refreshToken || (session.refreshTokenExpiresAt !== null && session.refreshTokenExpiresAt <= now)) {
    throw new GithubApiError('GitHub authorization expired', 401);
  }
  return requestGithubUserCredentials({ grant_type: 'refresh_token', refresh_token: session.refreshToken });
}

const handlers = {
  async 'GET status'(req, reply, jar) {
    const available = githubAppConfigured();
    const secret = process.env.HARNESS_SESSION_SECRET;
    const value = jar.get(HARNESS_SESSION_COOKIE);
    const verifiedSession = available && secret && value ? decryptHarnessPayload(value, secret) : null;
    const session = verifiedSession && Date.now() - verifiedSession.issuedAt <= HARNESS_SESSION_MAX_AGE_MS ? verifiedSession : null;
    const candidateValue = jar.get(HARNESS_CANDIDATES_COOKIE);
    const candidates = available && secret && candidateValue ? decryptHarnessPayload(candidateValue, secret) : null;
    let accounts = [];
    if (candidates && Date.now() - candidates.issuedAt <= BRIDGE_MAX_AGE_MS) {
      try {
        accounts = await listHarnessInstallations(candidates.accessToken);
      } catch {
        reply.clear(HARNESS_CANDIDATES_COOKIE);
      }
    } else if (candidateValue) {
      reply.clear(HARNESS_CANDIDATES_COOKIE);
    }
    if (verifiedSession && !session) reply.clear(HARNESS_SESSION_COOKIE);
    reply.json(200, {
      available,
      connected: Boolean(session),
      owner: session?.owner || null,
      accounts,
      fallbackUrl: HARNESS_TEMPLATE_GENERATE_URL,
    });
  },

  async 'GET connect'(req, reply) {
    if (!githubAppConfigured()) return reply.redirect(HARNESS_TEMPLATE_GENERATE_URL);
    const secret = process.env.HARNESS_SESSION_SECRET;
    const state = { nonce: randomBytes(24).toString('hex'), issuedAt: Date.now() };
    const signedState = signHarnessPayload(state, secret);
    reply.set(HARNESS_STATE_COOKIE, signedState, 10 * 60);
    const callbackUrl = new URL(`${HARNESS_COOKIE_PATH}/callback`, requestUrl(req));
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', process.env.GITHUB_APP_CLIENT_ID);
    authorizeUrl.searchParams.set('redirect_uri', callbackUrl.toString());
    authorizeUrl.searchParams.set('state', signedState);
    authorizeUrl.searchParams.set('code_challenge', createPkceChallenge(createPkceVerifier(state.nonce, secret)));
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('prompt', 'select_account');
    reply.redirect(authorizeUrl);
  },

  async 'GET callback'(req, reply, jar) {
    if (!githubAppConfigured()) return reply.redirect(HARNESS_TEMPLATE_GENERATE_URL);
    const url = requestUrl(req);
    const creatorUrl = (query = '') => new URL(`${HARNESS_CREATOR_PATH}${query}`, url);
    const suppliedState = url.searchParams.get('state') || '';
    const code = url.searchParams.get('code') || '';
    const setupAction = url.searchParams.get('setup_action');
    const suppliedInstallationId = url.searchParams.get('installation_id');
    const installationId = suppliedInstallationId === null ? null : Number(suppliedInstallationId);
    const hasInstallationId = installationId !== null && Number.isSafeInteger(installationId);
    const secret = process.env.HARNESS_SESSION_SECRET;
    const expectedState = jar.get(HARNESS_STATE_COOKIE) || '';
    const state = suppliedState && suppliedState === expectedState ? verifyHarnessPayload(suppliedState, secret) : null;

    if (!state || Date.now() - state.issuedAt > BRIDGE_MAX_AGE_MS) {
      reply.clear(HARNESS_STATE_COOKIE);
      reply.clear(HARNESS_OAUTH_COOKIE);
      return reply.redirect(creatorUrl(setupAction === 'update' ? '?github-app=updated' : '?error=github-connection'));
    }

    try {
      let credentials;
      if (code) {
        credentials = await requestGithubUserCredentials({
          code,
          redirect_uri: new URL(`${HARNESS_COOKIE_PATH}/callback`, url).toString(),
          code_verifier: createPkceVerifier(state.nonce, secret),
        });
      } else {
        const bridge = decryptHarnessPayload(jar.get(HARNESS_OAUTH_COOKIE) || '', secret);
        if (!bridge || Date.now() - bridge.issuedAt > BRIDGE_MAX_AGE_MS) throw new Error('GitHub authorization expired');
        credentials = bridge;
      }

      const installations = await listHarnessInstallations(credentials.accessToken);
      const selected = hasInstallationId
        ? installations.find((installation) => installation.installationId === installationId)
        : undefined;

      if (!installations.length) {
        reply.set(HARNESS_OAUTH_COOKIE, encryptHarnessPayload({ ...credentials, issuedAt: Date.now() }, secret), 10 * 60);
        const installUrl = new URL(`https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`);
        installUrl.searchParams.set('state', suppliedState);
        return reply.redirect(installUrl);
      }

      if (suppliedInstallationId !== null && (!hasInstallationId || !selected)) {
        throw new Error('GitHub installation is not available to this user');
      }

      const target = selected || (installations.length === 1 ? installations[0] : undefined);
      reply.clear(HARNESS_STATE_COOKIE);
      reply.clear(HARNESS_OAUTH_COOKIE);

      if (!target) {
        reply.set(HARNESS_CANDIDATES_COOKIE, encryptHarnessPayload({ ...credentials, issuedAt: Date.now() }, secret), 10 * 60);
        return reply.redirect(creatorUrl('?choose=github-account'));
      }

      sessionCookie(reply, { installationId: target.installationId, owner: target.owner, ...credentials, issuedAt: Date.now() }, secret);
      reply.clear(HARNESS_CANDIDATES_COOKIE);
      return reply.redirect(creatorUrl('?connected=1'));
    } catch {
      reply.clear(HARNESS_STATE_COOKIE);
      reply.clear(HARNESS_OAUTH_COOKIE);
      reply.clear(HARNESS_CANDIDATES_COOKIE);
      return reply.redirect(creatorUrl('?error=github-connection'));
    }
  },

  async 'POST select'(req, reply, jar) {
    if (!githubAppConfigured()) return reply.json(503, { error: 'Hosted creator is not configured' });
    if (!sameOriginRequest(req.headers.origin, requestUrl(req))) return reply.json(403, { error: 'Invalid request origin' });
    let body;
    try {
      body = await readJson(req);
    } catch {
      return reply.json(400, { error: 'Invalid request body' });
    }
    const installationId = Number(body?.installationId);
    const secret = process.env.HARNESS_SESSION_SECRET;
    const candidates = decryptHarnessPayload(jar.get(HARNESS_CANDIDATES_COOKIE) || '', secret);
    if (!candidates || Date.now() - candidates.issuedAt > BRIDGE_MAX_AGE_MS) {
      reply.clear(HARNESS_CANDIDATES_COOKIE);
      return reply.json(401, { error: 'GitHub account selection expired' });
    }
    let installations;
    try {
      installations = await listHarnessInstallations(candidates.accessToken);
    } catch {
      reply.clear(HARNESS_CANDIDATES_COOKIE);
      return reply.json(401, { error: 'Reconnect GitHub to choose an account' });
    }
    const selected = installations.find((candidate) => candidate.installationId === installationId);
    if (!selected) return reply.json(422, { error: 'Choose an available GitHub account' });
    sessionCookie(reply, {
      installationId: selected.installationId,
      owner: selected.owner,
      accessToken: candidates.accessToken,
      accessTokenExpiresAt: candidates.accessTokenExpiresAt,
      refreshToken: candidates.refreshToken,
      refreshTokenExpiresAt: candidates.refreshTokenExpiresAt,
      issuedAt: Date.now(),
    }, secret);
    reply.clear(HARNESS_CANDIDATES_COOKIE);
    reply.json(200, { owner: selected.owner });
  },

  async 'POST disconnect'(req, reply) {
    if (!sameOriginRequest(req.headers.origin, requestUrl(req))) return reply.json(403, { error: 'Invalid request origin' });
    for (const name of [HARNESS_SESSION_COOKIE, HARNESS_STATE_COOKIE, HARNESS_OAUTH_COOKIE, HARNESS_CANDIDATES_COOKIE]) reply.clear(name);
    reply.json(200, { ok: true });
  },

  async 'POST create'(req, reply, jar) {
    if (!githubAppConfigured()) return reply.json(503, { error: 'Hosted creator is not configured' });
    if (!sameOriginRequest(req.headers.origin, requestUrl(req))) return reply.json(403, { error: 'Invalid request origin' });
    const secret = process.env.HARNESS_SESSION_SECRET;
    const session = decryptHarnessPayload(jar.get(HARNESS_SESSION_COOKIE) || '', secret);
    if (!session || Date.now() - session.issuedAt > HARNESS_SESSION_MAX_AGE_MS) {
      reply.clear(HARNESS_SESSION_COOKIE);
      return reply.json(401, { error: 'Connect GitHub first' });
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      return reply.json(400, { error: 'Invalid request body' });
    }
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!isValidRepositoryName(name)) return reply.json(422, { error: 'Use letters, digits, dot, dash, or underscore' });
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 350) : '';
    const makePrivate = body.private !== false;
    const disabledSkills = body.disabledSkills === undefined ? [] : normalizeDisabledSkills(body.disabledSkills);
    if (!disabledSkills) return reply.json(422, { error: 'Choose skills from the available list' });

    try {
      const credentials = await currentUserCredentials(session);
      if (credentials.accessToken !== session.accessToken) sessionCookie(reply, { ...session, ...credentials }, secret);
      const repository = await githubApi(`/repos/${HARNESS_TEMPLATE_OWNER}/${HARNESS_TEMPLATE_REPO}/generate`, {
        method: 'POST',
        body: JSON.stringify({ owner: session.owner, name, description, private: makePrivate, include_all_branches: false }),
      }, credentials.accessToken);
      let customized = true;
      let customizationWarning = null;
      if (disabledSkills.length > 0) {
        try {
          await applyRepositorySkillSelection({
            owner: session.owner,
            repository: name,
            branch: repository.default_branch || 'main',
            disabledSkills,
            token: credentials.accessToken,
          });
        } catch (error) {
          customized = false;
          customizationWarning = 'Repository created, but skill choices could not be applied. All skills remain enabled.';
          console.error('Harness skill customization failed after repository creation', {
            repository: repository.full_name,
            status: error instanceof GithubApiError ? error.status : null,
            message: error instanceof Error ? error.message : 'Unknown customization error',
          });
        }
      }
      reply.json(201, {
        repositoryUrl: repository.html_url,
        fullName: repository.full_name,
        private: repository.private,
        customized,
        disabledSkillCount: customized ? disabledSkills.length : 0,
        customizationWarning,
      });
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 401) {
        return reply.json(401, { error: 'Reconnect GitHub to create a repository' });
      }
      reply.json(502, { error: error instanceof Error ? error.message : 'GitHub could not create the repository' });
    }
  },
};

// Returns true when the request was handled.
export async function handleCreatorRequest(req, res) {
  const url = requestUrl(req);
  if (!url.pathname.startsWith(`${HARNESS_COOKIE_PATH}/`)) return false;
  const action = url.pathname.slice(HARNESS_COOKIE_PATH.length + 1);
  const handler = handlers[`${req.method} ${action}`];
  const reply = new Reply(res, url.protocol === 'https:');
  if (!handler) {
    const allowed = Object.keys(handlers).filter((key) => key.endsWith(` ${action}`)).map((key) => key.split(' ')[0]);
    if (allowed.length) {
      res.writeHead(405, { Allow: allowed.join(', ') });
      res.end();
    } else {
      reply.json(404, { error: 'Not found' });
    }
    return true;
  }
  try {
    await handler(req, reply, parseCookies(req.headers.cookie));
  } catch (error) {
    console.error('Harness creator request failed', error);
    if (!res.headersSent) reply.json(500, { error: 'Creator request failed' });
    else res.end();
  }
  return true;
}
