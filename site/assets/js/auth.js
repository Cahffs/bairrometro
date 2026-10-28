// Contas e sessão (D026), com a biblioteca oficial do Supabase (assets/js/vendor).
//
// Segurança, em resumo:
// - A senha nunca passa por aqui depois do envio: o Supabase guarda só o hash.
// - O navegador usa só a chave publicável; quem protege os dados é a RLS do banco
//   (supabase/migrations/). Cada pessoa só lê e altera as próprias linhas.
// - Mensagens de erro genéricas: o site não revela se um e-mail tem conta.

const cfg = window.BAIRROMETRO_CONFIG || {};
const REMEMBER_KEY = 'bm-manter-conectado';
const ACTIVITY_KEY = 'bm-ultima-atividade';
const SESSION_KEY = 'bm-sessao';
const PROFILE_FIELDS = 'id, name, deal, property_types, weights, economy_emphasis, updated_at';

export const authEnabled = Boolean(
  cfg.supabaseUrl && cfg.supabasePublishableKey && window.supabase && window.supabase.createClient,
);

function safe(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

export function rememberEnabled() {
  return safe(() => localStorage.getItem(REMEMBER_KEY) === '1', false);
}

// "Manter conectado": com ele, a sessão fica no localStorage e sobrevive a fechar o navegador;
// sem ele, fica no sessionStorage e termina ao fechar a aba.
// O "code verifier" do login por link (PKCE) vai sempre para o localStorage,
// para o link do e-mail funcionar mesmo se abrir em outra aba.
const storage = {
  getItem(key) {
    return safe(() => sessionStorage.getItem(key)) ?? safe(() => localStorage.getItem(key));
  },
  setItem(key, value) {
    const persistent = rememberEnabled() || key.endsWith('-code-verifier');
    if (persistent) {
      safe(() => localStorage.setItem(key, value));
      safe(() => sessionStorage.removeItem(key));
    } else {
      safe(() => sessionStorage.setItem(key, value));
      safe(() => localStorage.removeItem(key));
    }
  },
  removeItem(key) {
    safe(() => sessionStorage.removeItem(key));
    safe(() => localStorage.removeItem(key));
  },
};

export const client = authEnabled
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: {
      storage,
      storageKey: SESSION_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  : null;

function pageUrl(page) {
  return new URL(page, window.location.href).href;
}

function friendly(error) {
  const text = `${(error && error.code) || ''} ${(error && error.message) || ''}`.toLowerCase();
  if (text.includes('invalid_credentials') || text.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (text.includes('email_not_confirmed') || text.includes('not confirmed')) return 'Confirme seu e-mail antes de entrar: procure a mensagem na caixa de entrada.';
  if (text.includes('weak_password') || text.includes('password should')) return 'Senha fraca. Use pelo menos 10 caracteres, com letras e números.';
  if (text.includes('same_password') || text.includes('different from the old')) return 'A nova senha precisa ser diferente da atual.';
  if (text.includes('rate') || text.includes('too many') || text.includes('over_')) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (text.includes('limite')) return 'Você chegou ao limite desta conta. Apague um item para salvar outro.';
  if (text.includes('fetch') || text.includes('network')) return 'Sem conexão com o serviço de contas. Tente de novo em instantes.';
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}

function notConfigured() {
  return { ok: false, message: 'As contas ainda não estão configuradas neste site.' };
}

// ---------- sessão ----------

export async function getSession() {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

// Confere a sessão com o servidor (não confia só no que está guardado no navegador).
export async function getUser() {
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

export function onAuthChange(callback) {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export function touchActivity() {
  safe(() => localStorage.setItem(ACTIVITY_KEY, String(Date.now())));
}

export async function signIn(email, password, keepConnected) {
  if (!client) return notConfigured();
  safe(() => localStorage.setItem(REMEMBER_KEY, keepConnected ? '1' : '0'));
  touchActivity();
  const { error } = await client.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export async function signUp(email, password) {
  if (!client) return notConfigured();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: pageUrl('bem-vindo.html') },
  });
  if (error) return { ok: false, message: friendly(error) };
  return { ok: true, needsConfirmation: !data.session };
}

// Sempre responde "ok" (exceto excesso de tentativas) para não revelar se o e-mail tem conta.
export async function requestPasswordReset(email) {
  if (!client) return notConfigured();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: pageUrl('entrar.html') });
  if (error && /rate|too many|over_/i.test(`${error.code} ${error.message}`)) return { ok: false, message: friendly(error) };
  return { ok: true };
}

export async function updatePassword(password) {
  if (!client) return notConfigured();
  const { error } = await client.auth.updateUser({ password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

// scope 'local': só este navegador. scope 'global': todos os dispositivos.
export async function signOut(scope = 'local') {
  if (!client) return;
  await client.auth.signOut({ scope });
  storage.removeItem(SESSION_KEY);
}

// Saída por inatividade: vale quando "manter conectado" está desmarcado
// (computador compartilhado, aba esquecida aberta). Com ele marcado, a pessoa
// escolheu continuar conectada.
export function startInactivityWatch(onTimeout) {
  if (!client) return;
  const limitMs = (Number(cfg.inactivityMinutes) || 30) * 60 * 1000;
  let lastWrite = 0;
  const touch = () => {
    const now = Date.now();
    if (now - lastWrite > 15000) { lastWrite = now; touchActivity(); }
  };
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
    window.addEventListener(ev, touch, { passive: true });
  }
  const check = async () => {
    if (rememberEnabled()) return;
    const session = await getSession();
    if (!session) return;
    const last = Number(safe(() => localStorage.getItem(ACTIVITY_KEY)) || 0);
    if (last && Date.now() - last > limitMs) {
      await signOut('local');
      touchActivity();
      if (onTimeout) onTimeout();
    }
  };
  check();
  window.setInterval(check, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}

// ---------- dados da conta (protegidos por RLS) ----------

export async function listProfiles() {
  if (!client) return [];
  const { data, error } = await client.from('search_profiles').select(PROFILE_FIELDS).order('updated_at', { ascending: false });
  if (error) throw new Error(friendly(error));
  return data;
}

export async function getProfile(id) {
  if (!client) return null;
  const { data, error } = await client.from('search_profiles').select(PROFILE_FIELDS).eq('id', id).maybeSingle();
  if (error) throw new Error(friendly(error));
  return data;
}

// Não guarda o ponto de partida ("Com filhos", "Com pet"): ele revelaria os moradores (D026).
export async function saveProfile({ name, deal, propertyTypes, weights, emphasis }) {
  if (!client) return notConfigured();
  const { data, error } = await client.from('search_profiles').insert({
    name, deal, property_types: propertyTypes, weights, economy_emphasis: emphasis,
  }).select('id').single();
  return error ? { ok: false, message: friendly(error) } : { ok: true, id: data.id };
}

export async function deleteProfile(id) {
  if (!client) return notConfigured();
  const { error } = await client.from('search_profiles').delete().eq('id', id);
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export async function listFavorites(cityCode) {
  if (!client) return [];
  let query = client.from('favorite_neighborhoods').select('city_code, neighborhood_id, created_at').order('created_at', { ascending: false });
  if (cityCode) query = query.eq('city_code', cityCode);
  const { data, error } = await query;
  if (error) throw new Error(friendly(error));
  return data;
}

export async function addFavorite(cityCode, neighborhoodId) {
  if (!client) return notConfigured();
  const { error } = await client.from('favorite_neighborhoods').insert({ city_code: cityCode, neighborhood_id: neighborhoodId });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export async function removeFavorite(cityCode, neighborhoodId) {
  if (!client) return notConfigured();
  const { error } = await client.from('favorite_neighborhoods').delete()
    .eq('city_code', cityCode).eq('neighborhood_id', neighborhoodId);
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

// Exclui a conta e, em cascata, perfis e favoritos (função delete_my_account no banco).
export async function deleteAccount() {
  if (!client) return notConfigured();
  const { error } = await client.rpc('delete_my_account');
  if (error) return { ok: false, message: friendly(error) };
  await signOut('local');
  return { ok: true };
}
