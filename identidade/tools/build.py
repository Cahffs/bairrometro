"""Gera os arquivos da identidade visual a partir de identidade/tokens.json.

Uso, a partir da raiz do repositório:
    python identidade/tools/build.py tokens           # tokens.css e conferência de contraste
    python identidade/tools/build.py logo             # SVGs do logo (requer fonttools e brotli)
    python identidade/tools/build.py webfonts PASTA   # .ttf de PASTA -> .woff2 (requer fonttools e brotli)

O comando tokens usa só a biblioteca padrão. Os outros dois precisam de
`pip install fonttools brotli`.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from color import contrast_ratio  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TOKENS = json.loads((ROOT / "tokens.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------- tokens.css

def _css_vars(mapping, prefix="", indent="  "):
    return "\n".join(f"{indent}--{prefix}{key}: {value};" for key, value in mapping.items())


def _theme_block(mode, indent="  "):
    data = TOKENS["data"][mode]
    lines = [_css_vars(TOKENS["themes"][mode], indent=indent)]
    lines.append(_css_vars({b["id"]: b["color"] for b in data["score_bands"]}, prefix="band-", indent=indent))
    for kind in ("sequential", "diverging", "categorical"):
        short = {"sequential": "seq", "diverging": "div", "categorical": "cat"}[kind]
        lines.append(_css_vars({f"{short}-{i}": c for i, c in enumerate(data[kind], start=1)}, indent=indent))
    lines.append(_css_vars({k: data[k] for k in ("focus", "context", "grid", "axis", "axis-text")},
                           prefix="data-", indent=indent))
    for name, status in TOKENS["status"][mode].items():
        lines.append(_css_vars({f"{name}-bg": status["bg"], f"{name}-text": status["text"]}, indent=indent))
    return "\n".join(lines)


def build_tokens_css():
    fonts = TOKENS["fonts"]
    ramps = "\n".join(_css_vars(steps, prefix=f"{name}-") for name, steps in TOKENS["ramps"].items())
    font_faces = "\n".join(
        f'@font-face {{\n  font-family: "{f["family"]}";\n  src: url("{f["file"]}") format("woff2");\n'
        f'  font-weight: {f["weights"]};\n  font-display: swap;\n}}'
        for f in (fonts["display"], fonts["text"])
    )
    soft = fonts["display"]["variation"]
    css = f"""/* Bairrômetro: tokens da identidade visual.
   GERADO por tools/build.py a partir de tokens.json. Não edite à mão. */

{font_faces}

:root {{
  color-scheme: light;
  --font-display: "{fonts["display"]["family"]}", Georgia, serif;
  --font-text: "{fonts["text"]["family"]}", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "Cascadia Mono", Consolas, monospace;
  --display-variation: "SOFT" {soft["SOFT"]}, "WONK" {soft["WONK"]};
  --radius-control: {TOKENS["radius"]["control"]};
  --radius-card: {TOKENS["radius"]["card"]};
{ramps}
{_theme_block("light")}
}}

@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    color-scheme: dark;
{_theme_block("dark", indent="    ")}
  }}
}}

