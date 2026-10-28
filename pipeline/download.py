"""Baixa os arquivos brutos das fontes aprovadas para uma cidade (camada "bruto").

    python pipeline/download.py sorocaba              (usa o cache)
    python pipeline/download.py sorocaba --atualizar  (baixa de novo o que mudou)

Regras de coleta educada (CLAUDE.md, regra 1):
- User-Agent que identifica o projeto;
- cache: arquivo que já está completo não é baixado de novo;
- pausa entre arquivos;
- tudo vai para dados/bruto/, que fica fora do Git.

Cada arquivo baixado entra em dados/bruto/_manifesto.json com URL final,
tamanho, data e SHA-256, para saber exatamente de onde veio cada dado.
"""

import hashlib
import json
import ssl
import sys
import time
import tomllib
import urllib.error
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dados" / "bruto"
MANIFEST = RAW / "_manifesto.json"
USER_AGENT = "Bairrometro/0.1 (+https://github.com/Cahffs/bairrometro)"
PAUSE_SECONDS = 2
CHUNK = 1024 * 1024


# Verificação de certificado SEMPRE ligada. Duas listas de autoridades, nesta ordem:
# 1. a da Mozilla (certifi): no Windows, o repositório do sistema pode ter um certificado
#    intermediário vencido que faz o Python recusar sites válidos;
# 2. a do sistema: alguns servidores (ex.: download.inep.gov.br) não enviam o certificado
#    intermediário, e o Windows completa a cadeia com a própria lista.
# Só se troca de lista quando a verificação falha; nunca se desliga a verificação.
def tls_contexts() -> list[ssl.SSLContext]:
    contexts = []
    try:
        import certifi
        contexts.append(ssl.create_default_context(cafile=certifi.where()))
    except ImportError:
        pass
    contexts.append(ssl.create_default_context())
    return contexts


TLS = tls_contexts()


def open_url(req: urllib.request.Request, timeout: int):
    for i, ctx in enumerate(TLS):
        try:
            return urllib.request.urlopen(req, timeout=timeout, context=ctx)
        except urllib.error.URLError as e:
            if not isinstance(e.reason, ssl.SSLCertVerificationError) or i == len(TLS) - 1:
                raise


def load_toml(path: Path) -> dict:
    with path.open("rb") as f:
        return tomllib.load(f)


def resolve_urls(city: dict, sources: dict) -> list[tuple[str, str]]:
    """Lista (fonte, url) para a cidade, trocando os marcadores {uf} e {geofabrik_regiao}."""
    pairs = []
    for key in city["fontes"]:
        source = sources[key]
        if source.get("abrangencia") == "estadual" and source.get("uf") != city["uf"]:
            print(f"pulando {key}: fonte do estado {source.get('uf')}, cidade em {city['uf']}")
            continue
        for url in source["arquivos"]:
            pairs.append((key, url.format(uf=city["uf"], geofabrik_regiao=city["geofabrik_regiao"])))
    return pairs


def remote_size(url: str) -> tuple[int | None, str]:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    with open_url(req, timeout=60) as resp:
        length = resp.headers.get("Content-Length")
        return (int(length) if length else None), resp.geturl()


def file_name(url: str) -> str:
    return urllib.parse.unquote(url.rsplit("/", 1)[-1])


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(CHUNK), b""):
            h.update(block)
    return h.hexdigest()


def download(url: str, dest: Path, refresh: bool = False) -> dict:
    # O arquivo só ganha o nome final depois de completo (.part -> nome), então
    # se ele existe está inteiro: não baixa de novo, a menos que peçam --atualizar.
    if dest.exists() and not refresh:
        print(f"  em cache: {dest.name}")
        return {"url": url, "bytes": dest.stat().st_size, "cache": True}
    size, final_url = remote_size(url)
    if dest.exists() and size is not None and dest.stat().st_size == size:
        print(f"  sem mudança: {dest.name}")
        return {"url": url, "url_final": final_url, "bytes": size, "cache": True}
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    done = 0
    next_report = 50 * CHUNK
    with open_url(req, timeout=120) as resp, part.open("wb") as out:
        for block in iter(lambda: resp.read(CHUNK), b""):
            out.write(block)
            done += len(block)
            if done >= next_report:
                total = f" de {size / CHUNK:.0f} MB" if size else ""
                print(f"    {done / CHUNK:.0f} MB{total}", flush=True)
                next_report += 50 * CHUNK
    if size is not None and done != size:
        raise RuntimeError(f"{dest.name}: recebidos {done} bytes, esperados {size}")
    part.replace(dest)
    return {"url": url, "url_final": final_url, "bytes": done, "cache": False}


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    refresh = "--atualizar" in sys.argv
    if len(args) != 1:
        raise SystemExit("uso: python pipeline/download.py <cidade> [--atualizar]   (ex.: sorocaba)")
    city = load_toml(ROOT / "config" / "cidades" / f"{args[0]}.toml")
    sources = load_toml(ROOT / "config" / "fontes.toml")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}

    for key, url in resolve_urls(city, sources):
        dest = RAW / key / file_name(url)
        print(f"[{key}] {dest.name}", flush=True)
        info = download(url, dest, refresh)
        rel = dest.relative_to(ROOT).as_posix()
        if info["cache"] and rel in manifest:
            continue  # nada mudou: mantém o registro original (data e hash do download)
        info["arquivo"] = rel
        info["baixado_em"] = datetime.now(UTC).isoformat(timespec="seconds")
        info["sha256"] = sha256(dest)
        manifest[rel] = info
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        if not info["cache"]:
            time.sleep(PAUSE_SECONDS)
    print("pronto")


if __name__ == "__main__":
    main()
