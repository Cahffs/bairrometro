# Identidade visual do Bairrômetro

Direção **Telhado**: o acento do **ô** vira o telhado de uma casa (decisão D021). O guia completo, com logo, cores, cores para dados, tipografia e exemplos, está em `index.html`.

## Abrir o guia

```bash
python -m http.server 8766 --bind 127.0.0.1 --directory identidade
```

Depois abra http://localhost:8766. No app do Claude, a configuração `identidade` do `.claude/launch.json` faz o mesmo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `tokens.json` | Fonte única da verdade: cores, escalas, faixas de nota, fontes e tamanhos. Editado à mão. |
| `tokens.css` | Variáveis CSS com modo claro e escuro. **Gerado**, não editar. |
| `logo/*.svg` | Logo, símbolo e ícone da aba, com o texto convertido em desenho. **Gerados**. |
| `fonts/` | Fraunces e Source Sans 3 em WOFF2, com as licenças (SIL OFL 1.1). |
| `tools/build.py` | Gera `tokens.css` e os logos e confere o contraste de todos os pares de cor. |
| `tools/color.py` | Conversões de cor (OKLCH) e contraste WCAG, só com a biblioteca padrão. |

## Regenerar

```bash
python identidade/tools/build.py tokens
```

```bash
python identidade/tools/build.py logo
```

O primeiro comando não precisa de nada instalado e falha se algum par de cor ficar abaixo do contraste mínimo. O segundo precisa de `pip install fonttools brotli`.

## Regras rápidas

- Cor de marca não é cor de dado: a terracota só marca o bairro em destaque nos gráficos.
- Toda nota de 0 a 100 usa a cor da sua faixa (0–49 ameixa, 50–79 verde médio, 80–100 verde escuro), com o rótulo junto (D022).
- Cor nova em gráfico passa pelo validador de paletas (daltonismo e contraste) antes de entrar no `tokens.json`.

## Créditos

- Fraunces: Undercase Type, SIL OFL 1.1.
- Source Sans 3: Paul D. Hunt / Adobe, SIL OFL 1.1, Reserved Font Name "Source".
