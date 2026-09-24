// Pixel wipe: a cols x rows grid of square cells that turn solid one by one, in a shuffled order,
// as a progress value runs from 0 to 1. The caller owns the progress (usually scroll).
//
//   const wipe = createPixelWipe(host, {cols: 17, rows: 9, color: '#11120D', from: .7})
//   wipe.render(progress)   0..1; cheap to call every frame, only changed cells are touched
//   wipe.destroy()          remove the grid
//
// Options
//   cols, rows   grid size. The grid covers the host like background-size:cover, anchored at the
//                top-left, so cells stay square and overflow the right or bottom edge.
//   color        cell color (any CSS color)
//   from, to     progress window of the wipe: before `from` every cell is clear, at `to` all are solid
//   fade         length of one cell's 0 -> 1 ramp, as a fraction of the gap between two cells
//                starting (0 = instant switch)
//   seed         number: deterministic order (same seed, same order). Omitted: Math.random.
//   order        explicit array of cell indices (row-major) in the order they fill; overrides seed

const SVG = 'http://www.w3.org/2000/svg';
// Cells overlap by 1.5% of their pitch so antialiased edges never leave hairline seams.
const OVERLAP = 0.015;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledOrder(count, seed) {
  const random = seed == null ? Math.random : mulberry32(seed);
  const order = Array.from({length: count}, (_, index) => index);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function createPixelWipe(host, {cols = 17, rows = 9, color = '#11120D', from = 0, to = 1, fade = 0.4, seed, order} = {}) {
  const count = cols * rows;
  const sequence = order ?? shuffledOrder(count, seed);
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'pixel-wipe__grid');
  svg.setAttribute('viewBox', `0 0 ${cols} ${rows}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // DOM order stays row-major; only the fill order is shuffled.
  const cells = Array.from({length: count}, (_, index) => {
    const cell = document.createElementNS(SVG, 'rect');
    cell.setAttribute('class', 'pixel-wipe__cell');
    cell.setAttribute('x', index % cols);
    cell.setAttribute('y', Math.floor(index / cols));
    cell.setAttribute('width', 1 + OVERLAP);
    cell.setAttribute('height', 1 + OVERLAP);
    return cell;
  });
  const byRank = sequence.map(index => cells[index]);
  svg.append(...cells);
  host.classList.add('pixel-wipe');
  host.style.setProperty('--pixel-wipe-cols', cols);
  host.style.setProperty('--pixel-wipe-rows', rows);
  host.style.setProperty('--pixel-wipe-color', color);
  host.append(svg);

  const ramp = Math.max(fade, 1e-6);
  const span = count - 1 + ramp; // cell k ramps over [k, k + ramp] on this clock
  const opacity = new Float32Array(count);
  let clock = 0;
  const set = (rank, value) => {
    if (opacity[rank] === value) return;
    opacity[rank] = value;
    byRank[rank].style.opacity = value === 0 ? '' : String(value);
  };

  return {
    render(progress) {
      const p = Math.min(1, Math.max(0, (progress - from) / Math.max(1e-6, to - from)));
      const next = p * span;
      // Only cells between the previous and the new clock can change.
      const lo = Math.max(0, Math.floor(Math.min(clock, next)) - 1);
      const hi = Math.min(count - 1, Math.ceil(Math.max(clock, next)) + 1);
      for (let rank = lo; rank <= hi; rank++) set(rank, Math.min(1, Math.max(0, (next - rank) / ramp)));
      clock = next;
      host.classList.toggle('is-active', next > 0);
    },
    destroy() {
      svg.remove();
      host.classList.remove('pixel-wipe', 'is-active');
      host.style.removeProperty('--pixel-wipe-cols');
      host.style.removeProperty('--pixel-wipe-rows');
      host.style.removeProperty('--pixel-wipe-color');
    },
  };
}
