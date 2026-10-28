// Página "Explorar bairros": filtros no topo, lista em cartões, detalhe ao lado e gráfico.
import { h, fmt, initPage } from './common.js';
import { scoreCity, startingWeights, PRESETS, MAX_WEIGHT, DEFAULT_EMPHASIS, MIN_LISTINGS } from './scoring.js';
import { drawScatter } from './charts.js';
import * as auth from './auth.js';

initPage();

const cfg = window.BAIRROMETRO_CONFIG || {};
const STATE_KEY = 'bm-explorar';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = [['house', 'Casa de rua'], ['condo_house', 'Casa em condomínio'], ['apartment', 'Apartamento']];
const EMPHASIS_PRESETS = [[0.3, 'Qualidade primeiro'], [0.5, 'Equilíbrio'], [0.7, 'Economia primeiro']];
// Valor medido de cada critério (campo "raw" dos dados reais), para explicar o percentil.
const RAW_LABELS = {
  daily: ['mercados_farmacias_padarias_1km', 'mercados, farmácias e padarias a até 1 km'],
  education: ['escolas_creches_1km', 'escolas e creches a até 1 km'],
  health: ['unidades_saude_1km', 'unidades de saúde a até 1 km'],
  mobility: ['pontos_onibus_1km', 'pontos de ônibus a até 1 km'],
  safety: ['ocorrencias_500m_ano', 'ocorrências por ano a até 500 m de casa'],
  green: ['area_parques_pracas_1km_m2', 'm² de parques e praças a até 1 km'],
  infrastructure: ['domicilios_saneamento_pct', '% de domicílios com água, esgoto e coleta de lixo'],
  quiet: ['distancia_via_movimentada_m', 'metros até a via movimentada mais próxima'],
};
const HEART = 'M12 20s-7-4.4-9.2-8.6C1.4 8.6 3 5 6.5 5c2 0 3.3 1.1 4 2.3h3C14.2 6.1 15.5 5 17.5 5 21 5 22.6 8.6 21.2 11.4 19 15.6 12 20 12 20z';
const SLIDERS = 'M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4';

const $ = (sel) => document.querySelector(sel);
let data;
let criteria;
let ids;
let state;
let session = null;
let profiles = [];
let activeProfileId = null;
// favoritos: id atual do bairro → id guardado na conta (pode ser o de um bairro que foi juntado a outro, D035)
let favorites = new Map();
let aliasesById = new Map();
let idByAlias = new Map();
let qualityOnly = false;
let lastResult = null;

// ---------- utilidades ----------

function store(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

function svgIcon(d, filled = false) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: 20, height: 20, fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(k, String(v));
  }
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  svg.append(p);
  return svg;
}

function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// id antigo de um bairro absorvido → id do bairro em que ele está agora
function resolveId(id) {
  return idByAlias.get(id) || id;
}

function labelOf(id) {
  const c = criteria.find((x) => x.id === id);
  return c ? c.label : id;
}

// ---------- estado (fica neste navegador; a conta guarda só perfis e favoritos) ----------

function defaultState() {
  return {
    deal: 'rent',
    flags: [],
    weights: startingWeights(ids, []).weights,
    emphasis: DEFAULT_EMPHASIS,
    types: TYPES.map((t) => t[0]),
    selectedId: null,
    showFrontier: false,
    sort: 'score',
  };
}

// Tudo que vem do navegador ou do banco é validado antes de usar.
function cleanWeights(raw) {
  const out = {};
  for (const id of ids) {
    const v = raw && Number(raw[id]);
    out[id] = Number.isInteger(v) && v >= 0 && v <= MAX_WEIGHT ? v : 3;
  }
  return out;
}

