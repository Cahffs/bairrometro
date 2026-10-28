"""Leitura do OpenStreetMap com um recorte da cidade guardado em cache.

O extrato da Geofabrik cobre o Sudeste inteiro, e o leitor do GDAL percorre o arquivo todo a cada
consulta, mesmo com a caixa de recorte. Por isso cada camada (pontos, linhas, áreas) é lida uma vez
só para a caixa da cidade e guardada num GeoPackage em dados/cache/osm/. As consultas seguintes, com
o mesmo filtro SQL de antes, leem do recorte, que é pequeno.

O recorte é refeito quando o extrato baixado muda (tamanho ou data) ou quando a caixa é outra.
"""

import hashlib
import json
from pathlib import Path

import geopandas as gpd
import pyogrio

ROOT = Path(__file__).resolve().parent.parent
PBF = ROOT / "dados" / "bruto" / "osm_geofabrik" / "sudeste-latest.osm.pbf"
CACHE_DIR = ROOT / "dados" / "cache" / "osm"
LAYERS = ("points", "lines", "multipolygons")


def _stamp(bbox: tuple) -> dict:
    stat = PBF.stat()
    return {"bbox": [round(v, 6) for v in bbox], "pbf_bytes": stat.st_size, "pbf_mtime": int(stat.st_mtime)}


def cut_path(bbox: tuple) -> Path:
    digest = hashlib.sha256(json.dumps([round(v, 6) for v in bbox]).encode()).hexdigest()[:12]
    return CACHE_DIR / f"recorte_{digest}.gpkg"


def ensure_cut(bbox: tuple) -> Path:
    """Cria o recorte da caixa, se ainda não existe ou se o extrato mudou."""
    path = cut_path(bbox)
    meta = path.with_suffix(".json")
    stamp = _stamp(bbox)
    if path.exists() and meta.exists() and json.loads(meta.read_text(encoding="utf-8")) == stamp:
        return path
    print(f"  recortando o OpenStreetMap para a caixa da cidade (uma vez): {path.name}", flush=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    for layer in LAYERS:
        pyogrio.write_dataframe(pyogrio.read_dataframe(PBF, layer=layer, bbox=bbox), path, layer=layer)
    meta.write_text(json.dumps(stamp), encoding="utf-8")
    return path


def osm_layer(layer: str, bbox: tuple, columns: list[str], where: str) -> gpd.GeoDataFrame:
    """Mesma consulta que se faria no extrato, só que no recorte da cidade (coordenadas em graus)."""
    return pyogrio.read_dataframe(ensure_cut(bbox), layer=layer, columns=columns, where=where)
