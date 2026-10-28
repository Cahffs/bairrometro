// Página "Entrar": login, cadastro, senha esquecida e troca de senha.
import { h, initPage, safeNext } from './common.js';
import * as auth from './auth.js';

initPage();

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(window.location.search);
const requestedNext = params.get('next') ? safeNext(params.get('next')) : null;

// Depois de entrar: volta para onde a pessoa estava; sem destino, quem ainda não tem
// perfil vai para as boas-vindas, e quem já tem vai explorar os bairros.
async function afterLogin() {
  if (requestedNext) return requestedNext;
  try {
    const profiles = await auth.listProfiles();
    return profiles.length ? 'explorar.html' : 'bem-vindo.html';
  } catch {
    return 'explorar.html';
  }
}
const MIN_PASSWORD = 10;

function say(target, kind, text) {
  target.className = `notice notice-${kind}`;
  target.textContent = text;
  target.hidden = false;
}

// Regras de senha mostradas enquanto a pessoa digita (o Supabase confere de novo no servidor).
function passwordChecks(pw, email) {
  return [
    ['len', `Pelo menos ${MIN_PASSWORD} caracteres`, pw.length >= MIN_PASSWORD],
    ['letter', 'Tem letras', /[A-Za-zÀ-ÿ]/.test(pw)],
    ['digit', 'Tem números', /\d/.test(pw)],
    ['email', 'Diferente do e-mail', pw.length > 0 && pw.toLowerCase() !== (email || '').toLowerCase()],
  ];
}

function wireRules(input, list, emailInput) {
  const render = () => {
    list.replaceChildren(...passwordChecks(input.value, emailInput ? emailInput.value : '')
      .map(([, label, ok]) => h('li', { class: ok ? 'ok' : '', text: label })));
  };
  input.addEventListener('input', render);
  if (emailInput) emailInput.addEventListener('input', render);
  render();
}

function strongEnough(pw, email) {
  return passwordChecks(pw, email).every(([, , ok]) => ok);
}

function showTab(name) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const on = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.dataset.tab !== name; });
}

async function main() {
  const status = $('#status');
  if (!auth.authEnabled) {
    say(status, 'warning', 'As contas ainda não estão configuradas neste site. O explorador de bairros funciona sem conta.');
    document.querySelectorAll('form button[type="submit"]').forEach((b) => { b.disabled = true; });
  }
  if (params.get('motivo') === 'inatividade') say(status, 'info', 'Você saiu da conta depois de 30 minutos sem uso. Entre de novo para continuar.');

  document.querySelectorAll('[role="tab"]').forEach((tab) => tab.addEventListener('click', () => showTab(tab.dataset.tab)));

  // Já conectado?
  const session = await auth.getSession();
  if (session && !params.get('code')) {
    say(status, 'info', 'Você já está conectado.');
    $('#already').hidden = false;
  }

  // Link de "esqueci a senha": o Supabase avisa com o evento PASSWORD_RECOVERY.
  auth.onAuthChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      $('#tabs').hidden = true;
      document.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = true; });
      $('#panel-recovery').hidden = false;
      say(status, 'info', 'Defina sua nova senha.');
    }
  });

  // Entrar
  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const res = await auth.signIn($('#login-email').value.trim(), $('#login-password').value, $('#login-keep').checked);
    if (res.ok) {
      window.location.href = await afterLogin();
      return;
    }
    btn.disabled = false;
    say(status, 'error', res.message);
  });

  // Criar conta
  const suEmail = $('#signup-email');
  const suPw = $('#signup-password');
  wireRules(suPw, $('#signup-rules'), suEmail);
  $('#form-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = suEmail.value.trim();
    if (!strongEnough(suPw.value, email)) { say(status, 'error', 'A senha ainda não atende às regras abaixo do campo.'); return; }
    if (suPw.value !== $('#signup-password2').value) { say(status, 'error', 'As duas senhas não são iguais.'); return; }
    if (!$('#signup-consent').checked) { say(status, 'error', 'Para criar a conta, é preciso aceitar a política de privacidade.'); return; }
    const btn = e.submitter;
    btn.disabled = true;
    const res = await auth.signUp(email, suPw.value);
    btn.disabled = false;
    if (!res.ok) { say(status, 'error', res.message); return; }
    e.target.reset();
    wireRules(suPw, $('#signup-rules'), suEmail);
    say(status, 'info', res.needsConfirmation
      ? 'Se este e-mail puder ser usado, enviamos um link de confirmação. Abra o link para ativar a conta e depois entre com sua senha.'
      : 'Conta criada.');
  });

  // Esqueci a senha (resposta igual exista ou não a conta)
  $('#form-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const res = await auth.requestPasswordReset($('#forgot-email').value.trim());
    btn.disabled = false;
    say(status, res.ok ? 'info' : 'error', res.ok
      ? 'Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha.'
      : res.message);
  });

  // Nova senha (depois do link do e-mail)
  const rcPw = $('#recovery-password');
  wireRules(rcPw, $('#recovery-rules'), null);
  $('#form-recovery').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!strongEnough(rcPw.value, '')) { say(status, 'error', 'A senha ainda não atende às regras abaixo do campo.'); return; }
    if (rcPw.value !== $('#recovery-password2').value) { say(status, 'error', 'As duas senhas não são iguais.'); return; }
    const res = await auth.updatePassword(rcPw.value);
    if (res.ok) window.location.href = 'conta.html';
    else say(status, 'error', res.message);
  });

  showTab(params.get('aba') === 'criar' ? 'signup' : 'login');
}

main();
