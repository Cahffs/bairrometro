# Registro de decisões

Toda decisão major do projeto fica aqui. Só Caio aprova: o Claude propõe (status `proposta`) e só aplica depois de um "sim" explícito no chat. Nenhuma decisão é apagada; quando muda, vira `substituída`.

Status: `proposta` · `aprovada` · `rejeitada` · `substituída por DXXX`

| ID | Decisão | Status | Data |
|---|---|---|---|
| D001 | Regras de base do projeto | aprovada | 2026-10-20 |
| D002 | Gratuito = sem cartão de crédito | aprovada | 2026-10-20 |
| D003 | Anúncios coletados ficam só na máquina local | aprovada | 2026-10-20 |
| D004 | Contexto em três camadas | aprovada | 2026-10-20 |
| D005 | IA só com API gratuita que nunca cobre | aprovada | 2026-10-20 |
| D006 | Nome do projeto: Bairrômetro | aprovada | 2026-10-20 |
| D007 | Código em inglês, documentação em português | aprovada | 2026-10-20 |
| D008 | Plugins Data e Probabl Skills | aprovada | 2026-10-20 |
| D009 | Projeto escalável para várias cidades | aprovada | 2026-10-20 |
| D010 | Licença MIT para o código | aprovada | 2026-10-20 |

---

## D001 — Regras de base do projeto
- **Status:** aprovada em 2026-10-20, como proposta.
- **Contexto:** Caio definiu: nada fora da lei; tudo gratuito, sem API paga; código público no GitHub; posts no LinkedIn; a princípio não comercial; decisões major passam por Caio.
- **Opções:** A. as 5 regras como escritas; B. as mesmas regras, permitindo ao Claude fazer commits locais ao fim de cada sessão.
- **Decisão:** A. As 5 regras inegociáveis do `CLAUDE.md`: legalidade, gratuito, público por padrão, aprovação de decisões major, Claude não publica. O Claude não faz commit, push, deploy nem post sem pedido.
- **Consequências:** toda sessão começa com essas regras carregadas. Se uma tarefa conflitar com uma regra, o Claude para e pergunta.

## D002 — Gratuito = sem cartão de crédito
- **Status:** aprovada em 2026-10-20 (opção A)
- **Contexto:** vários serviços têm cota grátis mas exigem cartão de crédito (ex.: Google Maps Platform exige conta de faturamento). Com cartão cadastrado, um bug pode gerar cobrança.
- **Opções:**
  - A. Gratuito = sem cartão de crédito.
  - B. Aceitar cotas grátis que pedem cartão, com alerta de gasto.
- **Decisão:** A. Google Maps fica de fora; usamos OpenStreetMap, Nominatim e OpenRouteService.

## D003 — Anúncios coletados ficam só na máquina local
- **Status:** aprovada em 2026-10-20 (opção A)
- **Contexto:** textos e fotos de anúncios pertencem às imobiliárias e podem conter dados pessoais (nome e telefone de corretores). Republicá-los num repositório ou app público pode violar termos de uso, direito autoral e a LGPD.
- **Opções:** A. só local; B. público com dados factuais e link para o original, só de imobiliárias que autorizarem por escrito.
- **Decisão:** A. Anúncios coletados ficam só local (`dados/`, fora do Git). Publicamente aparecem apenas código, dados abertos e agregados (ex.: preço mediano do m² por bairro). Notebooks vão para o Git sem saídas.
- **Consequências:** o app público mostra o eixo de bairros e estatísticas agregadas; a busca de imóveis roda só no PC de Caio.

## D004 — Contexto em três camadas
- **Status:** aprovada em 2026-10-20 (opção A)
- **Opções:** A. três camadas; B. contexto também privado, só código no GitHub.
- **Decisão:** A.
  - `contexto/` — memória do projeto, versionada e pública: estado atual, decisões, fontes, diário.
  - `pessoal/` — fora do Git: orçamento, local de trabalho, critérios pessoais, rascunhos de LinkedIn.
  - Memória do Claude — local, na máquina de Caio: só o perfil e preferências de como trabalhar.
- **Consequências:** quem visitar o GitHub vê como o projeto foi construído, sem ver a vida pessoal de Caio.

