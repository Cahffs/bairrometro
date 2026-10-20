# Bairrômetro — instruções para o Claude

> **v1.0 — aprovada por Caio em 2026-10-20** (D001–D010 em `contexto/decisoes.md`). Mudanças nestas regras só pelo skill `registrar-decisao`.

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
- `contexto/decisoes.md` — registro de decisões (propostas, aprovadas, rejeitadas).
- `contexto/fontes.md` — toda fonte de dados e serviço, com abrangência, licença, custo e status.
- `contexto/diario/` — um arquivo por sessão: o que foi feito e o que foi aprendido.

`pessoal/` (fora do Git) guarda critérios pessoais e rascunhos de LinkedIn.

Ao fim de cada sessão de trabalho: skill `fechar-sessao`.

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

## Stack
A definir. Proposta inicial: Python, DuckDB, Streamlit; dados de IBGE, SSP-SP e OpenStreetMap.
