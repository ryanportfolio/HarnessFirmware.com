/* The repository's About panel (description, website, topics), kept in repo.json.

   node scripts/readme/meta.mjs --lint    validate repo.json offline (pull requests, and build.mjs)
   node scripts/readme/meta.mjs --check   compare with the live repository and fetch every remote
                                         README link; exits 1 on drift (pushes to main)
   node scripts/readme/meta.mjs --apply   push repo.json to GitHub, then --check

   --check and --apply call `gh api`, so they need gh signed in or GH_TOKEN set. A pull request
   that edits repo.json cannot pass --check until it merges and --apply runs, which is why pull
   requests only lint. Remote links are fetched here, never in the offline build, so a third-party
   outage cannot fail an unrelated change. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { OWNER_REPO, absolute, readJson } from "./lib.mjs";

const mode = process.argv[2] || "--lint";
const repo = readJson("scripts/readme/repo.json");
const errors = [];

function lint() {
  const keys = Object.keys(repo).sort().join(",");
  if (keys !== "description,homepage,topics") errors.push(`repo.json keys are ${keys}`);
  if (typeof repo.description !== "string" || !repo.description.trim()) errors.push("description is empty");
  else if (repo.description.length > 350) errors.push(`description is ${repo.description.length} characters, 350 max`);
  if (/[\u2013\u2014]/.test(repo.description)) errors.push("description contains an en or em dash");
  if (typeof repo.homepage !== "string" || (repo.homepage && !/^https:\/\/[^\s/]+[^\s]*$/.test(repo.homepage))) errors.push("homepage must be an https URL or empty");
  if (repo.homepage.endsWith("/")) errors.push("homepage has a trailing slash; GitHub stores it without one");
  if (!Array.isArray(repo.topics)) errors.push("topics is not a list");
  else {
    if (repo.topics.length > 20) errors.push(`${repo.topics.length} topics, 20 max`);
    for (const t of repo.topics) if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(t)) errors.push(`topic "${t}" must be lowercase letters, digits and hyphens, 50 max`);
    if (new Set(repo.topics).size !== repo.topics.length) errors.push("duplicate topics");
  }
}

function gh(args, input) {
  return execFileSync("gh", ["api", ...args], { encoding: "utf8", input, env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
}

async function reachable(url) {
  // Vercel may still be deploying the push that triggered this run: retry before calling it dead.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    for (const method of ["HEAD", "GET"]) {
      try {
        const res = await fetch(url, { method, redirect: "follow" });
        if (res.status < 400) return true;
      } catch { /* network error: try again */ }
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 20000));
  }
  return false;
}

async function check() {
  const live = JSON.parse(gh([`repos/${OWNER_REPO}`]));
  if ((live.description || "") !== repo.description) errors.push(`description drift\n  live: ${live.description}\n  file: ${repo.description}`);
  if ((live.homepage || "") !== repo.homepage) errors.push(`homepage drift: live ${live.homepage}, file ${repo.homepage}`);
  const liveTopics = [...(live.topics || [])].sort();
  const fileTopics = [...repo.topics].sort();
  if (liveTopics.join(",") !== fileTopics.join(",")) errors.push(`topics drift\n  live: ${liveTopics.join(", ")}\n  file: ${fileTopics.join(", ")}`);

  const md = fs.readFileSync(absolute("README.md"), "utf8");
  const urls = [...new Set([...md.matchAll(/(?:\]\(|href=")(https?:\/\/[^)"\s]+)/g)].map((m) => m[1]))];
  const dead = [];
  await Promise.all(urls.map(async (url) => { if (!(await reachable(url))) dead.push(url); }));
  for (const url of dead.sort()) errors.push(`README link unreachable: ${url}`);
  if (!errors.length) process.stdout.write(`About panel matches repo.json; ${urls.length} remote README links reachable.\n`);
}

function apply() {
  gh(["--method", "PATCH", `repos/${OWNER_REPO}`, "--input", "-"], JSON.stringify({ description: repo.description, homepage: repo.homepage }));
  gh(["--method", "PUT", `repos/${OWNER_REPO}/topics`, "--input", "-"], JSON.stringify({ names: repo.topics }));
  process.stdout.write(`Applied repo.json to ${OWNER_REPO}.\n`);
}

lint();
if (!errors.length && mode === "--apply") apply();
if (!errors.length && (mode === "--check" || mode === "--apply")) await check();
if (!["--lint", "--check", "--apply"].includes(mode)) errors.push(`unknown mode ${mode}`);

if (errors.length) {
  for (const e of errors) process.stderr.write(`FAIL ${e}\n`);
  process.exit(1);
}
if (mode === "--lint") process.stdout.write(`repo.json is valid: ${repo.description.length}-character description, ${repo.topics.length} topics.\n`);