:root[data-theme="dark"] {{
  color-scheme: dark;
{_theme_block("dark")}
}}
"""
    (ROOT / "tokens.css").write_text(css, encoding="utf-8")
    print("tokens.css gerado")


def check_contrast():
    """Confere os pares de cor que precisam de contraste mínimo (WCAG 2.1 AA)."""
    failures = 0
    for mode in ("light", "dark"):
        t, d = TOKENS["themes"][mode], TOKENS["data"][mode]
        pairs = [
            ("text", "page", 4.5), ("text", "surface", 4.5), ("text", "surface-2", 4.5),
            ("text-secondary", "page", 4.5), ("text-secondary", "surface", 4.5), ("text-secondary", "surface-2", 4.5),
            ("text-muted", "page", 4.5), ("text-muted", "surface", 4.5),
            ("primary", "page", 4.5), ("primary", "surface", 4.5),
            ("on-primary", "primary", 4.5), ("on-primary", "primary-hover", 4.5),
            ("accent", "page", 4.5), ("focus-ring", "page", 3.0),
            ("logo-text", "page", 4.5), ("logo-roof", "page", 3.0), ("logo-ground", "page", 3.0),
        ]
        rows = [(f"{fg} / {bg}", t[fg], t[bg], minimum) for fg, bg, minimum in pairs]
        rows += [(f"dados: {k} / surface", d[k], t["surface"], 4.5 if k == "axis-text" else 3.0)
                 for k in ("axis-text", "focus")]
        rows += [(f"dados: categórica {i} / surface", c, t["surface"], 3.0)
                 for i, c in enumerate(d["categorical"], start=1)]
        # a nota é texto grande (40 px, peso 600): o mínimo da WCAG para texto grande é 3:1
        rows += [(f"faixa {b['min']}–{b['max']} / {bg}", b["color"], t[bg], 3.0)
                 for b in d["score_bands"] for bg in ("page", "surface")]
        rows += [(f"status: {name}", s["text"], s["bg"], 4.5) for name, s in TOKENS["status"][mode].items()]
        print(f"\nContraste, modo {'claro' if mode == 'light' else 'escuro'}")
        for label, fg, bg, minimum in rows:
            ratio = contrast_ratio(fg, bg)
            ok = ratio >= minimum
            failures += not ok
            print(f"  {'ok   ' if ok else 'FALHA'} {ratio:5.2f} (mín. {minimum}) {label:34} {fg} sobre {bg}")
    if failures:
        sys.exit(f"\n{failures} par(es) abaixo do contraste mínimo")


# ---------------------------------------------------------------- logo

# Símbolo desenhado numa grade de 64 x 64: telhado (o acento do ô) sobre um círculo (o o).
SYMBOL = {"roof": "M13 29 L32 12 L51 29", "cx": 32, "cy": 43, "r": 12.5, "stroke": 7}
SYMBOL_BOX = (9.5, 8.5, 54.5, 59.5)  # limites visíveis do desenho, contando a espessura do traço
# Versão para tamanhos minúsculos (ícone da aba): traços mais grossos.
FAVICON = {"roof": "M10 28 L32 8 L54 28", "cx": 32, "cy": 44, "r": 12, "stroke": 9}


def _symbol_markup(roof_color, ground_color, geometry=SYMBOL, transform=""):
    g = geometry
    attrs = f' transform="{transform}"' if transform else ""
    return (
        f'<g{attrs} fill="none" stroke-width="{g["stroke"]}" stroke-linecap="round" stroke-linejoin="round">'
        f'<path d="{g["roof"]}" stroke="{roof_color}"/>'
        f'<circle cx="{g["cx"]}" cy="{g["cy"]}" r="{g["r"]}" stroke="{ground_color}"/></g>'
    )


def _svg(view_box, body, title="Bairrômetro"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-labelledby="title">'
        f'<title id="title">{title}</title>{body}</svg>\n'
    )


def _load_logo_font():
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    spec = TOKENS["fonts"]["logo_instance"]
    font = TTFont(ROOT / TOKENS["fonts"]["display"]["file"])
    axes = {k: v for k, v in spec.items() if k != "family"}
    return instancer.instantiateVariableFont(font, axes)


def _single_substitutions(font):
    """Trocas de glifo que a fonte aplica sozinha (ex.: o m reto quando WONK = 0)."""
    if "GSUB" not in font:
        return []
    table, maps, seen = font["GSUB"].table, [], set()
    for record in table.FeatureList.FeatureRecord:
        if record.FeatureTag not in {"rvrn", "rlig", "calt"}:
            continue
        for index in record.Feature.LookupListIndex:
            if index in seen:
                continue
            seen.add(index)
            lookup = table.LookupList.Lookup[index]
            for sub in lookup.SubTable:
                if lookup.LookupType == 7:
                    sub = sub.ExtSubTable
                if getattr(sub, "LookupType", lookup.LookupType) == 1:
                    maps.append(sub.mapping)
    return maps


def _kerning(font, left, right):
    """Ajuste de espaço entre dois glifos (tabela GPOS, recurso kern)."""
    table, seen = font["GPOS"].table, set()
    for record in table.FeatureList.FeatureRecord:
        if record.FeatureTag != "kern":
            continue
        for index in record.Feature.LookupListIndex:
            if index in seen:
                continue
            seen.add(index)
            lookup = table.LookupList.Lookup[index]
            for sub in lookup.SubTable:
                if lookup.LookupType == 9:
                    sub = sub.ExtSubTable
                if left not in sub.Coverage.glyphs:
                    continue
                if sub.Format == 1:
                    pair_set = sub.PairSet[sub.Coverage.glyphs.index(left)]
                    for pair in pair_set.PairValueRecord:
                        if pair.SecondGlyph == right:
                            return getattr(pair.Value1, "XAdvance", 0) or 0
                else:
                    c1 = sub.ClassDef1.classDefs.get(left, 0)
                    c2 = sub.ClassDef2.classDefs.get(right, 0)
                    return getattr(sub.Class1Record[c1].Class2Record[c2].Value1, "XAdvance", 0) or 0
    return 0


def _wordmark(font, text, size, x0, baseline):
    """Contornos de cada letra em SVG e os limites do conjunto."""
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen

    scale = size / font["head"].unitsPerEm
    glyph_set, hmtx = font.getGlyphSet(), font["hmtx"]
    cmap = font.getBestCmap()
    glyphs = [cmap[ord(ch)] for ch in text]
    for mapping in _single_substitutions(font):
        glyphs = [mapping.get(g, g) for g in glyphs]

    def fmt(v):
        return f"{v:.2f}".rstrip("0").rstrip(".")

    letters, bounds, x = [], BoundsPen(glyph_set), 0
    for i, (char, glyph) in enumerate(zip(text, glyphs)):
        matrix = (scale, 0, 0, -scale, x0 + x * scale, baseline)
        pen = SVGPathPen(glyph_set, ntos=fmt)
        glyph_set[glyph].draw(TransformPen(pen, matrix))
        glyph_set[glyph].draw(TransformPen(bounds, matrix))
        letters.append((char, pen.getCommands()))
        x += hmtx[glyph][0]
        if i + 1 < len(glyphs):
            x += _kerning(font, glyph, glyphs[i + 1])
    return letters, bounds.bounds


def build_logo():
    font = _load_logo_font()
    upm = font["head"].unitsPerEm
    size, baseline = 100, 100
    glyph_set = font.getGlyphSet()

    from fontTools.pens.boundsPen import BoundsPen

    def glyph_box(name):
        pen = BoundsPen(glyph_set)
        glyph_set[name].draw(pen)
        return pen.bounds

    # o símbolo vai da linha de base (com a mesma "sobra" do o) até a altura da haste do b
    ascender = glyph_box("b")[3] / upm * size
    overshoot = -glyph_box("o")[1] / upm * size
    sx0, sy0, sx1, sy1 = SYMBOL_BOX
    k = (ascender + overshoot) / (sy1 - sy0)
    symbol_width = (sx1 - sx0) * k
    gap = 0.3 * size
    b_left = glyph_box("b")[0] / upm * size

    letters, (wx0, wy0, wx1, wy1) = _wordmark(font, "bairrômetro", size, symbol_width + gap - b_left, baseline)
    top = min(wy0, baseline - ascender)
    view_box = f"0 {top:.2f} {wx1:.2f} {baseline + overshoot - top:.2f}"
    symbol_transform = f"translate({-sx0 * k:.3f} {baseline - ascender - sy0 * k:.3f}) scale({k:.4f})"

    def full_logo(text_color, accent_color, roof, ground):
        word = "".join(
            f'<path d="{d}" fill="{accent_color if ch == "ô" else text_color}"/>' for ch, d in letters
        )
        return _svg(view_box, _symbol_markup(roof, ground, transform=symbol_transform) + word)

    def wordmark_only(text_color, accent_color):
        word = "".join(
            f'<path d="{d}" fill="{accent_color if ch == "ô" else text_color}"/>' for ch, d in letters
        )
        x_start = symbol_width + gap
        return _svg(f"{x_start:.2f} {wy0:.2f} {wx1 - x_start:.2f} {wy1 - wy0:.2f}", word)

    light, dark = TOKENS["themes"]["light"], TOKENS["themes"]["dark"]
    box = f"{sx0} {sy0} {sx1 - sx0} {sy1 - sy0}"
    outputs = {
        "logo.svg": full_logo(light["logo-text"], light["logo-roof"], light["logo-roof"], light["logo-ground"]),
        "logo-dark.svg": full_logo(dark["logo-text"], dark["logo-roof"], dark["logo-roof"], dark["logo-ground"]),
        "logo-mono.svg": full_logo(light["logo-text"], light["logo-text"], light["logo-text"], light["logo-text"]),
        "logo-mono-light.svg": full_logo(light["page"], light["page"], light["page"], light["page"]),
        "wordmark.svg": wordmark_only(light["logo-text"], light["logo-roof"]),
        "symbol.svg": _svg(box, _symbol_markup(light["logo-roof"], light["logo-ground"])),
        "symbol-dark.svg": _svg(box, _symbol_markup(dark["logo-roof"], dark["logo-ground"])),
        # ícone da aba: troca de cor sozinho quando o navegador está no modo escuro
        "favicon.svg": _svg(
            "0 0 64 64",
            f'<style>.roof{{stroke:{light["logo-roof"]}}}.ground{{stroke:{light["logo-ground"]}}}'
            f'@media (prefers-color-scheme: dark){{.roof{{stroke:{dark["primary"]}}}'
            f'.ground{{stroke:{dark["accent"]}}}}}</style>'
            f'<g fill="none" stroke-width="{FAVICON["stroke"]}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path class="roof" d="{FAVICON["roof"]}"/>'
            f'<circle class="ground" cx="{FAVICON["cx"]}" cy="{FAVICON["cy"]}" r="{FAVICON["r"]}"/></g>',
        ),
    }
    out_dir = ROOT / "logo"
    out_dir.mkdir(exist_ok=True)
    for name, svg in outputs.items():
        (out_dir / name).write_text(svg, encoding="utf-8")
        print(f"logo/{name}")


# ---------------------------------------------------------------- fontes web

def build_webfonts(source_dir):
    """Só comprime (TTF -> WOFF2), sem cortar nem alterar nada dentro da fonte.

    A Source Sans 3 tem Reserved Font Name ("Source"): pela licença OFL, uma
    versão modificada (por exemplo, com caracteres removidos) teria de mudar de
    nome. A compressão WOFF2 não conta como modificação.
    """
    from fontTools.ttLib import woff2

    names = {"Fraunces": "Fraunces-VF.woff2", "SourceSans3": "SourceSans3-VF.woff2"}
    for ttf in sorted(Path(source_dir).glob("*.ttf")):
        target = next((v for k, v in names.items() if ttf.name.startswith(k)), None)
        if target:
            woff2.compress(str(ttf), str(ROOT / "fonts" / target))
            print(f"fonts/{target}")


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "tokens"
    if command == "tokens":
        build_tokens_css()
        check_contrast()
    elif command == "logo":
        build_logo()
    elif command == "webfonts" and len(sys.argv) > 2:
        build_webfonts(sys.argv[2])
    else:
        sys.exit(__doc__)
