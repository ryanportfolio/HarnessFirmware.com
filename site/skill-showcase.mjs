const section = document.querySelector('#skills');
if (section) {
  const search = section.querySelector('#skill-search');
  const entries = [...section.querySelectorAll('.ss-entry')];
  let category = 'audit';
  // A link to one skill (/skills#skill-dare) opens its entry under its own category.
  const linked = () => {
    const entry = location.hash && entries.find((e) => '#' + e.id === decodeURIComponent(location.hash));
    if (!entry) return null;
    category = entry.dataset.category;
    search.value = '';
    entry.open = true;
    return entry;
  };
  const target = linked();
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    for (const entry of entries) {
      const show = (category === 'all' || entry.dataset.category === category) && entry.textContent.toLowerCase().includes(query);
      entry.hidden = !show;
      if (show) count++;
    }
    section.querySelector('.ss-count').textContent = `${count} shown`;
    section.querySelector('.empty-skills').hidden = count > 0;
    window.dispatchEvent(new Event('harness:layout-change'));
  };
  const pressed = () => section.querySelectorAll('[data-ss-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ssFilter === category)));
  pressed();
  filter();
  // Smooth scroll (skill-scroll.mjs) brings a linked entry into view itself; native scroll
  // jumped to it before the filter ran, so it goes again once the list has settled.
  if (target) addEventListener('load', () => { if (!document.documentElement.dataset.smoothScroll) target.scrollIntoView({ block: 'center' }); }, { once: true });
  window.addEventListener('hashchange', () => { if (linked()) { pressed(); filter(); } });
  search.addEventListener('input', filter);
  section.querySelectorAll('[data-ss-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.ssFilter;
    section.querySelectorAll('[data-ss-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    filter();
  }));
  section.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => window.dispatchEvent(new Event('harness:layout-change'))));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gallery = section.querySelector('.ss-gallery');
  const status = section.querySelector('#ss-motion-status');
  let visible = false, raf = 0, previous = null, elapsed = 0;
  const paths = [...section.querySelectorAll('[data-ss-path]')].map(path => ({path, length:path.getTotalLength(), dot:section.querySelector(`[data-ss-dot="${path.dataset.ssPath}"]`)}));
  const labels = [section.querySelector('[data-ss-state="horizon"]'), section.querySelector('[data-ss-state="arena"]'), section.querySelector('[data-ss-state="review"]')];
  const gates = [...section.querySelectorAll('[data-ss-gate]')];
  const finding = section.querySelector('.ss-audit-finding');
  const check = section.querySelector('.ss-audit-check');
  let lastStage = -1;
  function paint() {
    const phase = (elapsed % 12000) / 12000;
    const stage = Math.min(3, Math.floor(phase * 4));
    for (let i = 0; i < paths.length; i++) {
      const {path,length,dot} = paths[i];
      const progress = i === 0 ? phase : (phase + (i === 2 ? .12 : 0)) % 1;
      const point = path.getPointAtLength(length * progress);
      dot.setAttribute('cx', point.x); dot.setAttribute('cy', point.y);
    }
    if (stage !== lastStage) {
      lastStage = stage;
      labels[0].textContent = ['01 / Define the goal','02 / Build a round','03 / Fresh audit','04 / Save progress'][stage];
      labels[1].textContent = ['Explore alternatives','Compare the work','Choose a base','Graft useful ideas'][stage];
      labels[2].textContent = ['Inspect the work','Finding confirmed','Repair the gap','Recheck the result'][stage];
      gates.forEach((gate,i) => {gate.style.fill = i === stage ? '#53db7624' : '#50d87308';gate.style.stroke = i === stage ? '#53db76' : '#6c9175';});
      finding.style.opacity = stage === 1 ? '1' : stage === 2 ? '.45' : '.12';
      check.style.opacity = stage === 3 ? '1' : '.14';
      section.querySelector('.ss-repair-wire').style.stroke = stage === 2 ? '#efc87e' : '#53db76';
      section.querySelectorAll('.ss-arena-branch').forEach(branch => {branch.style.opacity = stage === 0 ? '.65' : stage === 3 ? '.85' : '.22';});
      section.querySelector('.ss-synthesis').style.opacity = stage === 3 ? '1' : '.12';
      gallery.dataset.phase = String(stage);
    }
  }
  const shouldRun = () => visible && !reduced.matches && !document.hidden;
  function tick(now) {
    raf = 0;
    if (!shouldRun()) {previous = null;return;}
    if (previous !== null) elapsed += Math.min(now - previous, 64);
    previous = now;
    paint();
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; previous = null;
    status.textContent = reduced.matches ? 'Static diagrams' : 'Illustrative workflows';
    if (shouldRun()) raf = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;sync();},{threshold:0}).observe(gallery);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  paint();sync();
}
