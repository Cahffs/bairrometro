// Gráfico qualidade × preço do m² (regras de negócio, seção 4.5), em SVG.
// Cores: cada ponto usa a cor da faixa da nota (D022); a terracota só marca
// o bairro selecionado (regra da identidade: cor de marca não é cor de dado).
import { fmt, tooltip } from './common.js';

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  if (parent) parent.append(node);
  return node;
}

function text(parent, attrs, content) {
  const t = s('text', attrs, parent);
  t.textContent = content;
  return t;
}

function niceDomain(min, max, count = 5) {
  const range = max - min || Math.abs(max) || 1;
  const raw = range / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step, step };
}

function shortName(name) {
  return name.replace(/^Bairro\s+/i, '');
}

export function drawScatter(svg, opts) {
  const { points, fit, frontierIds = [], showFrontier = false, selectedId, labelIds = [], deal, onSelect } = opts;
  const tip = tooltip();
  svg.replaceChildren();
  const W = 680;
  const H = 400;
  const m = { l: 70, r: 24, t: 34, b: 50 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  if (points.length < 2) {
    text(svg, { x: W / 2, y: H / 2, class: 'axis-label', 'text-anchor': 'middle' },
      'Poucos bairros com preço suficiente para o gráfico.');
    return;
  }

  const xd = niceDomain(Math.min(...points.map((p) => p.quality)), Math.max(...points.map((p) => p.quality)));
  const yd = niceDomain(Math.min(...points.map((p) => p.price)), Math.max(...points.map((p) => p.price)));
  const x = (v) => m.l + ((v - xd.lo) / (xd.hi - xd.lo)) * (W - m.l - m.r);
  const y = (v) => H - m.b - ((v - yd.lo) / (yd.hi - yd.lo)) * (H - m.t - m.b);
  const priceLabel = (v) => (deal === 'rent' ? `R$ ${fmt.int(v)}` : fmt.brl(v));

  for (let v = yd.lo; v <= yd.hi + 1e-9; v += yd.step) {
    s('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid-line' }, svg);
    text(svg, { x: m.l - 8, y: y(v), class: 'tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, priceLabel(v));
  }
  for (let v = xd.lo; v <= xd.hi + 1e-9; v += xd.step) {
    text(svg, { x: x(v), y: H - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, fmt.int(v));
  }
  s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis-line' }, svg);
  text(svg, { x: (m.l + W - m.r) / 2, y: H - 8, class: 'axis-label', 'text-anchor': 'middle' }, 'Qualidade do bairro (Q, de 0 a 100)');
  text(svg, { x: m.l, y: m.t - 14, class: 'axis-label' },
    deal === 'rent' ? 'Preço do m² (aluguel)' : 'Preço do m² (venda)');

  if (fit) {
    const x0 = Math.min(...points.map((p) => p.quality));
    const x1 = Math.max(...points.map((p) => p.quality));
    s('line', { x1: x(x0), x2: x(x1), y1: y(fit.a + fit.b * x0), y2: y(fit.a + fit.b * x1), class: 'fit-line' }, svg);
  }
  if (showFrontier) {
    const fr = points.filter((p) => frontierIds.includes(p.id)).sort((a, b) => a.price - b.price);
    s('polyline', { points: fr.map((p) => `${x(p.quality)},${y(p.price)}`).join(' '), class: 'frontier-line' }, svg);
  }

  // o selecionado é desenhado por último, para ficar por cima
  const ordered = [...points].sort((a, b) => (a.id === selectedId) - (b.id === selectedId));
  for (const p of ordered) {
    const cx = x(p.quality);
    const cy = y(p.price);
    s('circle', { cx, cy, r: 6.5, class: `dot band-${p.band ? p.band.id : 'mid'}` }, svg);
    if (p.id === selectedId) s('circle', { cx, cy, r: 11, class: 'dot-ring' }, svg);
    if (p.id === selectedId || labelIds.includes(p.id)) {
      text(svg, { x: cx + 10, y: cy - 10, class: 'pt-label' }, shortName(p.name));
    }
    const hit = s('circle', { cx, cy, r: 14, class: 'hit', tabindex: -1 }, svg);
    const lines = [
      `Qualidade: ${fmt.score(p.quality)}`,
      `Preço: ${deal === 'rent' ? fmt.brl2(p.price) : fmt.brl(p.price)}/m²`,
    ];
    if (p.expected !== null) {
      lines.push(`Esperado: ${deal === 'rent' ? fmt.brl2(p.expected) : fmt.brl(p.expected)}/m²`);
      lines.push(`${fmt.int(Math.abs(p.diff * 100))}% ${p.diff >= 0 ? 'mais barato' : 'mais caro'} que o esperado`);
    }
    if (p.final !== null) lines.push(`Nota final: ${fmt.score(p.final)} (${p.band.label.toLowerCase()})`);
    if (frontierIds.includes(p.id)) lines.push('Na fronteira de eficiência');
    hit.addEventListener('pointerenter', (e) => tip.show(e, p.name, lines));
    hit.addEventListener('pointermove', (e) => tip.move(e));
    hit.addEventListener('pointerleave', () => tip.hide());
    hit.addEventListener('click', () => { tip.hide(); if (onSelect) onSelect(p.id); });
  }
}
