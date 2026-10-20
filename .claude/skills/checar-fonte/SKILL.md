---
name: checar-fonte
description: Checklist legal, de custo e de abrangência antes de usar qualquer fonte de dados, site, API (inclusive de IA) ou serviço novo no Bairrômetro. Use sempre que for coletar, baixar ou integrar algo que ainda não está aprovado em contexto/fontes.md.
---

# Checar fonte

Nenhuma fonte é usada antes de passar por esta checagem e ser aprovada por Caio.

## Passos

1. Procure a fonte em `contexto/fontes.md`.
   - `aprovada`: pode usar; siga para "Na hora de coletar".
   - `vetada`: pare e avise Caio do motivo.
   - Ausente ou `candidata`: continue.
2. Responda cada item com o link de onde tirou a resposta:
   - **Legal:** os termos de uso permitem acesso automatizado? O que o `robots.txt` diz sobre os caminhos que vamos usar? Qual a licença dos dados? Exige atribuição?
   - **Gratuito:** é grátis sem cartão de crédito? Quais os limites (requisições por segundo/dia)? Ao estourar o limite, o serviço bloqueia ou cobra? **Se puder cobrar em algum momento, a fonte é vetada.**
   - **Dados pessoais:** a fonte expõe nome, telefone, e-mail ou foto de pessoas? Como vamos descartar isso na coleta? Para APIs: o provedor usa os dados enviados para treino?
   - **Acesso:** exige login, captcha ou tem proteção anti-bot? Se sim, a fonte é vetada.
   - **Publicação:** podemos mostrar esses dados publicamente, só agregados, ou só uso local?
   - **Abrangência:** nacional, estadual, municipal ou global? Se não for nacional ou global, qual seria o equivalente em outras cidades?
3. Se não souber responder um item, diga que não sabe. Nunca suponha a favor da coleta.
4. Registre a fonte em `contexto/fontes.md` com status `candidata` e um resumo das respostas na seção "Detalhes por fonte".
5. Proponha a aprovação com o skill `registrar-decisao`. Só use a fonte depois do "sim" de Caio.

## Na hora de coletar (fonte aprovada)

- Respeite os limites da fonte; sem limite declarado, espere alguns segundos entre requisições.
- User-Agent identificando o projeto e a URL do repositório.
- Cache local: nunca baixe de novo o que já temos.
- Descarte dados pessoais antes de salvar.
- Dados coletados vão para `dados/`, que fica fora do Git.
- Cada fonte vira um conector independente, configurado por cidade (princípio de arquitetura do `CLAUDE.md`).
