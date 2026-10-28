// Boas-vindas: depois de criar a conta, a pessoa monta o primeiro perfil de busca em 5 perguntas.
// Ao lado, uma prévia mostra os bairros que mais combinam, recalculada a cada resposta: cada
// pergunta precisa mudar o resultado, senão não vale a pena fazê-la.
// Quem mora junto e o deslocamento só ajustam os pesos e ficam no navegador; a conta guarda os pesos (D026).
import { h, initPage, fmt } from './common.js';
import { startingWeights, scoreCity, DEFAULT_EMPHASIS } from './scoring.js';
import * as auth from './auth.js';

initPage();

const $ = (sel) => document.querySelector(sel);
const cfg = window.BAIRROMETRO_CONFIG || {};
const MAX_PRIORITIES = 3;
const PREVIEW_SIZE = 3;
const KEYS = 'ABCDEFGH';
const ALL_TYPES = ['house', 'condo_house', 'apartment'];
const FALLBACK_CRITERIA = [
  ['daily', 'Dia a dia'], ['education', 'Educação'], ['health', 'Saúde'], ['mobility', 'Mobilidade'],
  ['safety', 'Segurança'], ['green', 'Lazer e verde'], ['infrastructure', 'Infraestrutura'], ['quiet', 'Sossego'],
];
const HINTS = {
  daily: 'Mercado, farmácia e padaria a pé', education: 'Escolas e creches perto', health: 'UBS, clínicas e hospitais perto',
  mobility: 'Pontos de ônibus perto de casa', safety: 'Menos ocorrências perto de casa', green: 'Praças e parques',
  infrastructure: 'Água, esgoto e coleta de lixo', quiet: 'Longe de avenidas e de bares',
};

const answers = { goal: null, household: [], commute: null, priorities: [], name: 'Meu perfil' };
let criteria = FALLBACK_CRITERIA;
let data = null;
let step = 0;
let previousTop = [];

function say(kind, text) {
  const box = $('#status');
  box.className = `notice notice-${kind}`;
  box.textContent = text;
  box.hidden = false;
}

// Respostas viram pontos de partida de pesos (scoring.js): crianças, pet e sem carro.
function flags() {
  const out = [];
  if (answers.household.includes('kids')) out.push('filhos');
  if (answers.household.includes('pets')) out.push('pet');
  if (answers.commute && answers.commute !== 'car') out.push('semcarro');
  return out;
}

function weights() {
  const w = startingWeights(criteria.map(([id]) => id), flags()).weights;
  for (const id of answers.priorities) w[id] = 5;
  return w;
}

// Uma opção: letra de atalho e texto; nas perguntas de várias respostas, uma caixinha de marcar.
function option(index, { label, sub, pressed, multi, disabled, onPick }) {
  return h('li', {}, h('button', {
    type: 'button', class: multi ? 'opt opt-multi' : 'opt', 'aria-pressed': pressed ? 'true' : 'false',
    'data-key': KEYS[index], disabled, on: { click: onPick },
  },
  h('span', { class: 'opt-key', 'aria-hidden': 'true', text: KEYS[index] }),
  h('span', { class: 'opt-text' }, h('strong', { text: label }), sub ? h('span', { text: sub }) : null),
  multi ? h('span', { class: 'opt-mark', 'aria-hidden': 'true' }) : null));
}

function optionList(label, items) {
  return h('ul', { class: 'opts', role: 'group', 'aria-label': label }, ...items.map((item, i) => option(i, item)));
}

