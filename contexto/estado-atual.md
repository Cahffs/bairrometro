# Estado atual

_Atualizado em 2026-10-28_

## Fase
**4 — No ar, sem preços**: o site está publicado em https://cahffs.github.io/bairrometro/ com os 303 bairros de Sorocaba e dados reais (IBGE, OpenStreetMap, SSP-SP, CNES, INEP). A nota usa só a qualidade; preços de aluguel e venda ainda não existem.

## O que existe
- Fundação: `CLAUDE.md` v1.0, skills, plugins, repositório público https://github.com/Cahffs/bairrometro (Dependabot e bloqueio de segredos ativos).
- Registro de decisões privado em `pessoal/decisoes.md` (D001–D041), sem propostas pendentes.
- Identidade visual (`identidade/`), regras de negócio v1.2, guia de estudos (`estudos/`, 14 seções).
- **Pipeline** (`pipeline/`, `config/`, D030–D039), rodada completa em cerca de 3,5 minutos, 20 testes:
  - bairros: setores do IBGE com o nome do lugar mais próximo do OSM; os com menos de 1.000 moradores são juntados ao vizinho (303 bairros, mediana de 2.053 moradores);
  - Segurança: ocorrências da SSP-SP por ano a até 500 m de casa, só crimes contra a pessoa e o patrimônio com local;
  - Saúde: 388 unidades de atendimento do CNES;
  - Educação: 405 das 452 escolas do INEP, localizadas por ligação de registros com o OSM;
  - recorte do OSM em cache (`dados/cache/osm/`).
- **Site** (`site/`), publicado pelo GitHub Pages a cada envio para a `main` que mexa em `site/` (`.github/workflows/pages.yml`):
  - Explorar com atalhos, prioridades, cartões, busca e favoritos;
  - controles de preço escondidos enquanto não houver anúncios;
  - boas-vindas em 4 passos, Minha conta, Como calculamos e Privacidade;
  - CSP restrita ao próprio site e ao projeto do Supabase;
  - em desenvolvimento: http://localhost:8767 (`tools/serve.py`, sem cache).
- **Contas** (Supabase, São Paulo, plano grátis):
  - RLS em todas as tabelas, visitante sem login barrado;
  - sem confirmação de e-mail nem recuperação de senha por e-mail (D040);
  - o plano grátis pausa o projeto após uma semana sem uso: reativar no painel ("Resume project"). O Explorar funciona mesmo com o banco pausado.

## Aguardando Caio
- Testar o cadastro no site publicado (criar conta → boas-vindas → explorar).

## Próximos passos
1. **Preços dos imóveis:** `checar-fonte` em fontes de anúncios ou de preço por bairro em Sorocaba, caso a caso. Com preços, ligar o custo-benefício, o alugar × comprar e o gráfico qualidade × preço.
2. Atualizar as versões das actions do GitHub (aviso de descontinuação do Node.js 20).
3. Opcional: guardar em cache as ocorrências da SSP já filtradas (a etapa mais lenta, cerca de 2 minutos).
4. Opcional: servidor de e-mail próprio, para ligar a confirmação de cadastro e a recuperação de senha.
