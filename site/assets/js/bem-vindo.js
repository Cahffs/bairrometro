// Boas-vindas: depois de confirmar o e-mail, a pessoa monta o primeiro perfil de busca em 4 passos.
// Moradores (filhos, pet, carro) só ajustam os pesos e ficam no navegador; a conta guarda os pesos (D026).
import { h, initPage } from './common.js';
import { startingWeights, PRESETS, DEFAULT_EMPHASIS } from './scoring.js';
import * as auth from './auth.js';

initPage();

const $ = (sel) => document.querySelector(sel);
const cfg = window.BAIRROMETRO_CONFIG || {};
const MAX_PRIORITIES = 3;
const TYPES = [['house', 'Casa de rua'], ['condo_house', 'Casa em condomínio'], ['apartment', 'Apartamento']];
const FALLBACK_CRITERIA = [
  ['daily', 'Dia a dia'], ['education', 'Educação'], ['health', 'Saúde'], ['mobility', 'Mobilidade'],
  ['safety', 'Segurança'], ['green', 'Lazer e verde'], ['infrastructure', 'Infraestrutura'], ['quiet', 'Sossego'],
];
const HINTS = {
  daily: 'mercado, farmácia e padaria a pé', education: 'escolas e creches perto', health: 'postos e clínicas perto',
  mobility: 'ônibus perto de casa', safety: 'menos ocorrências perto de casa', green: 'praças e parques',
  infrastructure: 'água, esgoto e coleta de lixo', quiet: 'longe de vias movimentadas e de bares',
};

const answers = { deal: 'rent', undecided: false, types: TYPES.map((t) => t[0]), flags: [], priorities: [], name: 'Meu perfil' };
let criteria = FALLBACK_CRITERIA;
let step = 0;

function say(kind, text) {
  const box = $('#status');
  box.className = `notice notice-${kind}`;
  box.textContent = text;
  box.hidden = false;
}

// Botão de escolha (cartão ou etiqueta) com estado ligado/desligado.
function choice(label, sub, pressed, onClick, cls = 'choice') {
  return h('button', { type: 'button', class: cls, 'aria-pressed': pressed ? 'true' : 'false', on: { click: onClick } },
    h('strong', { text: label }), sub ? h('span', { class: 'choice-sub', text: sub }) : null);
}

const STEPS = [
  {
    title: 'O que você busca?',
    render() {
      const deals = [['rent', 'Alugar', 'Comparar aluguéis'], ['sale', 'Comprar', 'Comparar preços de venda'],
        ['undecided', 'Ainda não sei', 'Ver os dois e decidir depois']];
      const current = answers.undecided ? 'undecided' : answers.deal;
      return [
        h('p', { class: 'muted', text: 'São 4 perguntas rápidas para montar o seu perfil de busca. Dá para mudar tudo depois.' }),
        h('div', { class: 'choices' }, ...deals.map(([id, label, sub]) => choice(label, sub, current === id, () => {
          answers.undecided = id === 'undecided';
          answers.deal = id === 'sale' ? 'sale' : 'rent';
          render();
        }))),
        h('h3', { text: 'Que tipo de imóvel?' }),
        h('div', { class: 'chips' }, ...TYPES.map(([id, label]) => choice(label, null, answers.types.includes(id), () => {
          const next = answers.types.includes(id) ? answers.types.filter((t) => t !== id) : [...answers.types, id];
          if (next.length) answers.types = TYPES.map((t) => t[0]).filter((t) => next.includes(t));
          render();
        }, 'chip'))),
      ];
    },
  },
  {
    title: 'Quem vai morar com você?',
    render() {
      return [
        h('p', { class: 'muted', text: 'Marque o que fizer sentido. Isso ajuda a sugerir o que pesa mais na nota de cada bairro.' }),
        h('div', { class: 'chips' }, ...Object.entries(PRESETS).map(([id, p]) => choice(p.label, null, answers.flags.includes(id), () => {
          answers.flags = answers.flags.includes(id) ? answers.flags.filter((f) => f !== id) : [...answers.flags, id];
          render();
        }, 'chip'))),
        h('p', { class: 'hint', text: 'Pode pular se nenhuma opção combinar com você.' }),
      ];
    },
  },
  {
    title: 'O que mais importa para você?',
    render() {
      const full = answers.priorities.length >= MAX_PRIORITIES;
      return [
        h('p', { class: 'muted', text: `Escolha até ${MAX_PRIORITIES}. Eles ganham o peso máximo na nota.` }),
        h('div', { class: 'choices choices-small' }, ...criteria.map(([id, label]) => {
          const on = answers.priorities.includes(id);
          const btn = choice(label, HINTS[id], on, () => {
            answers.priorities = on ? answers.priorities.filter((p) => p !== id) : [...answers.priorities, id];
            render();
          });
          if (full && !on) btn.disabled = true;
          return btn;
        })),
      ];
    },
  },
  {
    title: 'Tudo pronto! Dê um nome ao seu perfil',
    render() {
      const input = h('input', { type: 'text', maxlength: 60, value: answers.name, id: 'profile-name' });
      input.addEventListener('input', () => { answers.name = input.value; });
      const top = criteria.filter(([id]) => answers.priorities.includes(id)).map(([, l]) => l);
      return [
        h('label', { class: 'field' }, h('span', { text: 'Nome do perfil' }), input),
        h('div', { class: 'summary' },
          h('p', {}, h('strong', { text: 'Busca: ' }), answers.undecided ? 'ainda não sei (começa em aluguel; dá para trocar quando quiser)' : answers.deal === 'rent' ? 'alugar' : 'comprar'),
          h('p', {}, h('strong', { text: 'Imóvel: ' }), TYPES.filter(([id]) => answers.types.includes(id)).map(([, l]) => l.toLowerCase()).join(', ')),
          h('p', {}, h('strong', { text: 'Mais importante: ' }), top.length ? top.join(', ') : 'tudo com o mesmo peso')),
        h('p', { class: 'hint', text: 'Você pode ajustar tudo depois, na página Explorar bairros.' }),
      ];
    },
  },
];

