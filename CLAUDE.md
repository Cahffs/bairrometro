# Bairrômetro — instruções para o Claude

> **v1.0 — aprovada por Caio em 2026-10-20.** Este arquivo é a versão pública das decisões do projeto; o registro completo (D001…) é privado, em `pessoal/decisoes.md`. Mudanças nestas regras só pelo skill `registrar-decisao`.

## O projeto

Auxiliar para escolher bairro e imóvel em cidades brasileiras usando ciência de dados e IA. **MVP: Sorocaba-SP.**
Objetivos, em ordem:

1. **Aprender** ciência e análise de dados com IA. O processo importa tanto quanto o resultado.
2. **Resolver um problema real**: decidir onde morar.
3. **Portfólio público**: código no GitHub e posts no LinkedIn. Não comercial por enquanto; virar comercial é decisão major e exige revisar todas as fontes.

## Regras inegociáveis

Valem acima de qualquer tarefa. Na dúvida, pare e pergunte.

### 1. Nada fora da lei
- Respeitar termos de uso, `robots.txt` e licença de cada fonte. Fonte que proíbe coleta automatizada não é usada.
- Nunca contornar captcha, login, paywall, bloqueio de IP ou proteção anti-bot.
- Coleta educada: intervalo entre requisições, User-Agent que identifica o projeto, cache para não repetir downloads.
- LGPD: não coletar nem guardar dados pessoais (nome, telefone, e-mail, CRECI de corretores ou proprietários, fotos de pessoas). Nunca enviar dados pessoais a serviços externos, IA incluída.
- **Única exceção (D026): contas do site.** Quem se cadastra informa e-mail e senha; a senha fica só como hash. Esses dados, os perfis de busca e os bairros favoritos ficam no Supabase (região São Paulo), protegidos por RLS, com consentimento no cadastro, política de privacidade e exclusão da conta pelo próprio usuário. Nunca pedir nome, CPF, telefone, endereço, renda nem dados sensíveis; orçamento e moradores ficam só no navegador.
- Anúncios coletados ficam **só na máquina local**. Publicamente aparecem apenas código, dados abertos e agregados.
- Creditar as fontes conforme a licença (ex.: "© OpenStreetMap contributors", IBGE, SSP-SP).

### 2. Tudo gratuito, sem chance de cobrança
- Só ferramentas, dados, APIs e hospedagem gratuitos que **não exijam cartão de crédito**. Google Maps Platform está fora (exige conta de faturamento).
- APIs de IA: permitidas só se gratuitas e sem cartão. Ao estourar a cota, o serviço precisa bloquear, nunca cobrar. Preferir modelo local (Ollama) quando a qualidade bastar.
- Toda fonte ou serviço novo passa pelo skill `checar-fonte` e entra em `contexto/fontes.md`.

### 3. Público por padrão
O repositório é público. Nunca vai para o Git:
- segredos e chaves (`.env`);
- dados coletados, brutos ou processados (`dados/`);
- informações pessoais de Caio (orçamento, endereço, local de trabalho), que ficam em `pessoal/`;
- saídas de notebooks (limpar antes do commit).

Antes de qualquer push: rodar `security-review` e conferir o `git status`.

### 4. Decisões major passam por Caio
São major: mudar estas regras, adicionar fonte de dados, adicionar serviço externo ou dependência pesada, mudar a stack, publicar qualquer coisa.

Fluxo: o Claude **propõe** → registra como `proposta` (skill `registrar-decisao`) → só aplica depois de um "sim" explícito de Caio no chat.
Decisões pequenas (nomes, estrutura de uma função, formato de um gráfico) o Claude toma sozinho e explica.

### 5. O Claude não publica
- Nada de `git push`, deploy ou post sem pedido explícito.
- Posts de LinkedIn são rascunhos (skill `rascunho-linkedin`); quem posta é Caio.

## Princípio de arquitetura: escalável desde o início