function loadState() {
  const base = defaultState();
  const saved = store(() => JSON.parse(localStorage.getItem(STATE_KEY) || 'null'));
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    deal: saved.deal === 'sale' ? 'sale' : 'rent',
    flags: Array.isArray(saved.flags) ? saved.flags.filter((f) => f in PRESETS) : [],
    weights: cleanWeights(saved.weights),
    emphasis: Number(saved.emphasis) >= 0 && Number(saved.emphasis) <= 1 ? Number(saved.emphasis) : DEFAULT_EMPHASIS,
    types: Array.isArray(saved.types) && saved.types.length ? saved.types.filter((t) => TYPES.some((x) => x[0] === t)) : base.types,
    showFrontier: saved.showFrontier === true,
    sort: ['score', 'name', 'population'].includes(saved.sort) ? saved.sort : 'score',
  };
}

function saveState() {
  const { selectedId, ...rest } = state;
  store(() => localStorage.setItem(STATE_KEY, JSON.stringify(rest)));
}

function applyProfile(profile) {
  if (!profile) return false;
  const weights = cleanWeights(profile.weights);
  // O perfil não guarda quem mora junto (D026). Se os pesos são os mesmos que já estão
  // neste navegador (ex.: logo depois das boas-vindas), os atalhos marcados continuam valendo.
  if (!ids.every((id) => state.weights[id] === weights[id])) state.flags = [];
  state.weights = weights;
  state.deal = profile.deal === 'sale' ? 'sale' : 'rent';
  const e = Number(profile.economy_emphasis);
  state.emphasis = e >= 0 && e <= 1 ? e : DEFAULT_EMPHASIS;
  const types = Array.isArray(profile.property_types) ? profile.property_types.filter((t) => TYPES.some((x) => x[0] === t)) : [];
  if (types.length) state.types = types;
  activeProfileId = profile.id;
  return true;
}

// ---------- barra de filtros ----------

function chip(label, pressed, onClick) {
  return h('button', { type: 'button', class: 'chip', 'aria-pressed': pressed ? 'true' : 'false', on: { click: onClick } }, label);
}

function buildToolbar() {
  const bar = $('#toolbar');
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Alugar ou comprar' });
  for (const [value, label] of [['rent', 'Alugar'], ['sale', 'Comprar']]) {
    const input = h('input', { type: 'radio', name: 'deal', value, checked: state.deal === value });
    input.addEventListener('change', () => { state.deal = value; update(); });
    seg.append(h('label', {}, input, label));
  }

  const presets = h('div', { class: 'chips', role: 'group', 'aria-label': 'Quem vai morar' },
    ...Object.entries(PRESETS).map(([key, preset]) => chip(preset.label, state.flags.includes(key), () => {
      state.flags = Object.keys(PRESETS).filter((k) => (k === key ? !state.flags.includes(k) : state.flags.includes(k)));
      state.weights = startingWeights(ids, state.flags).weights;
      buildToolbar();
      buildTuneDialog();
      update();
    })));

  const tune = h('button', { type: 'button', class: 'btn btn-tune', on: { click: () => $('#tune').showModal() } },
    svgIcon(SLIDERS), 'Ajustar prioridades');

  const left = h('div', { class: 'toolbar-group' }, seg, presets, tune);
  const right = h('div', { class: 'toolbar-group' }, buildProfileArea());
  bar.replaceChildren(left, right);
}

function buildProfileArea() {
  if (!auth.authEnabled) return '';
  if (!session) {
    return h('a', { class: 'btn btn-small', href: 'entrar.html?next=explorar.html', text: 'Entrar para salvar' });
  }
  const box = h('div', { class: 'toolbar-group' });
  if (profiles.length) {
    const select = h('select', { 'aria-label': 'Usar um perfil salvo' },
      h('option', { value: '', text: 'Meus perfis…' }),
      ...profiles.map((p) => h('option', { value: p.id, text: p.name, selected: p.id === activeProfileId })));
    select.addEventListener('change', () => {
      const p = profiles.find((x) => x.id === select.value);
      if (p && applyProfile(p)) {
        showNote(`Usando o perfil "${p.name}". Mudanças aqui não alteram o perfil salvo.`);
        buildToolbar();
        buildTuneDialog();
        update();
      }
    });
    box.append(select);
  }
  const msg = h('span', { class: 'small muted', role: 'status' });
  const name = h('input', { type: 'text', maxlength: 60, placeholder: 'Nome do perfil', 'aria-label': 'Nome do perfil' });
  const form = h('form', { class: 'inline-form', hidden: true },
    name, h('button', { type: 'submit', class: 'btn btn-primary btn-small', text: 'Salvar' }));
  const open = h('button', { type: 'button', class: 'btn btn-small', text: 'Salvar perfil',
    on: { click: () => { form.hidden = false; open.hidden = true; name.focus(); } } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = name.value.trim();
    if (!value) return;
    const res = await auth.saveProfile({ name: value, deal: state.deal, propertyTypes: state.types, weights: state.weights, emphasis: state.emphasis });
    msg.textContent = res.ok ? 'Perfil salvo!' : res.message;
    if (res.ok) {
      profiles = await auth.listProfiles().catch(() => profiles);
      buildToolbar();
    }
  });
  box.append(open, form, msg);
  return box;
}