const STEPS = [
  {
    short: 'Objetivo',
    title: 'O que você está buscando?',
    help: 'Dá para trocar depois, na página dos bairros.',
    ready: () => answers.goal !== null,
    render() {
      const goals = [['rent', 'Alugar', 'Comparar aluguéis'], ['sale', 'Comprar', 'Comparar preços de venda'],
        ['undecided', 'Ainda não sei', 'Ver os dois e decidir depois']];
      return optionList(this.title, goals.map(([id, label, sub]) => ({
        label, sub, pressed: answers.goal === id, onPick: () => { answers.goal = id; update(); },
      })));
    },
  },
  {
    short: 'Moradores',
    title: 'Quem vai morar com você?',
    help: 'Crianças fazem escola, segurança e praças pesarem mais; pets, praças e sossego.',
    ready: () => answers.household.length > 0,
    render() {
      const people = [['adults', 'Só adultos', 'Ninguém além de adultos'], ['kids', 'Crianças', 'Filhos, enteados, netos'],
        ['pets', 'Pets', 'Cachorro, gato e companhia']];
      return optionList(this.title, people.map(([id, label, sub]) => ({
        label, sub, multi: true, pressed: answers.household.includes(id),
        onPick: () => {
          const on = answers.household.includes(id);
          if (id === 'adults') answers.household = on ? [] : ['adults'];
          else answers.household = on ? answers.household.filter((x) => x !== id)
            : [...answers.household.filter((x) => x !== 'adults'), id];
          update();
        },
      })));
    },
  },
  {
    short: 'Deslocamento',
    title: 'Como você se desloca no dia a dia?',
    help: 'Sem carro, ônibus e comércio a pé passam a pesar mais.',
    ready: () => answers.commute !== null,
    render() {
      const modes = [['car', 'De carro', 'Carro ou moto próprios'], ['transit', 'Transporte público', 'Ônibus na maior parte do tempo'],
        ['active', 'A pé ou de bicicleta', 'Tudo resolvido perto de casa']];
      return optionList(this.title, modes.map(([id, label, sub]) => ({
        label, sub, pressed: answers.commute === id, onPick: () => { answers.commute = id; update(); },
      })));
    },
  },
  {
    short: 'Prioridades',
    title: 'O que não pode faltar perto de casa?',
    get help() {
      const left = MAX_PRIORITIES - answers.priorities.length;
      return left === MAX_PRIORITIES ? `Escolha até ${MAX_PRIORITIES}. Elas ganham o peso máximo na nota.`
        : left === 0 ? `Pronto: ${MAX_PRIORITIES} de ${MAX_PRIORITIES}. Desmarque uma para trocar.`
          : `${answers.priorities.length} de ${MAX_PRIORITIES} escolhidas.`;
    },
    ready: () => true,
    render() {
      const full = answers.priorities.length >= MAX_PRIORITIES;
      return optionList(this.title, criteria.map(([id, label]) => {
        const on = answers.priorities.includes(id);
        return {
          label, sub: HINTS[id], multi: true, pressed: on, disabled: full && !on,
          onPick: () => {
            answers.priorities = on ? answers.priorities.filter((p) => p !== id) : [...answers.priorities, id];
            update();
          },
        };
      }));
    },
  },
  {
    short: 'Perfil',
    title: 'Pronto. Como vamos chamar este perfil?',
    help: 'Você pode ter vários perfis, por exemplo um para alugar e outro para comprar.',
    ready: () => true,
    render() {
      const input = h('input', { type: 'text', maxlength: 60, value: answers.name, id: 'profile-name', class: 'onb-name',
        'aria-label': 'Nome do perfil', autocomplete: 'off' });
      input.addEventListener('input', () => { answers.name = input.value; });
      const goal = { rent: 'Alugar', sale: 'Comprar', undecided: 'Ainda não sei (começa em aluguel)' }[answers.goal] || 'Alugar';
      const who = answers.household.includes('adults') || !answers.household.length ? 'Só adultos'
        : answers.household.map((x) => ({ kids: 'Crianças', pets: 'Pets' })[x]).join(' e ');
      const move = { car: 'De carro', transit: 'Transporte público', active: 'A pé ou de bicicleta' }[answers.commute] || '–';
      const top = criteria.filter(([id]) => answers.priorities.includes(id)).map(([, l]) => l);
      const row = (term, value) => [h('dt', { text: term }), h('dd', { text: value })];
      return h('div', {}, input,
        h('dl', { class: 'onb-summary' }, ...row('Busca', goal), ...row('Moradores', who), ...row('Deslocamento', move),
          ...row('Prioridades', top.length ? top.join(', ') : 'Tudo com o mesmo peso')));
    },
  },
];

// ---------- prévia ao vivo (rodapé do painel) ----------

function bandBadge(r) {
  return h('span', { class: 'band' }, h('i', { class: `band-dot band-${r.band.id}`, 'aria-hidden': 'true' }), r.band.label);
}

function renderPreview() {
  const box = $('#preview');
  if (!data) { box.hidden = true; return; }
  const deal = answers.goal === 'sale' ? 'sale' : 'rent';
  const result = scoreCity(data, { weights: weights(), deal, emphasis: DEFAULT_EMPHASIS });
  const rows = [...result.ranked, ...result.unranked]
    .filter((r) => r.quality !== null)
    .sort((a, b) => b.quality - a.quality)
    .slice(0, PREVIEW_SIZE);
  if (!rows.length) { box.hidden = true; return; }
  const [first, ...rest] = rows;
  const changed = previousTop.length > 0 && previousTop[0] !== first.id;
  box.replaceChildren(
    h('p', { class: 'onb-now-label', text: 'No topo agora, com as suas respostas' }),
    h('p', { class: changed ? 'onb-now-top is-new' : 'onb-now-top' },
      h('span', { class: 'onb-now-name', text: first.name }),
      h('span', { class: 'onb-now-score', text: fmt.score(first.quality) }), bandBadge(first)),
    h('ol', { class: 'onb-now-rest', start: 2 }, ...rest.map((r) => h('li', {},
      h('span', { text: r.name }), h('span', { class: 'onb-now-small', text: fmt.score(r.quality) }), bandBadge(r)))));
  box.hidden = false;
  previousTop = rows.map((r) => r.id);
}

