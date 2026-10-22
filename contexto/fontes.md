# Fontes de dados e serviços

Toda fonte passa pelo skill `checar-fonte` antes do primeiro uso, e só é usada com status `aprovada` (decisão de Caio).

Status: `candidata` · `aprovada` · `vetada`
Abrangência: `nacional` · `estadual` · `municipal` · `global` — mostra o que precisa ser trocado ao adicionar uma cidade (D009).

| Fonte | Uso | Abrangência | Custo | Licença / termos | Status |
|---|---|---|---|---|---|
| IBGE — Censo 2022 (setores censitários e malha) | População, renda, limites de área | nacional | Grátis, sem cadastro | Dados públicos | candidata |
| SSP-SP — estatísticas mensais e microdados de BOs | Segurança | estadual (SP) | Grátis | Dados públicos | candidata |
| OpenStreetMap via Overpass API | Estabelecimentos (escolas, mercados, farmácias...) | global | Grátis | ODbL — exige atribuição | candidata |
| Nominatim | Geocodificação (endereço → coordenada) | global | Grátis | Política de uso: no máx. 1 requisição/s, sem uso massivo | candidata |
| OpenRouteService | Tempo de deslocamento (isócronas) | global | Grátis com cadastro, sem cartão | Conferir termos | candidata, fora do MVP (deslocamento saiu do escopo) |
| INEP — Censo Escolar / catálogo de escolas | Escolas e creches (alternativa oficial ao OSM) | nacional | Grátis | Dados públicos; conferir se traz coordenadas | candidata |
| CNES (DataSUS) | Estabelecimentos de saúde (alternativa oficial ao OSM) | nacional | Grátis | Dados públicos; conferir se traz coordenadas | candidata |
| Ollama | IA local (modelos abertos no PC) | — | Grátis, roda offline | Licença de cada modelo | candidata |
| FipeZap | Referência de preço de aluguel | nacional (~36 cidades) | Grátis (informes em PDF) | Conferir se cobre Sorocaba | candidata |
| Sites de imobiliárias de Sorocaba | Anúncios | municipal | Grátis | Termos e `robots.txt` de cada site | candidata, caso a caso |
| GitHub | Código | — | Grátis | — | aprovada (D001) |
| GitHub CLI (`gh`) | Criar repositórios e PRs pelo terminal | — | Grátis | Licença MIT | aprovada (escolha de Caio, 2026-10-20) |
| GitHub Pages | Hospedagem do site estático | — | Grátis, sem cartão (repositório público) | Uso não comercial; site de até 1 GB | aprovada (D024, 2026-10-22) |
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
