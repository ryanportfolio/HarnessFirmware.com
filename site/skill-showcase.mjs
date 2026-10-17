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
  entries.forEach(entry => entry.removeAttribute('data-ss-off'));
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

  // A featured panel's 'See the skill' link opens that entry before the scroll layer (skill-scroll.mjs)
  // moves to it: smooth scroll uses pushState, which fires no hashchange.
  section.querySelector('.ss-gallery')?.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#skill-"]');
    const entry = link && entries.find((e) => '#' + e.id === link.getAttribute('href'));
    if (!entry) return;
    category = entry.dataset.category;
    search.value = '';
    entry.open = true;
    pressed(); filter();
  });
  import('./skill-features.mjs');
}
