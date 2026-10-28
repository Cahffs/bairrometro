# Fontes de dados e serviços

Toda fonte passa pelo skill `checar-fonte` antes do primeiro uso, e só é usada com status `aprovada` (decisão de Caio).

Status: `candidata` · `aprovada` · `vetada`
Abrangência: `nacional` · `estadual` · `municipal` · `global` — mostra o que precisa ser trocado ao adicionar uma cidade (D009).

| Fonte | Uso | Abrangência | Custo | Licença / termos | Status |
|---|---|---|---|---|---|
| IBGE — Censo 2022 (bairros, setores, entorno, malhas) | População, saneamento, entorno (calçada, arborização, iluminação), limites de bairros e setores | nacional | Grátis, sem cadastro | Domínio público com citação da fonte ("IBGE"); comercialização exige autorização | aprovada (2026-10-22) |
| SSP-SP — Dados criminais (SPDadosCriminais, por ano) | Segurança | estadual (SP) | Grátis, sem cadastro | Política de Dados Abertos de SP (Decreto 68.769/2024); sem licença explícita | aprovada (2026-10-22) |
| OpenStreetMap via extrato da Geofabrik (`.osm.pbf`) | Estabelecimentos, ônibus, praças, vias movimentadas | global | Grátis, sem cadastro | ODbL: exige atribuição; base derivada publicada fica sob ODbL | aprovada (2026-10-22) |
| OpenStreetMap via Overpass API | Mesma finalidade, por consultas | global | Grátis | `robots.txt` do servidor principal proíbe `/api/` | não usar: conflito com a regra do `robots.txt` (usar o extrato da Geofabrik) |
| Nominatim (servidor público) | Geocodificação (endereço → coordenada) | global | Grátis | Política: lotes pequenos e pontuais, 1 requisição/s, cache | não usar: `robots.txt` proíbe `/search` para robôs (D038) |
| OpenRouteService | Tempo de deslocamento (isócronas) | global | Grátis com cadastro, sem cartão | Conferir termos | candidata, fora do MVP (deslocamento saiu do escopo) |
| INEP — Microdados do Censo Escolar | Escolas e creches (alternativa oficial ao OSM, D034) | nacional | Grátis, sem cadastro | Conteúdo do site gov.br em CC BY-ND 3.0; licença dos microdados não explícita | aprovada (D039, relatório aprovado em 2026-10-23): escolas localizadas com os dados do OSM |
| CNES — Estabelecimentos (Portal de Dados Abertos do SUS) | Estabelecimentos de saúde (alternativa oficial ao OSM, D034) | nacional | Grátis, sem cadastro | dados.gov.br: CC BY; rodapé do portal do SUS: CC BY-ND 3.0 (divergência) | aprovada (D037, 2026-10-22): só tipos de atendimento, sem consultórios; nome, telefone, e-mail e CNPJ nunca são lidos |
| Ollama | IA local (modelos abertos no PC) | — | Grátis, roda offline | Licença de cada modelo | candidata |
| FipeZap | Referência de preço de aluguel | nacional (~36 cidades) | Grátis (informes em PDF) | Conferir se cobre Sorocaba | candidata |
| Sites de imobiliárias de Sorocaba | Anúncios | municipal | Grátis | Termos e `robots.txt` de cada site | candidata, caso a caso |
| GitHub | Código | — | Grátis | — | aprovada (D001) |
| GitHub CLI (`gh`) | Criar repositórios e PRs pelo terminal | — | Grátis | Licença MIT | aprovada (escolha de Caio, 2026-10-20) |
| GitHub Pages | Hospedagem do site estático | — | Grátis, sem cartão (repositório público) | Uso não comercial; site de até 1 GB | aprovada (D024, 2026-10-22) |
| Supabase (plano grátis, região São Paulo) | Contas, sessão, perfis de busca e favoritos | global | Grátis; passar da cota bloqueia, não cobra; cartão: conferir no cadastro | Termos do Supabase; recebe e-mail e hash de senha de quem se cadastra (LGPD, D026) | aprovada (D026, 2026-10-22) |
| supabase-js 2.117.3 (npm, via jsDelivr) | Biblioteca de login usada pelo site | — | Grátis | MIT; guardada no repositório com a licença | aprovada (D026, 2026-10-22) |
| Streamlit Community Cloud | Hospedagem de app Python | — | Grátis | Hiberna após cerca de 12 h sem visitas | não usado (D024: site estático) |
| Fraunces (google/fonts no GitHub) | Fonte tipográfica: logo e títulos | — | Grátis | SIL OFL 1.1; guardada no repositório com a licença | aprovada (D021, 2026-10-22) |
| Source Sans 3 (google/fonts no GitHub) | Fonte tipográfica: textos e interface | — | Grátis | SIL OFL 1.1 com Reserved Font Name "Source": só comprimida, sem modificar | aprovada (D021, 2026-10-22) |
| fonttools + brotli (PyPI) | Gerar o logo e as fontes web (`identidade/tools/build.py`) | — | Grátis | MIT | aprovada (D021, 2026-10-22) |
| Google Fonts (servidor do Google) | Carregar fontes direto do Google | global | Grátis | Entrega o IP de quem visita a um terceiro | não usado: as fontes ficam no repositório (D021) |
| ZAP, VivaReal, OLX, QuintoAndar, Imovelweb | Anúncios | nacional | — | Sem API pública de consulta; termos proíbem coleta automatizada | **vetada** |
| Google Maps Platform | Lugares e rotas | global | Cota grátis, mas exige cartão | — | **vetada** (D002) |