function showNote(text) {
  const note = $('#profile-note');
  note.textContent = text;
  note.hidden = false;
}

// ---------- janela "Ajustar prioridades" ----------

function buildTuneDialog() {
  const body = $('#tune-body');
  body.replaceChildren();
  body.append(h('p', { class: 'muted', text: 'Quanto cada coisa pesa na nota do bairro. 0 ignora, 5 é o mais importante.' }));
  const grid = h('div', { class: 'weights-grid' });
  for (const c of criteria) {
    const out = h('span', { class: 'weight-value' });
    const input = h('input', { type: 'range', min: 0, max: MAX_WEIGHT, step: 1, value: state.weights[c.id], id: `w-${c.id}` });
    input.addEventListener('input', () => { state.weights[c.id] = Number(input.value); out.textContent = input.value; update(); });
    out.textContent = String(state.weights[c.id]);
    grid.append(h('div', { class: 'slider' }, h('label', { for: `w-${c.id}` }, h('span', { text: c.label }), out), input));
  }
  body.append(grid, h('ul', { class: 'why-list', id: 'why-list' }));

  const eOut = h('span', { class: 'weight-value' });
  const eInput = h('input', { type: 'range', min: 0, max: 1, step: 0.1, value: state.emphasis, id: 'emphasis' });
  const eChips = EMPHASIS_PRESETS.map(([v, label]) => chip(label, false, () => { state.emphasis = v; syncE(); update(); }));
  // o atalho fica marcado só quando a ênfase é exatamente o valor dele
  const syncE = () => {
    eInput.value = state.emphasis;
    eOut.textContent = fmt.one(state.emphasis);
    eChips.forEach((b, i) => b.setAttribute('aria-pressed', Math.abs(EMPHASIS_PRESETS[i][0] - state.emphasis) < 1e-9 ? 'true' : 'false'));
  };
  eInput.addEventListener('input', () => { state.emphasis = Number(eInput.value); syncE(); update(); });
  syncE();
  body.append(
    h('h3', { text: 'Qualidade ou economia?' }),
    h('p', { class: 'hint', id: 'emphasis-hint' }),
    h('div', { class: 'slider' }, h('label', { for: 'emphasis' }, h('span', { text: 'Ênfase em economia' }), eOut), eInput),
    h('div', { class: 'chips' }, ...eChips),
  );

  const types = h('div', { class: 'chips' }, ...TYPES.map(([value, label]) => chip(label, state.types.includes(value), (e) => {
    const next = TYPES.map((t) => t[0]).filter((t) => (t === value ? !state.types.includes(t) : state.types.includes(t)));
    if (!next.length) return;
    state.types = next;
    e.currentTarget.setAttribute('aria-pressed', state.types.includes(value) ? 'true' : 'false');
    saveState();
  })));
  body.append(h('h3', { text: 'Tipo de imóvel' }), types,
    h('p', { class: 'hint', text: 'Vai filtrar os anúncios quando a busca de imóveis estiver pronta.' }));
}

