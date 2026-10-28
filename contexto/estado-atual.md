# Estado atual

_Atualizado em 2026-10-28_

## Fase
**3 — Dados reais**: o site já mostra os 303 bairros de Sorocaba com dados reais (IBGE, OpenStreetMap, SSP-SP, CNES, INEP). Ainda não há preços: a nota usa só a qualidade. As contas estão ligadas ao Supabase e testadas por Caio (login e favoritos funcionando).

## O que existe
- Fundação: `CLAUDE.md` v1.0, skills, plugins, repositório público https://github.com/Cahffs/bairrometro (Dependabot e bloqueio de segredos ativos).
- Registro de decisões privado em `pessoal/decisoes.md` (D001–D039).
- Identidade visual (`identidade/`), regras de negócio v1.2, material de estudo (`estudos/`).
- **Pipeline** (`pipeline/`, `config/`, D030–D039):
  - `download.py` baixa a camada bruta com cache e manifesto;
  - `build_city.py` gera `site/data/sorocaba.json`: 1.148 setores e 723.682 moradores (bate com o Censo); bairro de cada setor pelo lugar mais próximo do OSM; bairros com menos de 1.000 moradores juntados ao vizinho (514 → 303, mediana 2.053 moradores);
  - Segurança: ocorrências por ano a até 500 m de casa, só crimes contra a pessoa e o patrimônio com local (lista em `config/fontes.toml`);
  - Saúde: 388 unidades de atendimento do CNES (sem consultórios isolados; nome, telefone, e-mail e CNPJ nunca são lidos);
  - Educação: 405 das 452 escolas em atividade do INEP, localizadas pelo nome, endereço ou rua do OSM (`locate_schools.py`, D039);
  - recorte do OSM em cache (`osm_extract.py`): uma rodada completa leva cerca de 3,5 minutos (antes, cerca de 13);
  - 20 testes em `tests/pipeline/`.
- **Site** em `site/` (http://localhost:8767, sem cache via `tools/serve.py`), com interface no padrão de mercado:
  - **Explorar:**
    - barra de filtros no topo: Alugar/Comprar, atalhos "Com filhos", "Com pet" e "Sem carro", e o botão "Ajustar prioridades", que abre uma janela com os pesos;
    - lista de bairros em cartões, com busca, ordenação e coração para favoritar;
    - detalhe com pontos fortes e pontos de atenção.
  - **Boas-vindas** (`bem-vindo.html`): depois de confirmar o e-mail, um assistente em 4 passos monta o primeiro perfil de busca e leva ao Explorar.
  - **Minha conta:** painel com perfis, favoritos, sessão, download dos dados e exclusão da conta.
  - **Tema:** claro e escuro, com ícones de sol e lua.
- **Supabase** (projeto `bairrometro`, São Paulo, plano Free): migração aplicada, 14 testes de RLS passando, visitante sem login barrado. O plano grátis pausa o projeto após uma semana sem uso; foi pausado e retomado em 2026-10-28 (dados preservados).

## Aguardando Caio
- **Envio ao GitHub e publicação:** os três commits de 2026-10-28 estão só no PC; `security-review` antes de qualquer envio.
- **Contas para o público:** o e-mail padrão do Supabase só envia para a equipe do projeto (e no máximo 2 por hora); decidir como as contas aparecem no site publicado.

## Próximos passos
1. Decidir as contas para o público e publicar no GitHub Pages (com `security-review` antes do envio).
2. Anúncios de imobiliárias (preço do m²): checagem caso a caso.
3. Opcional: guardar em cache as ocorrências da SSP já filtradas (hoje é a etapa mais lenta, cerca de 2 minutos).