Sorocaba é só o MVP; o projeto precisa servir a qualquer cidade.
- Nada fixo no código para uma cidade: cidade, bairros e fontes vêm de configuração.
- Municípios identificados pelo código IBGE; dados organizados por cidade.
- Cada fonte é um conector independente com a mesma interface. Adicionar uma fonte (ex.: a secretaria de segurança de outro estado) não mexe no resto.
- Serviços externos (IA, geocodificação, rotas) ficam atrás de uma camada própria, para trocar de provedor sem reescrever o projeto.
- `contexto/fontes.md` registra a abrangência de cada fonte: nacional, estadual ou municipal.

## Convenções
- Código em inglês: nomes de variáveis, funções, arquivos e tabelas.
- Documentação, contexto e comentários em português. README com resumo em inglês.

## Contexto do projeto

`contexto/` é a memória versionada do projeto. É pública: nada pessoal ali.

- `contexto/estado-atual.md` — **ler no início de toda sessão.** Fase atual, o que funciona, próximos passos.
- `contexto/regras-de-negocio.md` — o que o Bairrômetro avalia e como: perfis, filtros, critérios, notas.
- `contexto/fontes.md` — toda fonte de dados e serviço, com abrangência, licença, custo e status.
- `contexto/diario/` — um arquivo por sessão: o que foi feito e o que foi aprendido.

`pessoal/` (fora do Git) guarda o registro de decisões (`pessoal/decisoes.md`, D011), critérios pessoais e rascunhos de LinkedIn. Não tem backup pelo Git: é cópia única no PC de Caio.

Ao fim de cada sessão de trabalho: skill `fechar-sessao`.

## Material de estudo (`estudos/`)

Guia interativo em HTML (`estudos/index.html`) para Caio estudar, com o porquê de cada escolha e as referências científicas. Escopo (D023): **só** as contas e fórmulas usadas nas notas e métricas, e os pipelines de busca e tratamento de dados, incluindo as APIs. Design, cores e identidade visual não entram aqui (ficam em `identidade/`).

- **Separado do sistema de busca:** o código do Bairrômetro nunca importa nem depende de nada em `estudos/`. Exemplos com bairros e números fictícios.
- **Roda em localhost:** `python -m http.server 8765 --bind 127.0.0.1 --directory estudos` e abrir http://localhost:8765. No app, a configuração `estudos` do `.claude/launch.json` faz o mesmo.
- **Manter atualizado:** quando entrar no projeto uma conta ou fórmula nova (estatística, métrica, ML), quando uma regra de negócio mudar uma conta, ou quando um pipeline de coleta e tratamento de dados ou uma API nova for montado, atualizar a seção correspondente do guia, com referência.

## Identidade visual (`identidade/`)

Direção Telhado (D021): o acento do ô vira o telhado de uma casa. Guia em `identidade/index.html`, em http://localhost:8766 (configuração `identidade` do `.claude/launch.json`).

- **Fonte única da verdade:** `identidade/tokens.json`. `tokens.css` e `logo/*.svg` são gerados por `python identidade/tools/build.py tokens|logo`; nunca editar à mão.
- **Cor de marca não é cor de dado:** a terracota só marca o bairro em destaque nos gráficos; nunca significa "ruim" ou "caro".
- **Faixas de nota (D022):** toda nota de 0 a 100 usa a cor da sua faixa (0–49, 50–79, 80–100), com o rótulo sempre junto.
- **Cor nova em gráfico** passa pelo validador de paletas do skill `dataviz` (daltonismo e contraste), nos modos claro e escuro.
- **Fontes no repositório** (Fraunces e Source Sans 3, SIL OFL), nunca carregadas do Google Fonts.

## Skills do projeto (`.claude/skills/`)

| Skill | Quando usar |
|---|---|
| `checar-fonte` | Antes de usar qualquer fonte de dados, site, API ou serviço novo |
| `registrar-decisao` | Ao propor uma decisão major ou registrar a resposta de Caio |
| `fechar-sessao` | Ao fim de cada sessão: atualiza estado, diário e pendências |
| `rascunho-linkedin` | Quando Caio pedir um post sobre o progresso |

