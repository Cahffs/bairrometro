# Regras de negócio

> **v1.2 — 2026-10-22** (v1.0 fechada para o MVP em 2026-10-20; a v1.1 acrescenta as faixas de nota da seção 4.7; a v1.2 muda a medida de segurança, as fontes de saúde e educação e junta bairros pequenos, seções 4.1 e 4.2). Documento vivo: define o que o Bairrômetro avalia e como. É público e genérico; os valores de cada pessoa ficam no perfil dela, nunca aqui.

## 1. Visão

O Bairrômetro ajuda qualquer pessoa a escolher bairro e imóvel numa cidade brasileira. Cada pessoa descreve o que procura num **perfil de busca**; a ferramenta filtra, pontua e explica o resultado. MVP: Sorocaba-SP.

A lógica tem três camadas (análise de decisão multicritério):

1. **Filtros** — o imóvel passa ou sai.
2. **Nota do bairro** — qualidade e custo-benefício, medidos separadamente e depois combinados.
3. **Nota do imóvel** — custo-benefício, acesso próximo e condições do negócio.

## 2. Perfil de busca

Tudo é configurável; o código não assume nenhum perfil.

| Campo | Valores | Uso |
|---|---|---|
| Negócio | aluguel · compra · comparar os dois | Define quais preços e condições valem |
| Tipos de imóvel | casa de rua · casa em condomínio · apartamento (um ou mais) | Filtro |
| Moradores | filhos (sim/não) · pet (sim/não) | Filtros (ex.: aceita pet) e pontos de partida de pesos |
| Carro | sim/não | Ponto de partida de pesos |
| Orçamento | aluguel: custo mensal máximo · compra: preço máximo | Filtro |
| Mínimos do imóvel | quartos, banheiros, vagas, área | Filtro |
| Garantias que a pessoa pode oferecer (aluguel) | caução · fiador · seguro-fiança · título de capitalização · outras | Filtro |
| Condições de compra desejadas | financiamento · FGTS · permuta · condição à vista | Filtro |
| Pesos dos critérios | 0 a 5 por critério (0 = ignorar) | Nota de qualidade |
| Ênfase em economia | 0 a 1 (padrão 0,5) | Equilíbrio entre qualidade e custo-benefício |

**Sobre garantias de aluguel:** a Lei do Inquilinato (Lei 8.245/91, art. 37) prevê caução, fiança, seguro de fiança locatícia e cessão fiduciária de cotas de fundo de investimento, e proíbe exigir mais de uma modalidade no mesmo contrato. Um anúncio pode aceitar várias; o imóvel passa no filtro se aceitar pelo menos uma que a pessoa pode oferecer. "Sem fiador" em anúncio costuma significar que aceita alguma alternativa ao fiador; o texto precisa dizer qual.

## 3. Camada 1 — Filtros

- **Tipo** está entre os tipos do perfil.
- **Custo** dentro do orçamento:
  - aluguel: aluguel + condomínio + IPTU mensal ≤ máximo;
  - compra: preço ≤ máximo.
- **Mínimos** do imóvel atendidos.
- **Pet:** se o perfil tem pet, o anúncio não pode dizer que não aceita.
- **Garantias** (aluguel): pelo menos uma aceita pelo anúncio está entre as do perfil.
- **Condições de compra:** o anúncio aceita as condições exigidas pelo perfil.

**Regra geral: dado ausente não elimina, vira aviso.** Se o anúncio não informa condomínio, garantias ou se aceita pet, o imóvel passa com um alerta ("custo incompleto", "garantias não informadas"). Eliminar por falta de informação descartaria bons imóveis com anúncios mal preenchidos.

## 4. Camada 2 — Nota do bairro

### 4.1 Unidade espacial

