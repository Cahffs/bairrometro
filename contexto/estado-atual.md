# Estado atual

_Atualizado em 2026-10-22_

## Fase
**2 — Site**: começando. Stack aprovada (site estático no GitHub Pages; dados em Python, só locais).

## O que existe
- Fundação concluída: `CLAUDE.md` v1.0, skills do projeto, plugins Data e Probabl Skills, repositório público https://github.com/Cahffs/bairrometro, com alertas de dependências e bloqueio de segredos ativos.
- Registro de decisões privado em `pessoal/decisoes.md` (D001–D025).
- **Identidade visual** em `identidade/` (D021, direção Telhado): logo, cores da marca, cores para dados validadas para daltonismo, faixas de nota 0–49 / 50–79 / 80–100 (D022), fontes e tokens. Guia em http://localhost:8766.
- Regras de negócio v1.1 em `regras-de-negocio.md` (a v1.1 acrescenta as faixas de nota): vários perfis de busca; filtros; nota do bairro = qualidade (8 critérios, percentil na cidade, raio de 1 km) combinada com custo-benefício (preço real × preço esperado pela qualidade); mínimo de 5 anúncios por bairro; pontos de partida de pesos com explicativo; nota do imóvel; comparação alugar × comprar.
- **Material de estudo** em `estudos/` (separado do sistema, público): guia interativo das contas e fórmulas e dos pipelines de dados e APIs (escopo da D023), com referências. Roda em http://localhost:8765 (ver `CLAUDE.md`).
- **Stack** (D019, D024): ver seção "Stack" do `CLAUDE.md`.
- Ainda não há código do sistema nem dados.

## Aguardando Caio
- Decisões sobre contas de usuário (cadastro, senha, sessão, RLS): proposta D026.

## Próximos passos
1. Montar o site com a identidade visual (e as contas, se aprovadas).
2. Montar o ambiente de dados com uv.
3. Avaliar as primeiras fontes com o skill `checar-fonte` (IBGE, OpenStreetMap, SSP-SP).
