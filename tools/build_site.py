"""Monta o site estático em site/.

1. Copia os arquivos da identidade visual (identidade/ é a fonte única da
   verdade; o site é publicado sozinho, então leva uma cópia).
2. Monta as páginas: cada arquivo de site/_pages/ vira site/<nome>.html,
   trocando <!--#include nome--> pelo conteúdo de site/_partials/nome.html
   (cabeçalho, rodapé e <head> iguais em todas as páginas).

Rode depois de mudar a identidade, as páginas ou as partes comuns:

    python tools/build_site.py
"""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SRC = ROOT / "identidade"
DEST = SITE / "assets" / "identidade"
INCLUDE = re.compile(r"<!--#include ([a-z-]+)-->")

FILES = [
    "tokens.css",
    "fonts/Fraunces-VF.woff2",
    "fonts/SourceSans3-VF.woff2",
    "fonts/OFL-Fraunces.txt",
    "fonts/OFL-SourceSans3.txt",
    "logo/logo.svg",
    "logo/logo-dark.svg",
    "logo/symbol.svg",
    "logo/symbol-dark.svg",
    "logo/favicon.svg",
]


def copy_identity() -> None:
    if DEST.exists():
        shutil.rmtree(DEST)
    for rel in FILES:
        target = DEST / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SRC / rel, target)
    (DEST / "LEIA-ME.txt").write_text(
        "Cópia gerada por tools/build_site.py a partir de identidade/. Não edite aqui.\n",
        encoding="utf-8",
    )
    print(f"identidade: {len(FILES)} arquivos copiados para {DEST.relative_to(ROOT).as_posix()}")


def build_pages() -> None:
    partials = {p.stem: p.read_text(encoding="utf-8").strip() for p in (SITE / "_partials").glob("*.html")}
    pages = sorted((SITE / "_pages").glob("*.html"))
    for page in pages:
        source = page.read_text(encoding="utf-8")

        def replace(match: re.Match, page_name: str = page.name) -> str:
            name = match.group(1)
            if name not in partials:
                raise SystemExit(f"{page_name}: parte comum '{name}' não existe em site/_partials/")
            return partials[name]

        html = INCLUDE.sub(replace, source)
        html = html.replace(
            "<!doctype html>",
            f"<!doctype html>\n<!-- GERADO por tools/build_site.py a partir de site/_pages/{page.name}. Não edite aqui. -->",
            1,
        )
        (SITE / page.name).write_text(html, encoding="utf-8", newline="\n")
    print(f"páginas: {len(pages)} montadas em site/")


if __name__ == "__main__":
    copy_identity()
    build_pages()