- **Base:** setores censitários do IBGE (Censo 2022), que existem no país todo.
- **Bairro:** a divisão de bairros publicada pelo IBGE, quando existir para a cidade (confirmar com o skill `checar-fonte`). Sem ela, cada setor recebe o nome do bairro mais próximo no OpenStreetMap.
- **Bairros pequenos:** bairro com menos de 1.000 moradores é juntado ao vizinho com quem divide a maior fronteira, repetindo até não sobrar nenhum. Os nomes absorvidos continuam na busca e os favoritos antigos são redirecionados. O mínimo fica na configuração de cada cidade.
- Indicadores são calculados por setor e agregados por bairro, com média ponderada pela população de cada setor.

### 4.2 Critérios de qualidade

"Por perto" = **raio de 1 km em linha reta** (cerca de 12 a 15 minutos a pé), a partir do centro de cada setor ou da localização do imóvel. Sem serviço de rotas.

| Critério | Indicador (proposta) | Melhor quando | Fonte | Abrangência |
|---|---|---|---|---|
| Dia a dia | Mercados, farmácias e padarias por perto | mais | OpenStreetMap | global |
| Educação | Escolas e creches em atividade por perto (Censo Escolar), localizadas com o OpenStreetMap | mais | INEP + OpenStreetMap | nacional |
| Saúde | Unidades de atendimento por perto: UBS e postos, policlínicas, clínicas especializadas, hospitais, pronto-atendimento, CAPS (sem consultórios isolados) | mais | CNES (Ministério da Saúde) | nacional |
| Mobilidade | Pontos de ônibus por perto; distância a avenidas principais | mais / menor | OpenStreetMap | global |
| Segurança | Ocorrências registradas por ano a até 500 m de casa (furtos, roubos, agressões, homicídios) | menos | SSP-SP | estadual |
| Lazer e verde | Área de parques e praças por perto; academias ao ar livre | mais | OpenStreetMap | global |
| Infraestrutura | Saneamento (água, esgoto, coleta de lixo) | mais | IBGE Censo 2022 | nacional |
| Sossego | Distância de vias de tráfego intenso e de bares/casas noturnas | maior | OpenStreetMap | global |

**Renda fica fora da nota.** Aparece só como informação. Usar renda como "melhor" premiaria bairros só por serem ricos.

**Segurança:** boletins de ocorrência têm subnotificação, que varia entre bairros. A nota mostra o que foi registrado, não a criminalidade real.
- **Perto de casa, não por morador:** conta as ocorrências a até 500 m do centro de cada setor e faz a média ponderada pelos moradores. A taxa por mil moradores foi descartada: ela explode onde mora pouca gente e circula muita (áreas comerciais e industriais), porque morador não mede quem passa pelo lugar.
- **O que conta:** crimes contra a pessoa e o patrimônio. Ficam de fora acidentes de trânsito (já pesam em Sossego) e entorpecentes e porte de arma (medem mais a atividade da polícia). A lista de naturezas fica na configuração da fonte de cada estado.
- **Sem local, fora da conta:** a SSP não publica o local de crimes sexuais e de parte da violência doméstica, para proteger a vítima. Essas ocorrências não são localizadas de outro jeito, e o site avisa que ficam de fora.

### 4.3 Escala

Cada indicador vira um **percentil dentro da cidade**: 0 = pior bairro da cidade naquele critério, 100 = melhor. Os valores brutos ficam guardados, para comparar cidades no futuro.

### 4.4 Qualidade (Q)

> Q = média dos percentis dos critérios, ponderada pelos pesos do perfil

Custo **não** entra em Q. Qualidade e preço são medidos separadamente, para depois serem comparados.

### 4.5 Custo-benefício (CB)

A pergunta não é "qual bairro é melhor", mas **"onde a pessoa ganha mais qualidade pelo que paga"**.

1. **Preço do bairro (P):** mediana do preço por m² dos anúncios (aluguel ou venda, conforme o negócio). Com menos de 5 anúncios, o bairro recebe o aviso "preço com poucos dados" e fica sem nota de custo-benefício (a nota de qualidade continua valendo).
2. **Preço esperado (P̂):** uma reta ajustada na cidade inteira relaciona qualidade e preço (regressão linear de P em função de Q). Ela responde: "quanto um bairro com essa qualidade costuma custar aqui?".
3. **Diferença:** (P̂ − P) ÷ P̂. Positiva = o bairro custa **menos** do que a qualidade dele sugere.
4. **CB** = percentil dessa diferença na cidade.

