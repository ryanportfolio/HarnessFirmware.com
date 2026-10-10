// Lab for the agent prompt button: sliders bound to TUNE, plus hold / boot / burst / copied triggers
// on every instance. Values persist in localStorage under one key.
import { TUNE, ready } from '/agent-cta.mjs';

const KEY = 'agent-cta-lab-tune';
const DEFAULTS = { ...TUNE };

// [key, label, min, max, step]
const GROUPS = [
  ['Time', [['timeScale', 'Time scale (slow motion)', .05, 2, .05], ['armIn', 'Arm in (ms)', 80, 1200, 10], ['armOut', 'Arm out (ms)', 80, 1200, 10], ['follow', 'Pointer follow (stiffness)', 2, 40, 1]]],
  ['Dither bloom', [['cell', 'Cell size (px)', 2, 8, 1], ['bloomMin', 'Radius at entry (x width)', .05, 1, .01], ['bloomMax', 'Radius growth (x width)', 0, 2, .01], ['bloomFalloff', 'Falloff', .4, 4, .05], ['bloomGain', 'Gain', 0, 2.5, .05], ['glow', 'Panel glow floor', 0, .5, .01], ['tier1', 'Tier 1 alpha', 0, .6, .01], ['tier2', 'Tier 2 alpha', 0, .8, .01], ['tier3', 'Tier 3 alpha', 0, 1, .01], ['tier4', 'Core (paper) alpha', 0, 1, .01]]],
  ['Scan band', [['scanDur', 'Duration (ms)', 120, 2000, 10], ['scanWidth', 'Width (px)', 4, 80, 1], ['scanGain', 'Gain', 0, 3, .05]]],
  ['Traces', [['traceGrow', 'Grow (ms)', 40, 1200, 10], ['traceStagger', 'Stagger per pin (ms)', 0, 120, 1], ['traceAlpha', 'Line alpha', 0, 1, .01], ['traceNear', 'Boost near pointer', 0, 3, .05], ['packetPeriod', 'Packet period (ms)', 200, 4000, 20]]],
  ['Comets', [['cometLap', 'Lap (ms)', 400, 8000, 50], ['cometTrail', 'Trail (share of border)', .02, .6, .01]]],
  ['Key', [['keyTilt', 'Tilt toward pointer (deg)', 0, 30, .5]]],
  ['Text', [['typeStep', 'Command retype step (ms)', 0, 120, 1], ['decodeIn', 'Eyebrow decode (ms)', 0, 1500, 10]]],
  ['Click', [['burstCount', 'Burst particles', 0, 400, 1], ['burstSpeed', 'Burst speed', 0, 1200, 10], ['ringDur', 'Shock ring (ms)', 100, 2000, 10], ['ringWidth', 'Shock ring width (px)', 2, 30, .5], ['flashDur', 'Flash (ms)', 0, 1500, 10], ['writeDur', 'Vias lit after copy (ms)', 0, 3000, 20]]],
  ['Boot', [['bootDelay', 'Hero delay (ms)', 0, 4000, 50], ['bootDur', 'Lap (ms)', 200, 4000, 50]]],
];

try { Object.assign(TUNE, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* private window: defaults */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(TUNE)); } catch { /* not persisted */ } };

const form = document.getElementById('lab-controls');
const status = document.querySelector('.lab-status');
const inputs = new Map();

for (const [title, rows] of GROUPS) {
  const set = document.createElement('fieldset');
  set.innerHTML = `<legend>${title}</legend>`;
  for (const [key, label, min, max, step] of rows) {
    const row = document.createElement('label');
    row.className = 'lab-row';
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
    const input = row.querySelector('input'), out = row.querySelector('output');
    const show = () => { out.textContent = String(TUNE[key]); out.classList.toggle('is-changed', TUNE[key] !== DEFAULTS[key]); };
    input.value = TUNE[key]; show();
    input.addEventListener('input', () => { TUNE[key] = Number(input.value); show(); save(); });
    inputs.set(key, { input, show });
    set.append(row);
  }
  form.append(set);
}

const instances = await ready;
const each = (fn) => instances.forEach((root) => fn(root.agentCta, root));

document.querySelector('.lab-actions').addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-act]');
  if (!button) return;
  const act = button.dataset.act;
  if (act === 'hold') {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    each((api) => api.hold(on));
  } else if (act === 'boot') each((api) => api.boot());
  else if (act === 'burst') each((api) => api.burst());
  else if (act === 'copied') each((api) => api.copied());
  else if (act === 'reset') {
    Object.assign(TUNE, DEFAULTS); save();
    for (const [key, { input, show }] of inputs) { input.value = TUNE[key]; show(); }
    status.textContent = 'Values reset to the file defaults.';
  } else if (act === 'export') {
    const changed = Object.fromEntries(Object.entries(TUNE).filter(([k, v]) => v !== DEFAULTS[k]));
    const json = JSON.stringify(Object.keys(changed).length ? changed : TUNE, null, 2);
    try { await navigator.clipboard.writeText(json); status.textContent = Object.keys(changed).length ? 'Changed values copied as JSON.' : 'No changes; all values copied.'; }
    catch { status.textContent = json; }
  }
});

// Size changes (cell size and bleed come from layout) need a re-measure; cheap enough on every input.
form.addEventListener('change', () => each((api) => api.measure()));
