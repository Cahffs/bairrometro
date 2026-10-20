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
| OpenRouteService | Tempo de deslocamento (isócronas) | global | Grátis com cadastro, sem cartão | Conferir termos | candidata |
| Ollama | IA local (modelos abertos no PC) | — | Grátis, roda offline | Licença de cada modelo | candidata |
| FipeZap | Referência de preço de aluguel | nacional (~36 cidades) | Grátis (informes em PDF) | Conferir se cobre Sorocaba | candidata |
| Sites de imobiliárias de Sorocaba | Anúncios | municipal | Grátis | Termos e `robots.txt` de cada site | candidata, caso a caso |
| GitHub | Código | — | Grátis | — | candidata |
| Streamlit Community Cloud | Hospedagem do app | — | Grátis | — | candidata |
| ZAP, VivaReal, OLX, QuintoAndar, Imovelweb | Anúncios | nacional | — | Sem API pública de consulta; termos proíbem coleta automatizada | **vetada** |
| Google Maps Platform | Lugares e rotas | global | Cota grátis, mas exige cartão | — | **vetada** (D002) |

APIs de IA na nuvem (camadas grátis) serão avaliadas pelo `checar-fonte` quando forem necessárias, seguindo a D005.

## Detalhes por fonte

_Preenchido pelo skill `checar-fonte` quando cada fonte for avaliada._
