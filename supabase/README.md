# Contas do Bairrômetro (Supabase)

Decisão D026: contas opcionais com e-mail e senha, no Supabase (plano grátis, região São Paulo), protegidas por RLS.

| Arquivo | O que é |
|---|---|
| `migrations/20261022000000_contas.sql` | Tabelas de perfis e favoritos, permissões mínimas, RLS, limite de linhas por conta e a função de excluir a conta |
| `tests/rls_test.sql` | 14 testes de acesso (pgTAP): permitido e negado, para logado e visitante |

## Configurar (feito por Caio, uma vez)

1. **Criar a conta** em supabase.com, de preferência com o login do GitHub. **Se pedir cartão de crédito, pare** (regra 2, D002).
2. **Criar o projeto**: nome `bairrometro`, região **South America (São Paulo)**. A senha do banco vai para um gerenciador de senhas, nunca para o repositório.
3. **Autenticação** (Authentication → Sign In / Providers e URL Configuration):
   - Provedor **Email** ligado, com **Confirm email** desligado (D040: o e-mail padrão do Supabase só chega à equipe do projeto; com um servidor de e-mail próprio, ligar de novo e trocar `emailEnabled` para `true` em `site/assets/js/config.js`).
   - **Minimum password length**: 10; exigir letras e números.
   - **Site URL**: `https://cahffs.github.io/bairrometro/`.
   - **Redirect URLs**: `https://cahffs.github.io/bairrometro/**` e `http://localhost:8767/**` (desenvolvimento).
   - Sessões: deixar o token de acesso em 3600 s e a rotação de refresh token ligada (padrão).
4. **Banco**: em SQL Editor, colar e rodar `migrations/20261022000000_contas.sql`.
5. **Testes** (recomendado, num segundo projeto só para teste): colar e rodar `tests/rls_test.sql`. Todos os 14 precisam aparecer como `ok`.
6. **Ligar o site**: em Project Settings → API, copiar a **Project URL** e a chave **publishable** (ou "anon") para `site/assets/js/config.js`.

## Regras de segurança

- A chave **publishable/anon** é pública por natureza: pode ficar no site. Quem protege os dados é a RLS.
- A chave **secret/service_role** ignora a RLS. **Nunca** vai para o site, para o repositório nem para o chat.
- Toda tabela nova precisa de RLS ligada e de uma política por operação antes de ser usada.
- Mudança no esquema = novo arquivo em `migrations/` + testes atualizados.

## Limites do plano grátis

- O projeto **pausa após 7 dias sem uso** e precisa ser reativado no painel. O explorador continua funcionando; só as contas param.
- Passar da cota gera bloqueio, não cobrança.
- O servidor de e-mail padrão só envia para a equipe do projeto, com limite baixo por hora: por isso não há confirmação de cadastro nem recuperação de senha por e-mail no site (D040).