function renderWhy() {
  const list = $('#why-list');
  if (!list) return;
  const { weights, reasons } = startingWeights(ids, state.flags);
  const items = reasons.filter((r) => state.weights[r.criterion] === weights[r.criterion]);
  list.replaceChildren(...items.map((r) => h('li', { text: `${labelOf(r.criterion)} ${r.weight}: ${r.text}.` })));
  const hint = $('#emphasis-hint');
  if (hint) {
    hint.textContent = qualityOnly
      ? 'Vale quando houver preços dos anúncios. Por enquanto a nota usa só a qualidade.'
      : 'Mais economia favorece bairros que custam menos do que a qualidade sugere.';
  }
}

// ---------- resultados ----------

function update() {
  saveState();
  const result = scoreCity(data, { weights: state.weights, deal: state.deal, emphasis: state.emphasis });
  qualityOnly = result.ranked.length === 0 && result.unranked.length > 0;
  if (qualityOnly) {
    result.ranked = result.unranked.filter((r) => r.quality !== null);
    result.unranked = result.unranked.filter((r) => r.quality === null);
    result.ranked.forEach((r, i) => {
      r.rank = i + 1;
      r.warnings = r.warnings.filter((w) => !w.startsWith('Preço com poucos dados'));
    });
  }
  lastResult = result;
  const all = [...result.ranked, ...result.unranked];
  if (!all.some((r) => r.id === state.selectedId)) state.selectedId = (result.ranked[0] || all[0] || {}).id || null;
  renderWhy();
  renderList();
  renderChart(result);
  renderDetail(all.find((r) => r.id === state.selectedId), result);
}

function bandBadge(band) {
  if (!band) return h('span', { class: 'band muted', text: 'sem nota' });
  return h('span', { class: 'band' }, h('i', { class: `band-dot band-${band.id}`, 'aria-hidden': 'true' }), band.label);
}

function highlights(r) {
  return r.contributions.filter((c) => c.impact > 0).slice(0, 2).map((c) => labelOf(c.id));
}

