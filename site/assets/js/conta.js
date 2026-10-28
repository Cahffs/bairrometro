// Página "Minha conta": perfis e favoritos em destaque; sessão, dados e exclusão embaixo.
import { h, initPage } from './common.js';
import * as auth from './auth.js';

initPage();

const $ = (sel) => document.querySelector(sel);
const cfg = window.BAIRROMETRO_CONFIG || {};
const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function say(kind, text) {
  const box = $('#status');
  box.className = `notice notice-${kind}`;
  box.textContent = text;
  box.hidden = false;
}

async function loadNames() {
  try {
    const data = await (await fetch(cfg.dataUrl || 'data/sorocaba.json')).json();
    const names = new Map(data.neighborhoods.map((n) => [n.id, n.name]));
    // favorito guardado com o id de um bairro que foi juntado a outro (D035)
    for (const n of data.neighborhoods) {
      (n.alias_ids || []).forEach((old, i) => names.set(old, `${n.aliases[i]} · agora em ${n.name}`));
    }
    return names;
  } catch {
    return new Map();
  }
}

async function renderProfiles() {
  const list = $('#profiles');
  let rows = [];
  try { rows = await auth.listProfiles(); } catch (err) { say('error', err.message); }
  $('#first-profile').hidden = rows.length > 0;
  if (!rows.length) {
    list.replaceChildren(h('li', { class: 'empty' }, h('span', { class: 'muted', text: 'Você ainda não tem perfis salvos.' })));
    return;
  }
  list.replaceChildren(...rows.map((p) => h('li', {},
    h('div', {}, h('strong', { text: p.name }),
      h('div', { class: 'muted small', text: `${p.deal === 'sale' ? 'Comprar' : 'Alugar'} · salvo em ${dateFmt.format(new Date(p.updated_at))}` })),
    h('div', { class: 'row' },
      h('a', { class: 'btn btn-primary btn-small', href: `explorar.html?perfil=${encodeURIComponent(p.id)}`, text: 'Usar' }),
      h('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Excluir', on: { click: async () => {
        if (!window.confirm(`Excluir o perfil "${p.name}"?`)) return;
        const res = await auth.deleteProfile(p.id);
        if (!res.ok) say('error', res.message);
        renderProfiles();
      } } })))));
}

async function renderFavorites(names) {
  const list = $('#favorites');
  let rows = [];
  try { rows = await auth.listFavorites(); } catch (err) { say('error', err.message); }
  if (!rows.length) {
    list.replaceChildren(h('li', { class: 'empty' }, h('span', { class: 'muted', text: 'Toque no coração de um bairro para guardá-lo aqui.' })));
    return;
  }
  list.replaceChildren(...rows.map((f) => {
    const name = names.get(f.neighborhood_id) || f.neighborhood_id;
    return h('li', {},
      h('strong', { text: name }),
      h('div', { class: 'row' },
        h('a', { class: 'btn btn-small', href: `explorar.html?bairro=${encodeURIComponent(f.neighborhood_id)}`, text: 'Ver' }),
        h('button', { type: 'button', class: 'btn btn-small btn-danger', text: 'Remover', on: { click: async () => {
          const res = await auth.removeFavorite(f.city_code, f.neighborhood_id);
          if (!res.ok) say('error', res.message);
          renderFavorites(names);
        } } })));
  }));
}

// Direito de acesso (LGPD, art. 18): baixar tudo o que a conta guarda.
async function downloadMyData(user) {
  const payload = {
    gerado_em: new Date().toISOString(),
    conta: { email: user.email, criada_em: user.created_at, ultimo_acesso: user.last_sign_in_at },
    perfis_de_busca: await auth.listProfiles(),
    bairros_favoritos: await auth.listFavorites(),
    observacao: 'A senha não aparece aqui: ela é guardada de um jeito que não pode ser lido de volta.',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: 'meus-dados-bairrometro.json' });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function main() {
  if (!auth.authEnabled) { say('warning', 'As contas ainda não estão configuradas neste site.'); return; }
  const user = await auth.getUser();
  if (!user) { window.location.href = 'entrar.html?next=conta.html'; return; }
  $('#account').hidden = false;
  $('#email').textContent = user.email;
  $('#keep').textContent = auth.rememberEnabled()
    ? 'Você continua conectado neste navegador até sair.'
    : `A sessão vale só nesta aba e termina depois de ${cfg.inactivityMinutes || 30} minutos sem uso.`;

  const names = await loadNames();
  await Promise.all([renderProfiles(), renderFavorites(names)]);

  $('#logout').addEventListener('click', async () => { await auth.signOut('local'); window.location.href = 'index.html'; });
  $('#logout-all').addEventListener('click', async () => {
    if (!window.confirm('Sair da sua conta em todos os dispositivos e navegadores?')) return;
    await auth.signOut('global');
    window.location.href = 'entrar.html';
  });
  $('#download').addEventListener('click', async () => {
    try { await downloadMyData(user); } catch (err) { say('error', err.message); }
  });
  const confirmInput = $('#delete-confirm');
  const deleteBtn = $('#delete');
  confirmInput.addEventListener('input', () => { deleteBtn.disabled = confirmInput.value.trim() !== 'EXCLUIR'; });
  deleteBtn.addEventListener('click', async () => {
    deleteBtn.disabled = true;
    const res = await auth.deleteAccount();
    if (res.ok) window.location.href = 'index.html?conta=excluida';
    else { say('error', res.message); deleteBtn.disabled = false; }
  });
}

main();