Por que isso não premia bairro rico: um bairro nobre que cobra o que a qualidade vale fica no meio da escala de CB. Quem se destaca é o bairro com qualidade boa e preço abaixo do esperado.

Exemplo com números fictícios (aluguel):

| Bairro | Q | Preço/m² real | Preço/m² esperado | Diferença | Leitura |
|---|---|---|---|---|---|
| A — nobre | 85 | R$ 42 | R$ 40 | 5% mais caro | Paga o que a qualidade vale |
| B — intermediário | 65 | R$ 24 | R$ 31 | 23% mais barato | **Melhor custo-benefício** |
| C — periférico | 40 | R$ 20 | R$ 21 | 5% mais barato | Barato, mas a qualidade acompanha |

**Visualização:** gráfico de dispersão qualidade × preço, com a reta do preço esperado e a **fronteira de eficiência** em destaque. Ficam na fronteira os bairros que nenhum outro supera ao mesmo tempo em qualidade e em preço.

### 4.6 Nota final do bairro

> Nota = (1 − ênfase) × Q + ênfase × CB

A ênfase em economia vai de 0 (só qualidade) a 1 (só custo-benefício); o padrão é 0,5. Bairros cujo custo típico passa do orçamento recebem o aviso "acima do orçamento".

### 4.7 Faixas de nota

Toda nota de 0 a 100 (nota final, qualidade e custo-benefício) é mostrada com a cor da sua faixa:

| Faixa | Rótulo | Cor |
|---|---|---|
| 0 a 49 | nota baixa | ameixa |
| 50 a 79 | nota intermediária | verde médio |
| 80 a 100 | nota alta | verde escuro |

- O rótulo aparece sempre junto da cor. A cor nunca carrega a informação sozinha.
- O mapa de notas usa as mesmas faixas: a mesma nota tem a mesma cor em todo lugar.
- As notas são arredondadas para inteiro antes de escolher a faixa (49,6 vira 50, faixa intermediária).
- As cores exatas e os testes de daltonismo e contraste estão em `identidade/` (guia da identidade visual).
- **A conferir com os dados reais:** a nota é uma média de percentis, e médias puxam os valores para perto de 50. A faixa de 80 a 100 pode ficar quase vazia.

## 5. Pontos de partida de pesos

Cada pessoa pode ajustar todos os pesos. Para não começar do zero, o perfil sugere um ponto de partida:

- tudo começa em 3 (equilibrado);
- cada característica do perfil só **aumenta** os pesos que importam para ela;
- com mais de uma característica (ex.: filhos e pet), cada critério fica com o **maior** peso sugerido.

| Critério | Equilibrado | Com filhos | Com pet | Sem carro |
|---|---|---|---|---|
| Dia a dia | 3 | 3 | 3 | **5** |
| Educação | 3 | **5** | 3 | 3 |
| Saúde | 3 | **4** | 3 | **4** |
| Mobilidade | 3 | 3 | 3 | **5** |
| Segurança | 3 | **5** | 3 | 3 |
| Lazer e verde | 3 | **4** | **5** | 3 |
| Infraestrutura | 3 | **4** | 3 | 3 |
| Sossego | 3 | 3 | **4** | 3 |

**Explicativo, mostrado no app junto de cada peso sugerido:**

- **Com filhos**
  - Educação 5: escola e creche perto encurtam o trajeto diário das crianças.
  - Segurança 5: crianças circulam mais a pé pelo bairro.
  - Saúde 4: crianças vão ao médico com mais frequência.
  - Lazer e verde 4: praças e parques são o quintal de quem mora com crianças.
  - Infraestrutura 4: saneamento afeta diretamente a saúde infantil.
