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
D001 a D010 aprovadas, e o `CLAUDE.md` passou a v1.0. A pasta local ficou `caçacasa`; o repositório será `bairrometro`. Ver `../decisoes.md`.

## Próximo passo
Git, GitHub e regras de negócio.
