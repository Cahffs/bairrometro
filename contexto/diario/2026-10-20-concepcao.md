# 2026-10-20 — Concepção e fundação

## O que fizemos
- Definimos a ideia: um auxiliar para escolher bairro e imóvel, começando por Sorocaba.
- Dividimos o projeto em dois eixos: **bairros** (dados abertos, estáveis) e **imóveis** (anúncios, voláteis).
- Levantamos fontes: os portais grandes não têm API de consulta e proíbem scraping; sites de imobiliárias locais são o caminho para anúncios; IBGE, SSP-SP e OpenStreetMap para bairros.
- Caio definiu as regras de base: nada fora da lei, tudo gratuito, código público no GitHub, posts no LinkedIn, decisões major passam por Caio, tudo escalável.
- Escolhemos o nome **Bairrômetro**, sem amarrar o projeto a uma cidade.
- Rascunhamos `CLAUDE.md`, a pasta `contexto/`, 4 skills do projeto e o `.gitignore`.
- Buscamos plugins: recomendados Data (Anthropic) e Probabl Skills.

## Aprendizados
- Comece pelo dado mais fácil: os dados de bairro são abertos e estáveis e já entregam um dashboard útil, sem depender de scraper.
- "Locais mais buscados" não existe como dado aberto. Dá para estimar pelo tempo que um anúncio leva para sumir, desde que a coleta guarde fotos diárias (snapshots).
- Crime em número absoluto engana: bairro grande sempre parece perigoso. Usar taxa por habitante.
- Preço anunciado não é preço fechado: é um viés do dado, não um erro.
- "Grátis" com cartão cadastrado não é grátis de verdade: um bug pode virar cobrança. Por isso a regra é sem cartão.
- Para escalar, registre a abrangência de cada fonte: IBGE e OpenStreetMap valem para o país todo; a SSP-SP só para São Paulo.

## Decisões
D001 a D011 aprovadas, e o `CLAUDE.md` passou a v1.0. A pasta local ficou `caçacasa`; o repositório é `bairrometro`. O registro detalhado das decisões passou a ser privado (D011); as regras resultantes estão no `CLAUDE.md`.

## Git e GitHub
- Criamos o `README.md` (com resumo em inglês) e o `.gitattributes`.
- Instalamos o GitHub CLI (`gh`) via winget e Caio fez o login.
- Commits usam o e-mail noreply do GitHub, configurado só neste projeto, para não expor o e-mail pessoal no histórico público.
- LICENSE em nome de Caio Assaoka, igual ao nome do Git.
- Primeiro commit (`90bb537`) enviado para https://github.com/Cahffs/bairrometro, público, licença MIT reconhecida pelo GitHub.

## Problemas e como resolvemos
- **Login do `gh` cancelado:** no PowerShell, Ctrl+C não copia, cancela o comando. O código do login já vai sozinho para a área de transferência; basta apertar Enter e colar no navegador.
- **Botão verde do GitHub travado:** proteção contra clickjacking; ele libera depois de alguns segundos. No nosso caso travou porque o login no terminal tinha sido cancelado.
- **`security-review` não roda no primeiro envio:** ele compara com a versão no GitHub (`origin/HEAD`), que ainda não existia. Fizemos a mesma checagem à mão (e-mails, chaves, caminhos locais, telefones, pastas protegidas). Nos próximos envios o skill funciona normalmente.

## Plugins
- O card de instalação não apareceu no app; instalamos pela linha de comando do Claude Code (`claude plugin`), no escopo do projeto.
- Cuidado com nomes iguais: o `data` do catálogo oficial padrão é da Astronomer (Airflow), não o Data da Anthropic. Sempre conferir a origem antes de instalar.
- O plugin Data traz 8 conectores de serviços pagos (Snowflake, BigQuery etc.). Ficam desligados; não vamos conectar nenhum (D002).
- Achado para depois: o catálogo oficial tem `duckdb-skills`, da própria DuckDB. Candidato quando decidirmos a stack.

## Próximo passo
Regras de negócio.
