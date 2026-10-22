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

## Regras de negócio (início)
- O Bairrômetro passa a ser uma ferramenta para vários perfis de busca, não só para um caso.
- Tempo de deslocamento até o trabalho saiu do MVP; a escolha se apoia em acesso próximo, custo-benefício, orçamento e condições do negócio.
- Rascunho v0.1 em [`regras-de-negocio.md`](../regras-de-negocio.md): filtros, nota do bairro com 9 critérios, nota do imóvel, comparação alugar × comprar.

### Aprendizados
- **Análise de decisão multicritério:** filtros eliminam, pesos ordenam. Cada indicador precisa ir para a mesma escala antes de ser somado.
- **Dado ausente não deve eliminar:** anúncio mal preenchido não é imóvel ruim. Melhor passar com aviso.
- **Viés escondido em critério:** usar renda como "melhor" premia bairros ricos e duplica o critério de custo.
- **Subnotificação:** dado de ocorrência mostra o que foi registrado, não a criminalidade real.
- **Razão preço/aluguel:** preço de venda ÷ aluguel anual. Quanto maior, mais caro comprar em relação a alugar.
- **A lei vira regra de negócio:** a Lei do Inquilinato permite só uma garantia por contrato, então o filtro é "aceita pelo menos uma das que a pessoa pode oferecer".
- **Custo-benefício sem premiar riqueza:** separar qualidade de preço e perguntar "quanto um bairro com essa qualidade costuma custar aqui?" (regressão). O que importa é o resíduo: quanto o bairro custa abaixo ou acima do esperado. A fronteira de eficiência (Pareto) mostra isso num gráfico.
- **Percentil como escala comum:** transforma indicadores de unidades diferentes (contagem, área, taxa) em "melhor que X% dos bairros da cidade".
- **Média ponderada pela população:** ao juntar setores censitários num bairro, o setor com mais moradores pesa mais.

## Regras de negócio fechadas e material de estudo
- Mínimo de 5 anúncios por bairro aprovado; regras de negócio v1.0, fechadas para o MVP.
- Criamos `estudos/index.html`: guia interativo, separado do sistema, com 13 seções (média e mediana, percentil, taxas, agregação espacial, distância, multicritério, regressão, Pareto, amostras pequenas, dados ausentes, preço/aluguel, vieses, stack), demonstrações, glossário e referências. Roda em localhost com `python -m http.server`.
- Stack proposta, aguardando aprovação.

### Aprendizados
- **Simulação ensina mais que fórmula:** sortear anúncios mil vezes mostra o efeito do tamanho da amostra sem precisar de demonstração matemática.
- **Ser honesto com o número escolhido:** a simulação mostrou que de 5 para 10 anúncios o erro ainda cai bastante. O 5 é um compromisso de cobertura, não um ótimo estatístico, e o guia diz isso.
- **Conferir o visual de verdade:** capturas do navegador em segundo plano saíram em branco; o diagnóstico (página de controle também em branco) mostrou que era o ambiente, não a página.

## Próximo passo
Aprovar a stack e começar o ambiente.
