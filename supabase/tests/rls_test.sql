-- Testes de acesso (RLS) das contas do Bairrômetro, com pgTAP.
--
-- Rodam dentro de uma transação que é desfeita no final (rollback): não deixam
-- nada no banco. Use num projeto de TESTE do Supabase (o plano grátis permite 2),
-- colando no SQL Editor, ou com a CLI: `supabase test db`.
--
-- Cada teste simula uma pessoa: troca o papel para "anon" ou "authenticated"
-- e define o "sub" do token, que é o que auth.uid() devolve.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

-- Duas pessoas de teste
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.invalid', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bia@teste.invalid', 'authenticated', 'authenticated');

-- ---------- Ana (logada) ----------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.search_profiles (name, weights) values ('Perfil da Ana', '{"daily": 5, "safety": 4}') $$,
  'Ana cria o próprio perfil'
);
select is((select count(*) from public.search_profiles)::int, 1, 'Ana vê só o próprio perfil');
select lives_ok(
  $$ insert into public.favorite_neighborhoods (city_code, neighborhood_id) values ('exemplo', 'alfa') $$,
  'Ana favorita um bairro'
);
select throws_ok(
  $$ insert into public.search_profiles (user_id, name, weights)
     values ('22222222-2222-2222-2222-222222222222', 'Perfil falso', '{"daily": 3}') $$,
  '42501', null,
  'Ana não consegue criar perfil em nome da Bia'
);
select throws_ok(
  $$ insert into public.search_profiles (name, weights) values ('Pesos inválidos', '{"daily": 9}') $$,
  '23514', null,
  'Peso fora de 0 a 5 é recusado'
);
select throws_ok(
  $$ insert into public.search_profiles (name, weights) values ('Critério inventado', '{"renda": 5}') $$,
  '23514', null,
  'Critério desconhecido (ex.: renda) é recusado'
);
select throws_ok(
  $$ update public.search_profiles set user_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null,
  'Ana não consegue trocar o dono do perfil (coluna sem permissão de update)'
);

-- ---------- Bia (logada) ----------
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*) from public.search_profiles)::int, 0, 'Bia não vê o perfil da Ana');
select is((select count(*) from public.favorite_neighborhoods)::int, 0, 'Bia não vê os favoritos da Ana');

update public.search_profiles set name = 'Invadido';
delete from public.search_profiles;
delete from public.favorite_neighborhoods;

-- ---------- Visitante sem login ----------
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select count(*) from public.search_profiles $$,
  '42501', null,
  'Visitante sem login não lê perfis'
);
select throws_ok(
  $$ select public.delete_my_account() $$,
  '42501', null,
  'Visitante sem login não chama a exclusão de conta'
);

-- ---------- Conferência como dono do banco ----------
reset role;
select is(
  (select name from public.search_profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'Perfil da Ana',
  'O update e o delete da Bia não afetaram o perfil da Ana'
);

-- ---------- Ana exclui a conta ----------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$ select public.delete_my_account() $$, 'Ana exclui a própria conta');

reset role;
select is(
  (select count(*) from public.search_profiles where user_id = '11111111-1111-1111-1111-111111111111')::int
    + (select count(*) from public.favorite_neighborhoods where user_id = '11111111-1111-1111-1111-111111111111')::int,
  0,
  'Perfis e favoritos da Ana foram apagados em cascata'
);

-- finish(true) gera erro se algum teste falhar. No SQL Editor (que só mostra o
-- último comando), "Success" no final quer dizer que os 14 passaram.
select * from finish(true);
rollback;