- **Com pet**
  - Lazer e verde 5: parques e praças para os passeios diários.
  - Sossego 4: menos trânsito intenso perto de casa deixa os passeios mais seguros.
- **Sem carro**
  - Dia a dia 5: as compras são feitas a pé.
  - Mobilidade 5: ônibus perto define a rotina.
  - Saúde 4: atendimento perto evita depender de transporte numa urgência.

Ênfase em economia também tem pontos de partida: **qualidade primeiro** (0,3), **equilíbrio** (0,5), **economia primeiro** (0,7).

## 6. Camada 3 — Nota do imóvel

- **Custo-benefício:** a mesma ideia do bairro, no nível do imóvel. O preço anunciado é comparado com o preço esperado por um modelo (área, quartos, vagas, tipo, bairro). Abaixo do esperado sinaliza oportunidade, e também pode sinalizar problema no imóvel ou erro no anúncio.
- **Acesso próximo:** os mesmos serviços do bairro, no raio de 1 km a partir do imóvel. Quando o anúncio só informa o bairro, usa o valor do bairro.
- **Condições:** quantas das garantias e condições do perfil o anúncio aceita.
- A nota final do imóvel combina essa nota com a nota do bairro, com peso configurável.

## 7. Alugar ou comprar

Para quem escolhe "comparar os dois", cada bairro mostra a **razão preço/aluguel**:

> preço mediano de venda ÷ (aluguel mediano mensal × 12)

Quanto maior a razão, mais caro está comprar em relação a alugar naquele bairro. É informação para a decisão, não uma recomendação.

## 8. Explicação do resultado

Todo ranking mostra:
- os critérios que mais puxaram a nota para cima e para baixo;
- onde o bairro está no gráfico qualidade × preço;
- os avisos de dado ausente ou insuficiente.

Nenhuma nota aparece sem explicação.

## 9. Fora do MVP

- Tempo de deslocamento até trabalho ou escola.
- Tempo de caminhada por rotas (o MVP usa raio em linha reta).
- Valorização histórica do bairro (exige série histórica de preços).

## 10. Decisões tomadas

| Tema | Decisão (2026-10-20) |
|---|---|
| Escala das notas | Percentil dentro da cidade; valores brutos guardados |
| "Por perto" | Raio de 1 km em linha reta, sem serviço de rotas |
| Unidade espacial | IBGE: setores censitários como base, bairros do IBGE quando existirem |
| Renda | Fora da nota; só informação |
| Pesos padrão | Pontos de partida por perfil, com explicativo |
| Cobertura do OpenStreetMap | Medir na fase 1, comparando com INEP e CNES |
| Custo-benefício | Qualidade × preço esperado (resíduo de regressão) para a nota; fronteira de eficiência para o gráfico |
| Pontos de partida | Tabela e explicativo da seção 5, com o campo "carro" no perfil |
| Mínimo de anúncios | 5 por bairro; abaixo disso, aviso e sem nota de custo-benefício |
| Faixas de nota (2026-10-22) | 0–49, 50–79 e 80–100, cada uma com cor e rótulo próprios (seção 4.7) |
| Segurança (2026-10-22) | Ocorrências a até 500 m de casa, só crimes contra a pessoa e o patrimônio com local (seção 4.2) |
| Bairros pequenos (2026-10-22) | Menos de 1.000 moradores: junta ao vizinho com a maior fronteira (seção 4.1) |
| Saúde (2026-10-22) | CNES no lugar do OpenStreetMap, que cobria só 36% das unidades (seção 4.2) |
| Educação (2026-10-23) | Escolas do INEP localizadas por ligação de registros com o OpenStreetMap; as sem local ficam de fora, com aviso (seção 4.2) |

## 11. Perguntas em aberto

Nenhuma. As regras do MVP estão fechadas; mudanças passam pelo registro de decisões.

O material de estudo em `estudos/` explica a estatística e as métricas deste documento, com as referências científicas.
