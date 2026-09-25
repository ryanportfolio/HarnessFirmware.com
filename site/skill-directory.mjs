// Hover/focus preview for the skill directory. Split out of dither-effects.mjs so the skills page can run it without the homepage scenes.
const directory=document.querySelector('.ss-directory');
// skill-showcase.mjs clears data-ss-off when it applies the filter. If it failed to load or run, show every entry under All.
if(directory?.querySelector('.ss-entry[data-ss-off]')){directory.querySelectorAll('.ss-entry[data-ss-off]').forEach(e=>e.removeAttribute('data-ss-off'));directory.querySelector('.ss-count').textContent=`${directory.querySelectorAll('.ss-entry').length} shown`;directory.querySelectorAll('[data-ss-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ssFilter==='all')));}
if(directory?.querySelector('.ss-preview')){
  const entries=[...directory.querySelectorAll('.ss-entry')];
  const diagrams={audit:'M12 12h40v40H12zM24 31l7 7 20-23M60 28h18m-7-7 7 7-7 7',build:'M6 12h18v15H6zM6 39h18v15H6zM24 20l26 12-26 14M50 32h30m-8-8 8 8-8 8',design:'M12 48 32 12l20 36ZM46 48 66 12l18 36Z',write:'M15 12h54v40H15zM24 24h34M24 32h25M24 40h30',project:'M8 32h20m0 0V12h20m-20 20v20h20M48 12h28v14H48zM48 44h28v14H48z'};
  // The preview ships in skills.html, filled for the first entry, so it is in place at first paint.
  const preview=directory.querySelector('.ss-preview');
  let selected=entries.find(e=>e.hasAttribute('data-preview'));
  function select(entry){if(!entry||entry.hidden)return;selected?.removeAttribute('data-preview');selected=entry;entry.setAttribute('data-preview','');preview.hidden=false;preview.querySelector('strong').textContent=entry.querySelector('h4').textContent;preview.querySelector('p').textContent=entry.querySelector('.ss-detail p').textContent.split('. ')[0].replace(/\.$/,'')+'.';preview.querySelector('svg').innerHTML='';const diagram=document.createElementNS('http://www.w3.org/2000/svg','path');diagram.setAttribute('d',diagrams[entry.dataset.category]||diagrams.project);preview.querySelector('svg').append(diagram);const link=entry.querySelector('.ss-detail a');preview.querySelector('a').href=link.href;preview.querySelector('a').setAttribute('aria-label',`Read ${entry.querySelector('h4').textContent} source`);}
  entries.forEach(entry=>{entry.querySelector('summary').addEventListener('pointerenter',()=>select(entry));entry.addEventListener('focusin',()=>select(entry));entry.querySelector('summary').addEventListener('click',()=>select(entry));});
  new MutationObserver(()=>{if(!selected||selected.hidden){const first=entries.find(e=>!e.hidden);if(first)select(first);else{selected?.removeAttribute('data-preview');selected=null;preview.hidden=true;}}}).observe(directory.querySelector('.ss-index'),{subtree:true,attributes:true,attributeFilter:['hidden']});
  select(entries.find(e=>!e.hidden));
}
