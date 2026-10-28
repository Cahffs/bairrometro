-- Bairrômetro: contas de usuário (decisão D026).
--
-- O que este arquivo cria:
--   1. schema "private" (não exposto pela API) com funções auxiliares;
--   2. tabelas search_profiles (perfis de busca) e favorite_neighborhoods (favoritos);
--   3. RLS em tudo: cada pessoa só lê e altera as próprias linhas;
--   4. limite de linhas por conta (protege o banco gratuito contra abuso);
--   5. função delete_my_account para a pessoa excluir a própria conta (LGPD).
--
-- E-mail e senha ficam na tabela auth.users, administrada pelo próprio Supabase
-- (a senha só como hash). Nada aqui guarda nome, CPF, telefone, endereço ou renda.
--
-- Como rodar: cole no SQL Editor do projeto no Supabase, ou `supabase db push`.

-- ---------------------------------------------------------------------------
-- 1. Funções auxiliares em schema privado
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Pesos válidos: só os 8 critérios conhecidos, inteiros de 0 a 5.
create or replace function private.valid_weights(w jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(w) = 'object'
     and not exists (
       select 1
       from jsonb_each(w) as e(key, value)
       where e.key not in ('daily', 'education', 'health', 'mobility', 'safety', 'green', 'infrastructure', 'quiet')
          or case
               when jsonb_typeof(e.value) = 'number' then (e.value)::numeric not in (0, 1, 2, 3, 4, 5)
               else true  -- não é número: inválido (o case garante que a conversão não roda antes)
             end
     );
$$;
revoke all on function private.valid_weights(jsonb) from public, anon;
grant execute on function private.valid_weights(jsonb) to authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Limite de linhas por conta. Roda com os direitos de quem insere (security invoker):
-- por causa da RLS, a contagem só enxerga as linhas da própria pessoa.
create or replace function private.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  max_rows integer := tg_argv[0]::integer;
  current_rows integer;
begin
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name)
    into current_rows
    using new.user_id;
  if current_rows >= max_rows then
    raise exception 'limite de % registros por conta atingido', max_rows using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon;
revoke all on function private.enforce_row_limit() from public, anon;
grant execute on function private.touch_updated_at() to authenticated;
grant execute on function private.enforce_row_limit() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.search_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  deal text not null default 'rent' check (deal in ('rent', 'sale')),
  property_types text[] not null default array['house', 'condo_house', 'apartment']::text[]
    check (
      property_types <@ array['house', 'condo_house', 'apartment']::text[]
      and cardinality(property_types) between 1 and 3
    ),
  weights jsonb not null check (private.valid_weights(weights)),
  economy_emphasis numeric(3, 2) not null default 0.5 check (economy_emphasis between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.search_profiles is 'Perfis de busca salvos. Sem moradores nem orçamento (D026).';
create index if not exists search_profiles_user_id_idx on public.search_profiles (user_id);

create table if not exists public.favorite_neighborhoods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  city_code text not null check (city_code ~ '^[a-z0-9-]{1,40}$'),
  neighborhood_id text not null check (neighborhood_id ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, city_code, neighborhood_id)
);
comment on table public.favorite_neighborhoods is 'Bairros favoritos de cada conta.';

drop trigger if exists search_profiles_touch on public.search_profiles;
create trigger search_profiles_touch
  before update on public.search_profiles
  for each row execute function private.touch_updated_at();

drop trigger if exists search_profiles_limit on public.search_profiles;
create trigger search_profiles_limit
  before insert on public.search_profiles
  for each row execute function private.enforce_row_limit('20');

drop trigger if exists favorite_neighborhoods_limit on public.favorite_neighborhoods;
create trigger favorite_neighborhoods_limit
  before insert on public.favorite_neighborhoods
  for each row execute function private.enforce_row_limit('200');

-- ---------------------------------------------------------------------------
-- 3. Permissões mínimas + RLS
-- ---------------------------------------------------------------------------
-- Ninguém anônimo toca nas tabelas. Quem está logado recebe só o necessário;
-- a RLS decide QUAIS linhas.
revoke all on public.search_profiles from public, anon, authenticated;
revoke all on public.favorite_neighborhoods from public, anon, authenticated;
grant select, insert, delete on public.search_profiles to authenticated;
grant update (name, deal, property_types, weights, economy_emphasis) on public.search_profiles to authenticated;
grant select, insert, delete on public.favorite_neighborhoods to authenticated;

alter table public.search_profiles enable row level security;
alter table public.favorite_neighborhoods enable row level security;

drop policy if exists "perfis: ler os próprios" on public.search_profiles;
drop policy if exists "perfis: criar os próprios" on public.search_profiles;
drop policy if exists "perfis: alterar os próprios" on public.search_profiles;
drop policy if exists "perfis: apagar os próprios" on public.search_profiles;

create policy "perfis: ler os próprios" on public.search_profiles
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "perfis: criar os próprios" on public.search_profiles
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "perfis: alterar os próprios" on public.search_profiles
  for update to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "perfis: apagar os próprios" on public.search_profiles
  for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "favoritos: ler os próprios" on public.favorite_neighborhoods;
drop policy if exists "favoritos: criar os próprios" on public.favorite_neighborhoods;
drop policy if exists "favoritos: apagar os próprios" on public.favorite_neighborhoods;

create policy "favoritos: ler os próprios" on public.favorite_neighborhoods
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "favoritos: criar os próprios" on public.favorite_neighborhoods
  for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "favoritos: apagar os próprios" on public.favorite_neighborhoods
  for delete to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 4. Excluir a própria conta (LGPD, art. 18)
-- ---------------------------------------------------------------------------
-- Precisa de "security definer" porque só o dono do banco pode apagar de auth.users.
-- A documentação do Supabase alerta contra funções assim em schema exposto; aqui o
-- risco é controlado: a função não recebe parâmetro nenhum, só age sobre auth.uid()
-- (o próprio usuário logado), tem search_path vazio e nomes qualificados, e só
-- usuários logados podem chamá-la. Perfis e favoritos somem em cascata.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