## D005 — IA só com API gratuita que nunca cobre
- **Status:** aprovada em 2026-10-20
- **Contexto:** o plano usa IA para extrair atributos dos anúncios, padronizar nomes de bairro e fazer busca em linguagem natural. A maioria das APIs de LLM é paga.
- **Opções apresentadas:** A. modelo local (Ollama) + Claude Code nas sessões; B. só Claude Code; C. camada grátis de APIs.
- **Decisão de Caio:** "pode expor a uma API, mas tem que garantir que seja alguma que não seja paga em nenhum momento".
- **Regra resultante:**
  - API de IA é permitida se for gratuita e sem cartão cadastrado, para que nunca possa haver cobrança. Ao estourar a cota, o serviço deve bloquear, não cobrar.
  - Cada provedor passa pelo skill `checar-fonte` antes do uso.
  - Preferir modelo local (Ollama) quando a qualidade bastar.
  - O código acessa a IA por uma camada única, para trocar de provedor se a camada grátis acabar (D009).
  - Camadas grátis costumam permitir uso dos dados para treino: nunca enviar dados pessoais (regra 1).

## D006 — Nome do projeto: Bairrômetro
- **Status:** aprovada em 2026-10-20
- **Contexto:** o GitHub não aceita "ç" no nome do repositório, e sem a cedilha "caça" vira "caca". Caio pediu um nome em português que não fique preso a Sorocaba.
- **Opções avaliadas:** Bairrômetro, Bairrista, Onde Morar. A busca na web não achou produto com os dois primeiros (o INPI não foi consultado); "Onde Morar" é genérico e parecido com a ferramenta "Onde Viver em SP".
- **Decisão:** nome de exibição **Bairrômetro**; repositório `bairrometro`. A pasta local continua `caçacasa`, por decisão de Caio (2026-10-20).
- **Consequências:** se alguma ferramenta falhar por causa do "ç" no caminho, este é o primeiro suspeito. Se o projeto virar comercial, consultar o INPI antes.

## D007 — Código em inglês, documentação em português
- **Status:** aprovada em 2026-10-20 (opção A)
- **Decisão:** código em inglês (variáveis, funções, arquivos, tabelas); documentação, contexto e comentários em português; README com resumo em inglês.
- **Motivo:** código em inglês combina com as bibliotecas e é o padrão do mercado; documentação em português conversa com o público do LinkedIn.

## D008 — Plugins Data e Probabl Skills
- **Status:** aprovada em 2026-10-20 (instalar os dois agora)
- **Opções:** A. Data agora, Probabl na fase do modelo de preço; B. os dois agora; C. nenhum por enquanto.
- **Decisão:** B.
  - Plugin **Data** (Anthropic): explorar, validar e analisar dados. Os conectores pagos dele (BigQuery, Snowflake etc.) não serão usados (D002).
  - **Probabl Skills**: experimentos de machine learning no ecossistema scikit-learn.
  - Já disponíveis e úteis: `dataviz`, `engineering:architecture`, `engineering:documentation`, `engineering:testing-strategy`, `code-review`, `security-review`, `skill-creator`.
  - Skills do projeto: `checar-fonte`, `registrar-decisao`, `fechar-sessao`, `rascunho-linkedin`.
  - Não instalados: dataink (repete o `dataviz` e instala um hook), oryxflow (complexo para o início), quick-gate-python (dá para configurar ruff e pytest direto), plugins de LinkedIn encontrados (são de perfil e prospecção, não de posts).

## D009 — Projeto escalável para várias cidades
- **Status:** aprovada em 2026-10-20
- **Decisão de Caio:** "não vai valer SÓ pra Sorocaba no futuro, é só um MVP. Inclusive faça tudo escalável".
- **Regra resultante:** princípio de arquitetura no `CLAUDE.md`. Cidade e fontes vêm de configuração; municípios pelo código IBGE; cada fonte é um conector independente; serviços externos atrás de uma camada trocável; `fontes.md` registra a abrangência de cada fonte.
- **Consequências:** o MVP fica um pouco mais estruturado do que um script para uma cidade só, em troca de adicionar cidades sem reescrever nada.

## D010 — Licença MIT para o código
- **Status:** aprovada em 2026-10-20 (opção A)
- **Contexto:** repositório público sem licença significa "todos os direitos reservados": ninguém pode reutilizar o código legalmente.
- **Opções:** A. MIT; B. AGPL-3.0; C. sem licença.
- **Decisão:** A. Permite reuso com crédito e é comum em portfólio. Cobre só o código; os dados seguem a licença de cada fonte. Arquivo `LICENSE` na raiz.