APIs de IA na nuvem (camadas grátis) serão avaliadas pelo `checar-fonte` quando forem necessárias, seguindo a D005.

## Detalhes por fonte

_Preenchido pelo skill `checar-fonte` quando cada fonte for avaliada._

### Supabase (checagem de 2026-10-22)
- **Legal:** serviço usado como cliente, dentro dos termos; não é coleta automatizada.
- **Gratuito:** plano Free. A [página de preços](https://supabase.com/pricing) não diz se o cadastro pede cartão: conferir na hora; se pedir, parar (D002). Passar da cota gera restrição (pausa, modo só leitura, respostas HTTP 402), não cobrança ([FAQ de cobrança](https://supabase.com/docs/guides/platform/billing-faq)).
- **Limites:** 50 mil usuários ativos por mês, 500 MB de banco, 2 projetos ativos, pausa após 7 dias sem uso (reativação manual).
- **Pausa na prática (2026-10-28):** o projeto foi pausado depois de uma semana sem uso; o endereço da API some do DNS e o painel mostra "paused", com os dados preservados e retomada grátis pelo botão "Resume project" (prazo indicado: até 01/12/2027). O site continua funcionando sem contas: o Explorar usa só os dados estáticos, e o login mostra "Sem conexão com o serviço de contas". Retomado em 2026-10-28. Truques de "manter vivo" com acesso automático não são usados sem checar os termos.
- **Dados pessoais:** recebe e-mail e hash de senha de quem se cadastra (exceção D026). Região São Paulo. Política de privacidade no site.
- **Acesso:** o navegador usa só a chave pública; RLS obrigatória em toda tabela ([documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)); a chave administrativa nunca sai do painel.
- **Publicação:** nada deste banco é publicado.
- **Abrangência:** global; serve qualquer cidade.

### IBGE — Censo 2022 (checagem de 2026-10-22)
- **Legal:** o IBGE trata o conteúdo do portal como domínio público, com citação obrigatória da fonte ([comunicação do IBGE reproduzida na lista do OSM](https://lists.openstreetmap.org/pipermail/imports/2013-July/001989.html); [wiki do OSM](https://wiki.openstreetmap.org/Pt-br:Tag:source=IBGE)). Termos de algumas bases cartográficas vedam comercialização sem autorização ([BC250](https://geoftp.ibge.gov.br/cartas_e_mapas/bases_cartograficas_continuas/bc250/versao2019/informacoes_tecnicas/BC250_termo_uso_2019.pdf)): o projeto é não comercial. Não achei um texto oficial atual de termos de uso do portal.
- **`robots.txt`:** `ftp.ibge.gov.br` e `geoftp.ibge.gov.br` não têm (404); `www.ibge.gov.br` só bloqueia pastas de sistema.
- **Gratuito:** download direto, sem cadastro e sem limite declarado.
- **Dados pessoais:** não. São agregados; setores com menos de 5 domicílios têm a maioria das variáveis omitidas pelo próprio IBGE ([nota metodológica](https://biblioteca.ibge.gov.br/visualizacao/livros/liv102136.pdf)).
- **Acesso:** sem login, captcha ou anti-bot.
- **Publicação:** pode, com crédito "Fonte: IBGE, Censo Demográfico 2022".
- **Abrangência:** nacional (serve qualquer cidade). Há agregados **por bairro** e malha de bairros para os municípios com bairros oficiais.
- **Arquivos do MVP (cerca de 266 MB):** `BR_bairros_CD2022.gpkg` (53,6 MB), `SP_setores_CD2022.gpkg` (169,7 MB), agregados por bairro (básico, domicílio 1 e entorno, cerca de 5 MB) e por setor (básico 14,7 MB, domicílio 1 23,1 MB).

### OpenStreetMap (checagem de 2026-10-22)
- **Legal:** licença ODbL 1.0, atribuição "© OpenStreetMap contributors" ([copyright](https://www.openstreetmap.org/copyright)). Se publicarmos uma base derivada, ela fica sob ODbL; proposta: os dados do site derivados do OSM saem sob ODbL, com atribuição.
- **`robots.txt`:** o servidor Overpass principal (`overpass-api.de`) proíbe `/api/` para robôs, apesar de a [política de uso](https://wiki.openstreetmap.org/wiki/Overpass_API) permitir até 10 mil consultas/dia. Pela regra do projeto, **não usar a Overpass**. A Geofabrik (`download.geofabrik.de`) não tem `robots.txt` (404).
- **Gratuito:** download direto, sem cadastro. Extrato do Sudeste: `sudeste-latest.osm.pbf`, 862 MB, atualizado diariamente. Baixado uma vez, guardado em cache e recortado para a cidade no PC.
- **Dados pessoais:** estabelecimentos podem ter telefone ou nome de profissional; guardamos só categoria e coordenadas.
- **Acesso:** sem login, captcha ou anti-bot.
- **Publicação:** só agregados por bairro, com atribuição e sob ODbL.
- **Abrangência:** global (extratos por região para qualquer cidade).

### SSP-SP — Dados criminais (checagem de 2026-10-22)
- **Legal:** publicados em "Consultas - Base de Dados" ([portal](https://www.ssp.sp.gov.br/estatistica/consultas)) dentro da Política de Dados Abertos de SP ([página de dados abertos](https://www.ssp.sp.gov.br/transparencia/dados-abertos): "acesso amplo e irrestrito… ressalvadas as hipóteses legais de sigilo"). Sem licença explícita.
- **`robots.txt`:** não existe (404).
- **Gratuito:** download direto. `SPDadosCriminais_2024.xlsx` 197,6 MB e `SPDadosCriminais_2025.xlsx` 195,9 MB (estado inteiro).
- **Dados pessoais:** **não sei**. Só abrindo o arquivo dá para ver as colunas (endereço, coordenadas, dados de vítimas). Regra: qualquer campo pessoal é descartado na leitura; nada no nível de ocorrência sai do PC.
- **Acesso:** sem login, captcha ou anti-bot.
- **Publicação:** só taxas agregadas por bairro, com crédito "Fonte: SSP-SP".
- **Coordenadas:** **não sei** se os arquivos trazem latitude e longitude. Se não trouxerem, será preciso geocodificar endereços (nova fonte, nova checagem) ou agregar por delegacia.
- **Abrangência:** estadual (SP). Em outro estado, a fonte equivalente é a secretaria de segurança de lá.

### CNES — Estabelecimentos de saúde (checagem de 2026-10-22, D034)
- **Arquivo:** `cnes_estabelecimentos_csv.zip` no armazenamento oficial do Ministério da Saúde (`s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/`), 56,7 MB, atualizado todo dia (última versão: 2026-10-22). Também existe versão em JSON.
- **Legal:** o catálogo [dados.gov.br](https://legado.dados.gov.br/dataset/cadastro-nacional-de-estabelecimentos-de-saude-cnes1) lista o conjunto como Creative Commons Atribuição; o rodapé do [Portal de Dados Abertos do SUS](https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude) diz que o conteúdo do site está em CC BY-ND 3.0 (sem obras derivadas). **Não sei** qual vale para os dados; contar estabelecimentos por bairro é uma obra derivada.
- **`robots.txt`:** **não sei**. O portal `dadosabertos.saude.gov.br` corta a conexão de scripts (curl, Python e PowerShell), até para ler o `robots.txt`. Pode ser proteção anti-bot ou instabilidade; não tentamos contornar. O arquivo no S3 responde normalmente ao User-Agent do projeto.
- **Inspeção (download autorizado, 2026-10-22):** um CSV de 232 MB (latin-1, `;`, 36 colunas), SHA-256 `092b07a8…0410`. Sorocaba (`CO_IBGE` = 355220, código de 6 dígitos): 2.168 estabelecimentos, 1.924 ativos.
- **Coordenadas:** sim, `NU_LATITUDE` e `NU_LONGITUDE`, preenchidas em 95% dos estabelecimentos de Sorocaba.
- **Dados pessoais:** sim. Não há CPF, mas há `NO_FANTASIA`, `NO_RAZAO_SOCIAL`, `NU_TELEFONE` e `NO_EMAIL`. A maioria é consultório isolado de profissional autônomo (tipo 22: 1.468; 702 sem CNPJ próprio), cujo nome costuma ser o da pessoa. Regra, se aprovado: só tipos de atendimento à população, descartando nome, razão social, CNPJ, telefone e e-mail na leitura.
- **Cobertura do OSM medida com o CNES:** das 367 unidades de atendimento ativas dentro do município (UBS, postos, policlínicas, clínicas, hospitais, pronto-atendimento, CAPS), só 36% têm um ponto de saúde do OSM a até 150 m (UBS: 47%).
- **Acesso:** sem login nem captcha no arquivo.
- **Uso aprovado (D037):** tipos 1, 2, 4, 5, 7, 15, 20, 21, 36, 61, 62, 70, 71, 72 e 73 da [tabela oficial de tipos de estabelecimento](https://jundiai.sp.gov.br/saude/wp-content/uploads/sites/17/2014/09/Tabela-de-Tipos-e-Subtipos-de-Estabelecimento-SCNES.pdf), ativos. O pipeline lê só município, tipo, situação e coordenadas. Crédito: "Fonte: Ministério da Saúde, CNES".
- **Abrangência:** nacional.

### INEP — Microdados do Censo Escolar (checagem de 2026-10-22, D034)
- **Arquivo:** `microdados_censo_escolar_2024.zip` em `download.inep.gov.br/dados_abertos/`, 33,8 MB (publicado em 2026-07-08), e a página lista um dicionário de dados em xlsx ([página](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar)).
- **Legal:** o conteúdo do site gov.br está em CC BY-ND 3.0; **não sei** se isso vale para os microdados.
- **`robots.txt`:** não existe em `download.inep.gov.br` (404).
- **Técnico:** o servidor não envia o certificado intermediário. O Python com `certifi` recusa a conexão; o Windows completa a cadeia sozinho. Para o coletor, seria preciso incluir o certificado intermediário, nunca desligar a verificação.
- **Inspeção (download autorizado, 2026-10-22):** SHA-256 `ae29d81d…40db`; `microdados_ed_basica_2024.csv` com 426 colunas e dicionário em xlsx. Sorocaba: 490 escolas, 452 em atividade (183 municipais, 178 privadas, 90 estaduais, 1 federal), todas com endereço e CEP.
- **Coordenadas:** **não tem** (nenhuma coluna de latitude ou longitude). O [Catálogo de Escolas](https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas) (painel interativo) não fala em coordenadas, e não é próprio para coleta automática. Se os microdados não tiverem latitude e longitude, as escolas precisariam ser geocodificadas pelo endereço (nova fonte, nova checagem).
- **Dados pessoais:** o cadastro de escolas tem endereço e telefone da escola (dados institucionais). Os microdados de alunos e docentes são anonimizados e não seriam usados.
- **Uso aprovado (D039):** só colunas da escola (código, nome, dependência, rua, número, bairro), escolas em atividade. Sem coordenadas no arquivo: `pipeline/locate_schools.py` liga cada escola a uma escola do OSM pelo nome ou a um endereço ou rua do OSM. Crédito: "Fonte: INEP, Censo Escolar".
- **Acesso:** sem login nem captcha.
- **Abrangência:** nacional.