Plugins do projeto (D008): **Data** (explorar, validar e analisar dados; os conectores pagos dele não são usados) e **Probabl Skills** (machine learning com scikit-learn). Também úteis: `dataviz`, `security-review`, `skill-creator`.

## Como trabalhar com Caio
- Responder em português do Brasil.
- Caio está aprendendo: explicar o porquê das escolhas, nomear o conceito de dados por trás de cada passo, preferir código simples e legível a código esperto.
- Mostrar resultados intermediários (tabelas, gráficos), não só dizer que funcionou.

## Stack (D019, D024)

- **Dados, só no PC de Caio:** Python 3.13 com uv; pandas; DuckDB + Parquet; GeoPandas, Shapely e OSMnx (medir distâncias em SIRGAS 2000 / UTM 23S); httpx + BeautifulSoup; statsmodels + SciPy; scikit-learn (+ skore); pandera; JupyterLab + nbstripout; ruff + pytest. Ollama mais tarde (D005).
- **Site:** estático (HTML, CSS com os tokens de `identidade/`, JavaScript sem framework, gráficos em SVG), hospedado no GitHub Pages. O Python gera arquivos de dados prontos, só abertos e agregados (D003), e o site os lê.
- **Código do site (`site/`):** páginas em `site/_pages/`, partes comuns (cabeçalho, rodapé, `<head>` com a CSP) em `site/_partials/`; `python tools/build_site.py` monta as páginas e copia a identidade (os `site/*.html` são gerados, não editar). Cálculo das notas em `site/assets/js/scoring.js`, testado com `node --test tests/site/scoring.test.mjs`. O site lê `site/data/sorocaba.json` (dados reais); `tools/gen_sample_data.py` gera um exemplo fictício só para testes, em `tests/site/` (fora do site publicado). Localhost: configuração `site` do `.claude/launch.json` (porta 8767), servida por `tools/serve.py`, que desliga o cache do navegador. Fluxo de conta: cadastro → confirmação por e-mail → `bem-vindo.html` (perfil em 4 passos) → explorar.
- **Pipeline de dados (`pipeline/`, `config/`):** cada cidade é um arquivo em `config/cidades/`; as fontes aprovadas e seus arquivos ficam em `config/fontes.toml`. `python pipeline/download.py <cidade>` baixa a camada bruta para `dados/bruto/<fonte>/` (fora do Git), com cache e um manifesto com URL, data e SHA-256 de cada arquivo. `uv run python pipeline/build_city.py <cidade>` trata os dados (setores do IBGE, nomes de bairro do OSM, pontos de interesse, ocorrências da SSP) e gera `site/data/<cidade>.json`; `pipeline/locate_schools.py` localiza as escolas do INEP com os dados do OSM (ligação de registros, D039) e roda dentro do `build_city.py`; o OpenStreetMap é lido de um recorte da cidade guardado em `dados/cache/osm/` (`pipeline/osm_extract.py`), refeito quando o extrato muda; testes em `tests/pipeline/` (`uv run pytest`).
- **Contas (D026):** Supabase, plano grátis, região São Paulo; biblioteca `supabase-js` guardada em `site/assets/js/vendor/`. Esquema e políticas em `supabase/migrations/`; testes de acesso em `supabase/tests/`. Toda tabela com RLS, negação por padrão e uma política por operação. A chave administrativa (`service_role`) nunca entra no site nem no repositório.
- **Contas sem e-mail (D040) e publicação (D041):** o e-mail padrão do Supabase só envia para a equipe do projeto, então não há confirmação de cadastro nem recuperação de senha por e-mail (`emailEnabled: false` em `site/assets/js/config.js`). O plano grátis pausa o projeto após uma semana sem uso: reativar no painel. O site é publicado em https://cahffs.github.io/bairrometro/ pela automação `.github/workflows/pages.yml` a cada envio para a `main` que mexa em `site/`.
- **Segurança:** coleta e banco completo nunca ficam online. Consultas sempre parametrizadas; DuckDB em modo só leitura e sem acesso a arquivos externos onde entrar texto de fora; a IA nunca escreve SQL, só filtros validados. No site, texto vindo de fora nunca vai para `innerHTML`.
