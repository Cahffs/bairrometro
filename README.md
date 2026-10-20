# Bairrômetro

Ferramenta de dados para escolher bairro e imóvel em cidades brasileiras. **MVP: Sorocaba-SP.**

> Em construção — fase 0 (fundação). Projeto pessoal de aprendizado em ciência de dados com IA.

## O que vai fazer

- **Comparar bairros** com dados abertos: segurança, renda, serviços por perto (escolas, mercados, farmácias), tempo de deslocamento.
- **Avaliar imóveis**: preço por m², comparação com o bairro, anúncios abaixo do preço esperado.
- **Dashboards e busca** para cruzar tudo isso.

## Princípios

- **Legal:** respeita termos de uso, `robots.txt`, licenças e a LGPD. Anúncios coletados nunca são publicados; só agregados.
- **Gratuito:** só dados, ferramentas e APIs gratuitos, sem cartão de crédito.
- **Aberto:** código sob licença MIT; decisões e aprendizados documentados em [`contexto/`](contexto/).
- **Escalável:** cidade e fontes de dados são configuração. Sorocaba é só o começo.

## Como o projeto é construído

Desenvolvido com [Claude Code](https://claude.com/claude-code), com processo documentado:

- [`CLAUDE.md`](CLAUDE.md) — regras que a IA segue no projeto.
- [`contexto/decisoes.md`](contexto/decisoes.md) — todas as decisões, com as opções avaliadas.
- [`contexto/fontes.md`](contexto/fontes.md) — fontes de dados, licenças e custos.
- [`contexto/diario/`](contexto/diario/) — diário de cada sessão de trabalho.
- [`.claude/skills/`](.claude/skills/) — skills do projeto (checagem legal de fontes, registro de decisões etc.).

## Fontes de dados

Ver [`contexto/fontes.md`](contexto/fontes.md). Os créditos de cada fonte serão listados aqui quando ela entrar em uso.

## Licença

Código sob [licença MIT](LICENSE). Os dados seguem a licença de cada fonte.

---

## English summary

Bairrômetro is a data tool to help choose a neighborhood and a home in Brazilian cities, starting with Sorocaba-SP. It uses only free, open data and tools, respects each source's terms of use and Brazil's data protection law (LGPD), and never republishes scraped listings. Built in public with Claude Code as a learning project in data science and AI. Documentation is in Portuguese; code is in English. MIT licensed.
