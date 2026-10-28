# 2026-10-28 — Supabase pausado, contas sem e-mail e site no ar

## O que fizemos
- **Commit:** o trabalho de 22 e 23/10 foi guardado em três commits (pipeline, site, documentação), depois de uma varredura de segredos nos arquivos.
- **Supabase pausado:** Caio recebeu um e-mail e achou que o Supabase tinha encerrado o projeto. Na verdade, o plano grátis pausou o projeto depois de uma semana sem uso.
  - O endereço da API sumiu do DNS e o painel mostrou "paused", com os dados preservados.
  - Retomamos pelo botão "Resume project", sem custo. O banco voltou em cerca de 4 minutos, e o visitante sem login continuou barrado (erro 42501).
  - Com o banco fora do ar, o Explorar funcionou normalmente. Só login, favoritos e perfis dependem do Supabase.
- **Dados reais conferidos para publicar:**
  - os 8 critérios dos 303 bairros vêm de fontes reais, sem valores faltando;
  - os limites dos bairros são aproximados, e o site avisa;
  - os preços ainda não existem, e o site diz "Preços em breve".
  - Limpezas antes de publicar:
    - o exemplo fictício saiu da pasta do site e foi para [`tests/site/`](../../tests/site/);
    - os controles que só fazem sentido com preços (alugar/comprar, economia, tipo de imóvel) ficaram escondidos em [`explorar.js`](../../site/assets/js/explorar.js).
- **Contas sem confirmação de e-mail (D040):**
  - "Confirm email" foi desligado no painel do Supabase, porque o e-mail padrão só chega à equipe do projeto;
  - a conta nasce conectada e vai para as boas-vindas;
  - a recuperação de senha por e-mail saiu do site (`emailEnabled: false` em [`config.js`](../../site/assets/js/config.js)), e o cadastro avisa para guardar a senha.
- **Publicação (D041):**
  - o `security-review` não achou vulnerabilidades;
  - a CSP passou a aceitar só o endereço do nosso projeto no Supabase;
  - Site URL e Redirect URLs foram configurados no Supabase;
  - a automação [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) publica a pasta `site/` sem os modelos de página;
  - o site está em https://cahffs.github.io/bairrometro/, com todas as requisições respondendo 200.

## Aprendizados
- **Serviço grátis tem regras de uso:** além da cota, o plano grátis do Supabase pausa projetos parados. Projetar o site para funcionar sem o banco (os dados dos bairros são arquivos estáticos) evitou que a pausa derrubasse o Explorar.
- **Degradação elegante:** quando uma parte do sistema cai, o resto continua funcionando, com uma mensagem clara ("Sem conexão com o serviço de contas").
- **Confirmação de e-mail é uma troca:** sem ela, o cadastro fica simples, mas ninguém prova que o e-mail é seu, e o cadastro passa a revelar se um e-mail já tem conta (enumeração). Riscos aceitos e registrados na D040.
- **Defesa em profundidade:** mesmo sem nenhuma falha encontrada, restringir a CSP ao endereço exato do Supabase reduz o estrago de um eventual erro futuro.
- **Publicar o mínimo:** a automação publica só o que o site precisa; os modelos de página, os dados brutos e o pipeline ficam de fora.

## Problemas e como resolvemos
- **E-mail do Supabase:** Caio queria manter o padrão "com 2 por hora", sem saber que ele só envia para a equipe. Expliquei a consequência antes de decidir; ele escolheu desligar a confirmação.
- **Avisos da automação do GitHub:** a versão do Node.js usada pelas actions está sendo descontinuada. Elas continuam funcionando; vale atualizar as versões mais adiante.

## Decisões
D040 (contas sem confirmação de e-mail) e D041 (publicar no GitHub Pages), as duas aprovadas.

## Próximo passo
Preços dos imóveis: checar, caso a caso, fontes de anúncios ou de preço por bairro em Sorocaba (`checar-fonte`), para ligar o custo-benefício e o alugar × comprar.
