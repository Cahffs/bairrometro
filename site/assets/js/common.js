// Partes comuns a todas as páginas: tema, cabeçalho com o estado da conta,
// formatação de números e criação segura de elementos.
import { authEnabled, getSession, onAuthChange, startInactivityWatch } from './auth.js';

// Cria elementos sem innerHTML: texto vindo de fora (nome de perfil, e-mail)
// sempre entra como texto, nunca como HTML. Isso evita XSS.
export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'on') for (const [ev, fn] of Object.entries(value)) node.addEventListener(ev, fn);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt = {
  int: (n) => nf0.format(n),
  one: (n) => nf1.format(n),
  brl: (n) => `R$ ${nf0.format(n)}`,
  brl2: (n) => `R$ ${nf2.format(n)}`,
  score: (n) => (n === null || n === undefined ? '–' : nf0.format(Math.round(n))),
};

// Só permite voltar para páginas do próprio site (evita redirecionamento para fora).
const PAGES = ['index.html', 'explorar.html', 'como-calculamos.html', 'conta.html', 'privacidade.html', 'bem-vindo.html'];
export function safeNext(value, fallback = 'conta.html') {
  return PAGES.includes(value) ? value : fallback;
}

function safeStorage(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

// Ícones do tema (traço simples, cor do texto): sol = claro, lua = escuro.
const ICONS = {
  light: ['M12 3v2', 'M12 19v2', 'M3 12h2', 'M19 12h2', 'M5.6 5.6l1.4 1.4', 'M17 17l1.4 1.4',
    'M5.6 18.4L7 17', 'M17 7l1.4-1.4', 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z'],
  dark: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
};

function icon(paths) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) {
    svg.setAttribute(k, String(v));
  }
  for (const d of paths) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

// Sem escolha salva, segue o tema do sistema. Clicar alterna entre claro e escuro e guarda a escolha.
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let saved = safeStorage(() => localStorage.getItem('bm-tema'));
  if (!['light', 'dark'].includes(saved)) saved = null;
  const current = () => saved || (system.matches ? 'dark' : 'light');
  const apply = () => {
    const mode = current();
    if (saved) document.documentElement.dataset.theme = saved;
    else delete document.documentElement.dataset.theme;
    const label = mode === 'dark' ? 'Tema escuro (clique para o claro)' : 'Tema claro (clique para o escuro)';
    btn.replaceChildren(icon(ICONS[mode]));
    btn.setAttribute('aria-label', label);
    btn.title = label;
  };
  btn.addEventListener('click', () => {
    saved = current() === 'dark' ? 'light' : 'dark';
    safeStorage(() => localStorage.setItem('bm-tema', saved));
    apply();
  });
  system.addEventListener('change', () => { if (!saved) apply(); });
  apply();
}

function markCurrentNav() {
  const here = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach((a) => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });
}

async function initAccountLink() {
  const link = document.getElementById('account-link');
  if (!link) return;
  if (!authEnabled) { link.hidden = true; return; }
  const render = (session) => {
    link.textContent = session ? 'Minha conta' : 'Entrar';
    link.setAttribute('href', session ? 'conta.html' : 'entrar.html');
  };
  render(await getSession());
  onAuthChange((_event, session) => render(session));
}

export function initPage() {
  initTheme();
  markCurrentNav();
  initAccountLink();
  if (authEnabled) {
    startInactivityWatch(() => { window.location.href = 'entrar.html?motivo=inatividade'; });
  }
}

// Tooltip compartilhado pelos gráficos.
let tipNode = null;
export function tooltip() {
  if (!tipNode) {
    tipNode = h('div', { class: 'tooltip', role: 'status', hidden: true });
    document.body.append(tipNode);
  }
  const move = (e) => {
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const r = tipNode.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - pad;
    tipNode.style.left = `${x}px`;
    tipNode.style.top = `${y}px`;
  };
  return {
    show(e, title, lines) {
      tipNode.replaceChildren(h('strong', { text: title }), ...lines.map((l) => h('div', { text: l })));
      tipNode.hidden = false;
      move(e);
    },
    move,
    hide() { tipNode.hidden = true; },
  };
}