function select(id) {
  state.selectedId = id;
  update();
  if (window.innerWidth <= 920) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleFavorite(id) {
  const stored = favorites.get(id);
  const res = stored ? await auth.removeFavorite(data.meta.city_code, stored) : await auth.addFavorite(data.meta.city_code, id);
  if (res.ok) {
    if (stored) favorites.delete(id); else favorites.set(id, id);
    update();
  }
}

function favButton(r, big = false) {
  if (!auth.authEnabled || !session) return null;
  const on = favorites.has(r.id);
  return h('button', {
    type: 'button', class: big ? 'btn btn-small fav-btn' : 'fav', 'aria-pressed': on ? 'true' : 'false',
    'aria-label': on ? `Remover ${r.name} dos favoritos` : `Favoritar ${r.name}`, title: on ? 'Nos favoritos' : 'Favoritar',
    on: { click: (e) => { e.stopPropagation(); toggleFavorite(r.id); } },
  }, svgIcon(HEART, on), big ? (on ? 'Nos favoritos' : 'Favoritar') : null);
}

function renderList() {
  const result = lastResult;
  const term = normalize($('#search').value.trim());
  const dealText = state.deal === 'rent' ? 'aluguel' : 'compra';
  let rows = [...result.ranked, ...result.unranked];
  if (state.sort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (state.sort === 'population') rows.sort((a, b) => (b.population || 0) - (a.population || 0));
  // a busca também acha os nomes dos bairros que foram juntados a este (D035)
  const matchedAlias = new Map();
  if (term) {
    rows = rows.filter((r) => {
      if (normalize(r.name).includes(term)) return true;
      const alias = (aliasesById.get(r.id) || []).find((a) => normalize(a).includes(term));
      if (alias) matchedAlias.set(r.id, alias);
      return Boolean(alias);
    });
  }

  $('#list-sub').textContent = qualityOnly
    ? `${result.ranked.length} bairros pela nota de qualidade, com as suas prioridades. Preços em breve.`
    : `${result.ranked.length} bairros com pelo menos ${MIN_LISTINGS} anúncios de ${dealText}.`;

  const items = rows.slice(0, 120).map((r) => {
    const tags = highlights(r);
    const score = qualityOnly || r.final === null ? r.quality : r.final;
    return h('li', {}, h('article', { class: `hood-card${r.id === state.selectedId ? ' is-selected' : ''}` },
      h('button', { type: 'button', class: 'hood-main', 'aria-pressed': r.id === state.selectedId ? 'true' : 'false', on: { click: () => select(r.id) } },
        h('span', { class: 'hood-rank', text: r.rank ? `${r.rank}º` : '–' }),
        h('span', { class: 'hood-info' },
          h('span', { class: 'hood-name', text: r.name }),
          matchedAlias.has(r.id) ? h('span', { class: 'hood-sub', text: `Inclui ${matchedAlias.get(r.id)}` }) : null,
          tags.length ? h('span', { class: 'hood-tags', text: `Destaques: ${tags.join(' · ')}` }) : null,
          r.final === null && !qualityOnly
            ? h('span', { class: 'hood-sub', text: `Poucos anúncios: só a nota de qualidade` })
            : (r.population ? h('span', { class: 'hood-sub', text: `${fmt.int(r.population)} moradores` }) : null)),
        h('span', { class: 'hood-score' }, h('span', { class: 'score', text: fmt.score(score) }), bandBadge(r.band))),
      favButton(r)));
  });
  if (!items.length) items.push(h('li', { class: 'empty muted', text: 'Nenhum bairro com esse nome.' }));
  if (rows.length > 120) items.push(h('li', { class: 'empty muted small', text: `Mostrando 120 de ${rows.length}. Use a busca para achar outros.` }));
  $('#list').replaceChildren(...items);
}

// Fontes e limites dos dados: crédito exigido pelas licenças (IBGE, ODbL do OpenStreetMap, SSP-SP).
function renderSources() {
  const meta = data.meta || {};
  if (!meta.sources || !meta.sources.length) return null;
  return h('details', { class: 'sources' },
    h('summary', { text: 'Fontes e limites dos dados' }),
    h('ul', { class: 'small' }, ...meta.sources.map((s) => h('li', { text: s }))),
    meta.notes && meta.notes.length ? h('ul', { class: 'small muted' }, ...meta.notes.map((s) => h('li', { text: s }))) : null,
    meta.license_note ? h('p', { class: 'small muted', text: meta.license_note }) : null);
}

function renderChart(result) {
  const box = $('#chart');
  if (qualityOnly) {
    box.replaceChildren(
      h('h2', { text: 'Qualidade × preço' }),
      h('p', { class: 'muted', text: 'Aqui vai aparecer onde se paga menos do que a qualidade do bairro sugere. O gráfico entra quando os preços dos anúncios forem coletados.' }),
      renderSources(),
    );
    return;
  }
  const points = result.ranked;
  const top = points.slice(0, 3).map((p) => p.id);
  const toggle = h('input', { type: 'checkbox', checked: state.showFrontier });
  toggle.addEventListener('change', () => { state.showFrontier = toggle.checked; update(); });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Gráfico de qualidade e preço do metro quadrado dos bairros');
  box.replaceChildren(
    h('h2', { text: 'Qualidade × preço' }),
    h('p', { class: 'muted small', text: 'Abaixo da reta, o bairro custa menos do que a qualidade dele sugere. Clique num ponto para ver o bairro.' }),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { class: 'band-dot band-high' }), 'Nota alta'),
      h('span', {}, h('i', { class: 'band-dot band-mid' }), 'Nota intermediária'),
      h('span', {}, h('i', { class: 'band-dot band-low' }), 'Nota baixa'),
      h('span', {}, h('i', { class: 'ring' }), 'Selecionado'),
      h('span', {}, h('i', { class: 'line' }), 'Preço esperado'),
      state.showFrontier ? h('span', {}, h('i', { class: 'dash' }), 'Fronteira de eficiência') : null),
    h('div', { class: 'chart-wrap' }, svg),
    h('label', { class: 'check small' }, toggle, h('span', { text: 'Mostrar a fronteira de eficiência (nenhum outro bairro é melhor e mais barato)' })),
    result.fit ? h('p', { class: 'muted small', text: `Reta: preço esperado = ${fmt.one(result.fit.a)} + ${fmt.one(result.fit.b)} × Q. A qualidade explica ${fmt.int(result.fit.r2 * 100)}% da variação do preço (R²).` }) : null,
    renderSources(),
  );
  drawScatter(svg, {
    points, fit: result.fit, frontierIds: result.frontier, showFrontier: state.showFrontier,
    selectedId: state.selectedId, labelIds: top, deal: state.deal, onSelect: select,
  });
}