function weights() {
  const ids = criteria.map(([id]) => id);
  const w = startingWeights(ids, answers.flags).weights;
  for (const id of answers.priorities) w[id] = 5;
  return w;
}

function render() {
  const s = STEPS[step];
  $('#step-count').textContent = `Passo ${step + 1} de ${STEPS.length}`;
  $('#progress-bar').style.width = `${((step + 1) / STEPS.length) * 100}%`;
  $('#step').replaceChildren(h('h1', { class: 'step-title', text: s.title }), ...s.render());
  $('#back').hidden = step === 0;
  $('#next').textContent = step === STEPS.length - 1 ? 'Salvar e ver os bairros' : 'Continuar';
}

async function finish(btn) {
  const name = answers.name.trim() || 'Meu perfil';
  const w = weights();
  btn.disabled = true;
  const res = await auth.saveProfile({ name, deal: answers.deal, propertyTypes: answers.types, weights: w, emphasis: DEFAULT_EMPHASIS });
  if (!res.ok) { btn.disabled = false; say('error', res.message); return; }
  // Moradores (pontos de partida) ficam só neste navegador, junto com o estado do explorador.
  try {
    localStorage.setItem('bm-explorar', JSON.stringify({
      deal: answers.deal, flags: answers.flags, weights: w, emphasis: DEFAULT_EMPHASIS, types: answers.types, showFrontier: false,
    }));
  } catch { /* sem armazenamento: o perfil salvo já tem os pesos */ }
  window.location.href = `explorar.html?perfil=${encodeURIComponent(res.id)}`;
}

async function main() {
  if (!auth.authEnabled) { say('warning', 'As contas ainda não estão configuradas neste site.'); return; }
  const user = await auth.getUser();
  if (!user) { window.location.href = 'entrar.html?next=bem-vindo.html'; return; }
  try {
    const data = await (await fetch(cfg.dataUrl || 'data/sorocaba.json')).json();
    criteria = data.criteria.map((c) => [c.id, c.label]);
  } catch { /* usa a lista padrão */ }
  const confirmed = new URLSearchParams(window.location.search).has('code');
  const hasProfiles = await auth.listProfiles().then((list) => list.length > 0, () => false);
  $('#greeting').textContent = confirmed ? 'Conta confirmada! Agora queremos saber mais de você.'
    : hasProfiles ? 'Novo perfil de busca' : 'Agora queremos saber mais de você.';
  $('#onboarding').hidden = false;
  $('#back').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  $('#next').addEventListener('click', (e) => {
    if (step < STEPS.length - 1) { step += 1; render(); window.scrollTo(0, 0); } else finish(e.currentTarget);
  });
  render();
}

main();
