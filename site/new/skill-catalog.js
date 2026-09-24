// Mirrors the skill folders in a repository generated from ryanportfolio/Harness-Firmware.
// site/new/upstream-skills.json records that upstream tree, and github-creator.test.mjs fails when
// the two drift. Refresh the record with: node scripts/refresh-upstream-skills.mjs
// runtime is omitted when a skill ships in both .claude/skills and .agents/skills; otherwise it
// names the one runtime whose folder holds the skill.
export const HARNESS_SKILL_GROUPS = Object.freeze([
  {
    id: 'core',
    label: 'Core workflows',
    description: 'Setup, memory, maintenance, and everyday project control',
  },
  {
    id: 'discipline',
    label: 'Quality disciplines',
    description: 'Planning, review, and dependable long-form execution',
  },
  {
    id: 'specialist',
    label: 'Specialist tools',
    description: 'Focused modes for design, writing, critique, and delivery',
  },
]);

export const HARNESS_SKILL_RUNTIMES = Object.freeze({
  claude: { folder: '.claude/skills', label: 'Claude Code only' },
  codex: { folder: '.agents/skills', label: 'Codex only' },
});

export const HARNESS_SKILL_CATALOG = Object.freeze([
  {
    name: 'init-project',
    label: 'Initialize project',
    group: 'core',
    required: true,
    requiredLabel: 'Required later',
    description: 'Tune the Harness after adding your framework, scaffold, or first project files',
  },
  {
    name: 'recall',
    label: 'Project memory',
    group: 'core',
    description: 'Read project decisions and pitfalls before unfamiliar work, and save lessons that cost a retry',
  },
  {
    name: 'addskill',
    label: 'Add skill',
    group: 'core',
    description: 'Create, import, update, or install skills for Claude Code and Codex',
  },
  {
    name: 'sync-starter',
    label: 'Sync starter',
    group: 'core',
    description: 'Pull template improvements into a project, or send generic ones back',
  },
  {
    name: 'optimize-context',
    label: 'Optimize context',
    group: 'core',
    description: 'Reduce always-loaded rules, skill indexes, and token weight',
  },
  {
    name: 'refine',
    label: 'Refine workflow',
    group: 'core',
    description: 'Turn recurring friction and your stated preferences into narrow rule or skill changes',
  },
  {
    name: 'adopt-repo',
    label: 'Adopt repository',
    group: 'core',
    description: 'Mirror an existing repository privately and add the Harness to it',
  },
  {
    name: 'brainstorming',
    label: 'Brainstorming',
    group: 'discipline',
    description: 'Resolve product and architecture choices before implementation',
  },
  {
    name: 'writing-plans',
    label: 'Implementation plans',
    group: 'discipline',
    description: 'Turn a clear task into ordered steps with dependencies and checks',
  },
  {
    name: 'dare',
    label: 'DARE',
    group: 'discipline',
    description: 'Question the problem in four fresh passes: decompose, audit, recombine, and test',
  },
  {
    name: 'impartial-review',
    label: 'Impartial review',
    group: 'discipline',
    description: 'Fresh agents review recent changes; a strict mode also weighs the cost of the next change',
  },
  {
    name: 'perf-loop',
    label: 'Performance loop',
    group: 'discipline',
    description: 'Measure, change one thing, and measure again for speed, loading, and resource use',
  },
  {
    name: 'long-horizon',
    label: 'Long horizon',
    group: 'discipline',
    description: 'Run work too large for one context window in verified rounds',
  },
  {
    name: 'long-horizon-workflows',
    label: 'Long horizon workflows',
    group: 'discipline',
    runtime: 'claude',
    recent: true,
    description: 'Run the same rounds through Claude Code workflows, with judges and a run journal',
  },
  {
    name: 'babysit-ci',
    label: 'Babysit CI',
    group: 'discipline',
    description: 'Watch pull request checks, or fix failures without merging; stops after three fix pushes',
  },
  {
    name: 'codex-review',
    label: 'Codex review',
    group: 'discipline',
    description: 'Codex CLI reviews a diff, then each finding is verified before it is reported',
  },
  {
    name: 'astra-review',
    label: 'Astra review',
    group: 'discipline',
    description: 'The Codex review, run on gpt-6-astra at medium reasoning',
  },
  {
    name: 'codex-fullreview',
    label: 'Codex full review',
    group: 'discipline',
    runtime: 'claude',
    recent: true,
    description: 'Codex runs a multi-agent review with fresh sub-reviewers, then each finding is verified',
  },
  {
    name: 'astra-fullreview',
    label: 'Astra full review',
    group: 'discipline',
    runtime: 'claude',
    recent: true,
    description: 'The multi-agent Codex review, run on gpt-6-astra at medium reasoning',
  },
  {
    name: 'claude-review',
    label: 'Claude review',
    group: 'discipline',
    description: 'Claude CLI reviews code written in Codex, then each finding is verified',
  },
  {
    name: 'external-review',
    label: 'External review',
    group: 'discipline',
    runtime: 'codex',
    required: true,
    recent: true,
    description: 'The single-reviewer pass that the Codex and Astra review commands run inside Codex',
  },
  {
    name: 'fable-mode',
    label: 'Fable mode',
    group: 'specialist',
    description: 'Evidence gates for hard work: each claim is checked at the layer it names',
  },
  {
    name: 'wow-loop',
    label: 'Wow loop',
    group: 'specialist',
    description: 'Review and repair one deliverable until independent critics pass it from their own captures',
  },
  {
    name: 'showpiece',
    label: 'Showpiece',
    group: 'specialist',
    description: 'Push a page, deck, or document past the generic look',
  },
  {
    name: 'arena',
    label: 'Arena',
    group: 'specialist',
    description: 'Build parallel attempts, judge them blind, and graft the best ideas onto the strongest',
  },
  {
    name: 'lab',
    label: 'Visual lab',
    group: 'specialist',
    description: 'Prototype and tune UI, motion, or game feel before production',
  },
  {
    name: 'advocate',
    label: 'Change advocate',
    group: 'specialist',
    description: 'Challenge a change just made, from a fresh context, before it lands',
  },
  {
    name: 'why',
    label: 'Challenge recommendation',
    group: 'specialist',
    description: 'Stress-test the assistant\'s immediately prior recommendation',
  },
  {
    name: 'enhance-prompt',
    label: 'Prompt enhancer',
    group: 'specialist',
    description: 'Rewrite a request into a copy-ready prompt for another agent or session',
  },
  {
    name: 'handoff-audit',
    label: 'Audit handoff',
    group: 'specialist',
    description: 'Draft a self-contained audit prompt, with exact scope and checks, for another session to run',
  },
  {
    name: 'writing',
    label: 'Writing',
    group: 'specialist',
    description: 'Write and clean up text that leaves the session: docs, site copy, emails, release notes',
  },
  {
    name: 'forge-repo-ui-skill',
    label: 'Forge UI skill',
    group: 'specialist',
    description: 'Synthesize a lean repository-specific frontend design workflow',
  },
  {
    name: 'caveman',
    label: 'Caveman prose',
    group: 'specialist',
    description: 'Short session replies with built-in cleanup; deliverables keep normal prose',
  },
  {
    name: 'bro',
    label: 'Plain English',
    group: 'specialist',
    description: 'Explain the last reply in plain words, or rewrite a draft plainly, keeping every fact',
  },
  {
    name: 'session-hub',
    label: 'Session hub',
    group: 'specialist',
    description: 'Coordinate parallel sessions through one shared HTML hub file',
  },
]);

// Folders that hold a skill in a generated repository.
export function harnessSkillFolders(skill) {
  const runtimes = skill.runtime ? [skill.runtime] : Object.keys(HARNESS_SKILL_RUNTIMES);
  return runtimes.map((runtime) => `${HARNESS_SKILL_RUNTIMES[runtime].folder}/${skill.name}`);
}
