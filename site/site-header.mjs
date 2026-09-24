// Solid header background once the page has scrolled past the top.
const header = document.querySelector('.site-header');
if (header) {
  const paint = () => header.toggleAttribute('data-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', paint, {passive: true});
  paint();
}