function priceText(v) {
  if (v === null || v === undefined) return '–';
  return state.deal === 'rent' ? `${fmt.brl2(v)}/m²` : `${fmt.brl(v)}/m²`;
}

function aliasLine(id) {
  const aliases = aliasesById.get(id) || [];
  if (!aliases.length) return null;
  const shown = aliases.slice(0, 4).join(', ');
  const rest = aliases.length > 4 ? ` e mais ${aliases.length - 4}` : '';
  return h('p', { class: 'muted small', text: `Inclui também: ${shown}${rest}` });
}

function renderDetail(r, result) {
  const box = $('#detail');
  if (!r) { box.replaceChildren(h('p', { class: 'muted', text: 'Escolha um bairro na lista.' })); return; }
  const main = r.final !== null ? r.final : r.quality;
  let position = 'Fora da lista: só a nota de qualidade';
  if (r.final !== null) position = `${r.rank}º na lista`;
  else if (qualityOnly && r.rank) position = `${r.rank}º de ${result.ranked.length} em qualidade`;

  const head = h('div', { class: 'detail-head' },
    h('div', {}, h('p', { class: 'eyebrow', text: position }), h('h2', { text: r.name }),
      r.population ? h('p', { class: 'muted small', text: `${fmt.int(r.population)} moradores` }) : null,
      aliasLine(r.id)),
    h('div', { class: 'detail-score' }, h('span', { class: 'score', text: fmt.score(main) }), h('div', {}, bandBadge(r.band))));

  const up = r.contributions.filter((c) => c.impact > 0).slice(0, 3);
  const down = r.contributions.filter((c) => c.impact < 0).slice(-2).reverse();
  const pros = h('div', { class: 'pros-cons' },
    h('div', { class: 'pros' }, h('h3', { text: 'Pontos fortes' }),
      up.length ? h('ul', {}, ...up.map((c) => h('li', { text: `${labelOf(c.id)}: melhor que ${fmt.int(c.percentile)}% dos bairros` }))) : h('p', { class: 'muted', text: 'Nenhum critério acima da média.' })),
    h('div', { class: 'cons' }, h('h3', { text: 'Pontos de atenção' }),
      down.length ? h('ul', {}, ...down.map((c) => h('li', { text: `${labelOf(c.id)}: melhor que só ${fmt.int(c.percentile)}% dos bairros` }))) : h('p', { class: 'muted', text: 'Nenhum critério abaixo da média.' })));

  const kv = h('dl', { class: 'kv' });
  const add = (label, value) => kv.append(h('div', {}, h('dt', { text: label }), h('dd', { text: value })));
  if (!qualityOnly) {
    add('Qualidade', fmt.score(r.quality));
    add('Custo-benefício', fmt.score(r.cb));
    add(state.deal === 'rent' ? 'Aluguel do m²' : 'Venda do m²', priceText(r.price));
    add('Preço esperado', priceText(r.expected));
    if (r.diff !== null) add('Diferença', `${fmt.int(Math.abs(r.diff * 100))}% ${r.diff >= 0 ? 'mais barato' : 'mais caro'}`);
    add('Anúncios', fmt.int(r.listings));
    if (r.years !== null) add('Preço ÷ aluguel', `${fmt.one(r.years)} anos`);
  }

  const n = data.neighborhoods.find((x) => x.id === r.id);
  const hasRaw = Boolean(n.raw);
  const table = h('table', { class: 'crit-table' },
    h('thead', {}, h('tr', {}, h('th', { text: 'Critério' }),
      hasRaw ? h('th', { text: 'O que medimos' }) : null,
      h('th', { class: 'n', text: 'Percentil' }), h('th', { class: 'n', text: 'Peso' }))));
  const tbody = h('tbody');
  for (const c of criteria) {
    const p = n.percentiles[c.id];
    const bar = h('span', { class: 'bar-mini' });
    bar.style.width = `${Math.round(p * 0.6)}px`;
    let measured = null;
    if (hasRaw && RAW_LABELS[c.id]) {
      const [key, label] = RAW_LABELS[c.id];
      const v = n.raw[key];
      measured = h('td', { class: 'small', text: v === null || v === undefined ? '–' : `${fmt.one(v).replace(/,0$/, '')} ${label}` });
    } else if (hasRaw) {
      measured = h('td', { text: '–' });
    }
    tbody.append(h('tr', {}, h('td', { text: c.label }), measured,
      h('td', { class: 'n' }, `${fmt.int(p)} `, bar), h('td', { class: 'n', text: String(state.weights[c.id]) })));
  }
  table.append(tbody);

  const warn = r.warnings.length ? h('ul', { class: 'warn-list' }, ...r.warnings.map((w) => h('li', { text: w }))) : null;
  box.replaceChildren(head, h('div', { class: 'row' }, favButton(r, true)), pros, kv.childElementCount ? kv : '',
    h('details', { class: 'more' }, h('summary', { text: 'Ver todos os critérios' }), table), warn || '');
}