// ---------- passos ----------

function renderSteps() {
  $('#steps').replaceChildren(...STEPS.map((s, i) => h('li', {
    class: i <= step ? 'on' : '', 'aria-current': i === step ? 'step' : undefined,
  }, h('span', { class: 'sr-only', text: `${i + 1}. ${s.short}${i < step ? ' (feito)' : ''}` }))));
}

function render() {
  const s = STEPS[step];
  const pad = (n) => String(n).padStart(2, '0');
  $('#step-count').textContent = `${pad(step + 1)} / ${pad(STEPS.length)} · ${s.short}`;
  $('#step-title').textContent = s.title;
  $('#step-help').textContent = s.help;
  $('#step').replaceChildren(s.render());
  $('#back').hidden = step === 0;
  $('#kbd-hint').hidden = step === STEPS.length - 1;
  const next = $('#next');
  next.textContent = step === STEPS.length - 1 ? 'Salvar e ver os bairros' : 'Continuar';
  next.disabled = !s.ready();
  renderSteps();
}

// Uma resposta mudou: redesenha o passo e recalcula a prévia.
function update() {
  render();
  renderPreview();
}

function go(delta) {
  step = Math.min(STEPS.length - 1, Math.max(0, step + delta));
  render();
  window.scrollTo(0, 0);
  if (step === STEPS.length - 1) $('#profile-name').focus();
}

async function finish(btn) {
  const name = answers.name.trim() || 'Meu perfil';
  const deal = answers.goal === 'sale' ? 'sale' : 'rent';
  const w = weights();
  btn.disabled = true;
  const res = await auth.saveProfile({ name, deal, propertyTypes: ALL_TYPES, weights: w, emphasis: DEFAULT_EMPHASIS });
  if (!res.ok) { btn.disabled = false; say('error', res.message); return; }
  // Moradores e deslocamento (pontos de partida) ficam só neste navegador, junto com o estado do explorador.
  try {
    localStorage.setItem('bm-explorar', JSON.stringify({
      deal, flags: flags(), weights: w, emphasis: DEFAULT_EMPHASIS, types: ALL_TYPES, showFrontier: false,
    }));
  } catch { /* sem armazenamento: o perfil salvo já tem os pesos */ }
  window.location.href = `explorar.html?perfil=${encodeURIComponent(res.id)}`;
}

// Atalhos: letras escolhem opções; Enter avança.
function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = e.target instanceof HTMLInputElement;
  if (e.key === 'Enter') {
    // Enter num botão ou link faz o que eles fazem; no resto da página, avança
    const onControl = e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;
    const next = $('#next');
    if (!next.disabled && (typing || !onControl)) { e.preventDefault(); next.click(); }
    return;
  }
  if (typing || !/^[a-h]$/i.test(e.key)) return;
  const button = document.querySelector(`.opt[data-key="${e.key.toUpperCase()}"]`);
  if (button && !button.disabled) { e.preventDefault(); button.click(); button.focus(); }
}

async function main() {
  if (!auth.authEnabled) { say('warning', 'As contas ainda não estão configuradas neste site.'); return; }
  const user = await auth.getUser();
  if (!user) { window.location.href = 'entrar.html?next=bem-vindo.html'; return; }
  try {
    data = await (await fetch(cfg.dataUrl || 'data/sorocaba.json')).json();
    criteria = data.criteria.map((c) => [c.id, c.label]);
  } catch { data = null; }
  const hasProfiles = await auth.listProfiles().then((list) => list.length > 0, () => false);
  $('#greeting').textContent = hasProfiles ? 'Novo perfil de busca' : 'Conta criada. Agora queremos saber mais de você.';
  $('#onboarding').hidden = false;
  $('#back').addEventListener('click', () => go(-1));
  $('#next').addEventListener('click', (e) => {
    if (step < STEPS.length - 1) go(1); else finish(e.currentTarget);
  });
  document.addEventListener('keydown', onKey);
  update();
}

main();