// ---------- início ----------

async function main() {
  try {
    const resp = await fetch(cfg.dataUrl || 'data/sorocaba.json');
    if (!resp.ok) throw new Error(String(resp.status));
    data = await resp.json();
  } catch {
    $('#list').replaceChildren(h('li', { class: 'notice notice-error', text: 'Não foi possível carregar os dados dos bairros.' }));
    return;
  }
  criteria = data.criteria;
  ids = criteria.map((c) => c.id);
  for (const n of data.neighborhoods) {
    aliasesById.set(n.id, Array.isArray(n.aliases) ? n.aliases : []);
    for (const old of n.alias_ids || []) idByAlias.set(old, n.id);
  }
  $('#city-line').textContent = `${data.meta.city} · diga o que importa e veja os bairros que mais combinam com você`;
  if (data.meta && data.meta.sample) {
    $('#sample-note').hidden = false;
    $('#sample-note').textContent = `Dados de exemplo: ${data.meta.city}, com bairros e números fictícios.`;
  }
  state = loadState();

  if (auth.authEnabled) {
    session = await auth.getSession();
    if (session) {
      try {
        const saved = await auth.listFavorites(data.meta.city_code);
        favorites = new Map(saved.map((f) => [resolveId(f.neighborhood_id), f.neighborhood_id]));
      } catch { favorites = new Map(); }
      try { profiles = await auth.listProfiles(); } catch { profiles = []; }
      const pid = new URLSearchParams(window.location.search).get('perfil');
      const p = pid && UUID.test(pid) ? profiles.find((x) => x.id === pid) : null;
      if (p && applyProfile(p)) showNote(`Usando o perfil "${p.name}". Mudanças aqui não alteram o perfil salvo.`);
    }
  }

  // ?bairro=<id> (ex.: vindo dos favoritos) já abre o bairro escolhido
  const param = new URLSearchParams(window.location.search).get('bairro');
  const bid = param && /^[a-z0-9-]{1,60}$/.test(param) ? resolveId(param) : null;
  if (bid && data.neighborhoods.some((n) => n.id === bid)) state.selectedId = bid;

  $('#sort').value = state.sort;
  $('#sort').addEventListener('change', () => { state.sort = $('#sort').value; saveState(); renderList(); });
  $('#search').addEventListener('input', () => renderList());
  $('#tune-reset').addEventListener('click', () => {
    state = { ...defaultState(), deal: state.deal, sort: state.sort };
    activeProfileId = null;
    buildToolbar();
    buildTuneDialog();
    update();
  });
  buildToolbar();
  buildTuneDialog();
  update();
}

main();
