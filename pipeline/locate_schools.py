"""Localiza as escolas do INEP, que vêm sem coordenadas, com os dados do OpenStreetMap (D039).

    uv run python pipeline/locate_schools.py sorocaba

É uma ligação de registros (record linkage): achar, em outra base, o registro que fala da mesma
coisa. Cada escola ativa do Censo Escolar passa pelas etapas abaixo, da mais precisa para a menos
precisa, e fica com o método que a localizou:

1. nome:           o nome casa com o de uma escola do OSM (correspondência aproximada de texto);
2. endereço:       rua e número batem com um endereço do OSM;
3. número próximo: a rua bate e há um número a até 100 de distância na mesma rua;
4. rua e bairro:   a rua bate; fica no ponto da rua mais perto do bairro informado
                   (ou no meio da rua, se ela for curta);
5. sem local:      nenhuma etapa funcionou; a escola fica de fora, com aviso.

Grava dados/limpo/<cidade>/escolas.gpkg (código INEP, dependência, método, ponto) e imprime um
relatório de precisão. As escolas só entram na nota depois que Caio aprovar o relatório.
"""

import csv
import io
import re
import sys
import unicodedata
import zipfile
from difflib import SequenceMatcher
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pyogrio
from osm_extract import osm_layer
from shapely.geometry import box
from shapely.ops import nearest_points

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dados" / "bruto"
INEP_ZIP = RAW / "inep_censo_escolar" / "microdados_censo_escolar_2024.zip"

NAME_THRESHOLD = 0.85      # semelhança mínima entre nomes (0 a 1)
NAME_MARGIN = 0.05         # o melhor candidato precisa ganhar do segundo por pelo menos isto
NUMBER_TOLERANCE = 100     # "número próximo": até 100 números de diferença na mesma rua
SHORT_STREET_M = 1500      # rua sem bairro conhecido só serve se couber numa caixa deste tamanho

# abreviações comuns em nomes de escola, rua e bairro no Brasil
ABBREVIATIONS = {
    "EM": "ESCOLA MUNICIPAL", "EE": "ESCOLA ESTADUAL", "PROF": "PROFESSOR", "PROFA": "PROFESSORA",
    "DR": "DOUTOR", "DRA": "DOUTORA", "STA": "SANTA", "STO": "SANTO", "PE": "PADRE", "CEL": "CORONEL",
    "GAL": "GENERAL", "GEN": "GENERAL", "ENG": "ENGENHEIRO", "VER": "VEREADOR", "PRES": "PRESIDENTE",
    "SEN": "SENADOR", "DEP": "DEPUTADO", "MAL": "MARECHAL", "CAP": "CAPITAO", "TEN": "TENENTE",
    "SGT": "SARGENTO", "COM": "COMENDADOR", "SRA": "SENHORA", "JD": "JARDIM", "VL": "VILA",
    "PQ": "PARQUE", "RES": "RESIDENCIAL", "CJ": "CONJUNTO", "CONJ": "CONJUNTO", "CH": "CHACARA",
    "COL": "COLEGIO", "ESC": "ESCOLA",
}
# palavras que todo nome de escola tem e por isso não ajudam a distinguir uma da outra
SCHOOL_WORDS = {
    "ESCOLA", "ESCOLAS", "MUNICIPAL", "ESTADUAL", "FEDERAL", "COLEGIO", "CENTRO", "CENTROS", "EDUCACAO",
    "EDUCACIONAL", "INFANTIL", "ENSINO", "FUNDAMENTAL", "MEDIO", "CEI", "CEMEI", "EMEF", "EMEI", "EEI",
    "CRECHE", "BERCARIO", "ESCOLAR", "EDUCANDARIO", "UNIDADE", "SOROCABA", "PROFESSOR", "PROFESSORA",
    "DOUTOR", "DOUTORA", "LTDA", "ME", "EIRELI",
}
STREET_TYPES = {
    "RUA", "R", "AVENIDA", "AV", "TRAVESSA", "TV", "ALAMEDA", "AL", "ESTRADA", "EST", "RODOVIA", "ROD",
    "PRACA", "PCA", "VIELA", "LARGO", "VIA", "ACESSO", "PASSAGEM",
}
STOPWORDS = {"DE", "DA", "DO", "DOS", "DAS", "E", "A", "O", "AS", "OS"}


# ---------------------------------------------------------------- texto

def tokens(text: str | None) -> list[str]:
    """Maiúsculas sem acento, sem pontuação, com as abreviações expandidas."""
    if not text:
        return []
    ascii_text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode().upper()
    ascii_text = re.sub(r"\(PROPOSTO\)", " ", ascii_text)
    # siglas com pontos viram uma palavra só: "C.E.I." → "CEI", "E.E." → "EE"
    ascii_text = re.sub(r"\b(?:[A-Z]\.){2,}", lambda m: m.group(0).replace(".", "") + " ", ascii_text)
    words = re.sub(r"[^A-Z0-9 ]", " ", ascii_text).split()
    return " ".join(ABBREVIATIONS.get(w, w) for w in words).split()


def school_key(name: str | None) -> str:
    """O que distingue uma escola: o nome sem as palavras genéricas, em ordem alfabética."""
    words = [w for w in tokens(name) if w not in SCHOOL_WORDS and w not in STOPWORDS]
    return " ".join(sorted(words))


def street_key(name: str | None) -> str:
    """Nome da rua sem o tipo ("Rua", "Av.") e sem preposições: 'Av. Dr. Afonso Vergueiro' → 'AFONSO DOUTOR VERGUEIRO'."""
    words = tokens(name)
    if words and words[0] in STREET_TYPES:
        words = words[1:]
    return " ".join(w for w in words if w not in STOPWORDS)


def place_key(name: str | None) -> str:
    return " ".join(w for w in tokens(name) if w not in STOPWORDS)


def similarity(a: str, b: str) -> float:
    """Semelhança de 0 a 1 entre duas chaves (proporção de caracteres em comum, na ordem)."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def house_number(value: str | None) -> int | None:
    match = re.match(r"\s*(\d+)", str(value or ""))
    return int(match.group(1)) if match else None


# ---------------------------------------------------------------- leitura

def load_inep_schools(code: str) -> pd.DataFrame:
    """Escolas em atividade do município. Só colunas da escola, nenhuma de aluno ou professor."""
    keep = ["CO_ENTIDADE", "NO_ENTIDADE", "TP_DEPENDENCIA", "DS_ENDERECO", "NU_ENDERECO", "NO_BAIRRO"]
    with zipfile.ZipFile(INEP_ZIP) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".csv") and "microdados_ed_basica" in n)
        with zf.open(name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1"), delimiter=";")
            rows = [{k: r[k] for k in keep} for r in reader
                    if r["CO_MUNICIPIO"] == code and r["TP_SITUACAO_FUNCIONAMENTO"] == "1"]
    return pd.DataFrame(rows, columns=keep)


def osm(layer: str, bbox: tuple, columns: list[str], where: str, crs: str) -> gpd.GeoDataFrame:
    return osm_layer(layer, bbox, columns, where).to_crs(crs)


def load_osm_schools(bbox: tuple, crs: str) -> gpd.GeoDataFrame:
    kinds = "('school','kindergarten','college')"
    pts = osm("points", bbox, ["name", "other_tags"], "name IS NOT NULL AND other_tags LIKE '%amenity%'", crs)
    pts = pts[pts["other_tags"].str.contains(r'"amenity"=>"(?:school|kindergarten|college)"', regex=True, na=False)]
    areas = osm("multipolygons", bbox, ["name", "amenity"], f"name IS NOT NULL AND amenity IN {kinds}", crs)
    areas["geometry"] = areas.representative_point()
    out = gpd.GeoDataFrame(pd.concat([pts[["name", "geometry"]], areas[["name", "geometry"]]], ignore_index=True), crs=crs)
    out["key"] = out["name"].map(school_key)
    out = out[out["key"] != ""]
    # a mesma escola às vezes está no OSM como ponto e como área: fica uma só se estiverem a até 300 m
    keep = []
    for _, group in out.groupby("key"):
        first = group.geometry.iloc[0]
        keep.extend(group.index[[0]] if group.distance(first).max() <= 300 else group.index)
    return out.loc[sorted(keep)].reset_index(drop=True)


def load_osm_addresses(bbox: tuple, crs: str) -> gpd.GeoDataFrame:
    pts = osm("points", bbox, ["other_tags"], "other_tags LIKE '%addr:housenumber%'", crs)
    street = pts["other_tags"].str.extract(r'"addr:street"=>"([^"]*)"')[0]
    number = pts["other_tags"].str.extract(r'"addr:housenumber"=>"([^"]*)"')[0]
    out = gpd.GeoDataFrame({"street": street.map(street_key), "number": number.map(house_number)},
                           geometry=pts.geometry.values, crs=crs)
    return out[(out["street"] != "") & out["number"].notna()].reset_index(drop=True)


def load_osm_streets(bbox: tuple, crs: str) -> gpd.GeoDataFrame:
    lines = osm("lines", bbox, ["name", "highway"], "highway IS NOT NULL AND name IS NOT NULL", crs)
    lines["street"] = lines["name"].map(street_key)
    return lines[lines["street"] != ""].reset_index(drop=True)


def load_osm_places(bbox: tuple, crs: str) -> gpd.GeoDataFrame:
    places = osm("points", bbox, ["name", "place"], "place IN ('suburb','neighbourhood','quarter') AND name IS NOT NULL", crs)
    places["key"] = places["name"].map(place_key)
    return places


# ---------------------------------------------------------------- ligação

def match_names(inep_keys: pd.Series, osm_keys: pd.Series) -> dict[int, tuple[int, float]]:
    """Casa nomes por "melhor amigo mútuo": a escola A do INEP escolhe a B do OSM e a B escolhe a A.

    Só vale se a semelhança passar do mínimo e o melhor candidato ganhar com folga do segundo,
    para não casar duas escolas diferentes que têm nomes parecidos.
    """
    if inep_keys.empty or osm_keys.empty:
        return {}  # cidade sem escolas com nome no OSM: todas vão para as etapas de endereço e rua
    scores = pd.DataFrame([[similarity(a, b) for b in osm_keys] for a in inep_keys],
                          index=inep_keys.index, columns=osm_keys.index)
    matches = {}
    for i, row in scores.iterrows():
        ranked = row.sort_values(ascending=False)
        best_j, best = ranked.index[0], ranked.iloc[0]
        second = ranked.iloc[1] if len(ranked) > 1 else 0.0
        if best < NAME_THRESHOLD or best - second < NAME_MARGIN:
            continue
        column = scores[best_j].sort_values(ascending=False)
        if column.index[0] != i or (len(column) > 1 and column.iloc[0] - column.iloc[1] < NAME_MARGIN):
            continue  # a escola do OSM prefere outra do INEP, ou não sabe escolher entre duas
        matches[i] = (best_j, float(best))
    return matches


def locate(schools: pd.DataFrame, osm_schools: gpd.GeoDataFrame, addresses: gpd.GeoDataFrame,
           streets: gpd.GeoDataFrame, places: gpd.GeoDataFrame, crs: str) -> gpd.GeoDataFrame:
    schools = schools.copy()
    schools["key"] = schools["NO_ENTIDADE"].map(school_key)
    schools["street"] = schools["DS_ENDERECO"].map(street_key)
    schools["number"] = schools["NU_ENDERECO"].map(house_number)
    schools["bairro"] = schools["NO_BAIRRO"].map(place_key)
    by_name = match_names(schools["key"], osm_schools["key"])
    place_points = places.groupby("key").geometry.first()

    methods, points, scores = [], [], []
    for i, s in schools.iterrows():
        method, point, score = "sem local", None, None
        same_street = addresses[addresses["street"] == s["street"]] if s["street"] else addresses.iloc[0:0]
        if i in by_name:
            j, score = by_name[i]
            method, point = "nome", osm_schools.geometry[j]
        elif pd.notna(s["number"]) and (same_street["number"] == s["number"]).any():
            method, point = "endereço", same_street[same_street["number"] == s["number"]].geometry.iloc[0]
        elif pd.notna(s["number"]) and not same_street.empty and \
                (same_street["number"] - s["number"]).abs().min() <= NUMBER_TOLERANCE:
            nearest = (same_street["number"] - s["number"]).abs().idxmin()
            method, point = "número próximo", same_street.geometry[nearest]
        elif s["street"]:
            segments = streets[streets["street"] == s["street"]]
            if not segments.empty:
                anchor = place_points.get(s["bairro"])
                if anchor is not None:
                    line = segments.geometry.iloc[segments.distance(anchor).argmin()]
                    method, point = "rua e bairro", nearest_points(line, anchor)[0]
                else:
                    minx, miny, maxx, maxy = segments.total_bounds
                    if max(maxx - minx, maxy - miny) <= SHORT_STREET_M:
                        method, point = "rua e bairro", segments.geometry.union_all().centroid
        methods.append(method)
        points.append(point)
        scores.append(score)
    schools["method"] = methods
    schools["name_score"] = scores
    return gpd.GeoDataFrame(schools, geometry=points, crs=crs)


def locate_city(city: dict, bbox: tuple, crs: str) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """Escolas em atividade da cidade, localizadas; devolve também os endereços do OSM (para o relatório)."""
    addresses = load_osm_addresses(bbox, crs)
    located = locate(load_inep_schools(city["codigo_ibge"]), load_osm_schools(bbox, crs), addresses,
                     load_osm_streets(bbox, crs), load_osm_places(bbox, crs), crs)
    return located, addresses


# ---------------------------------------------------------------- relatório

def report(located: gpd.GeoDataFrame, addresses: gpd.GeoDataFrame) -> None:
    n = len(located)
    print(f"\nescolas em atividade no INEP: {n}")
    for method, count in located["method"].value_counts().items():
        print(f"  {method:<15} {count:>4}  ({count / n:.0%})")
    # conferência: nas escolas achadas pelo nome que também têm endereço exato no OSM, os dois pontos batem?
    by_name = located[located["method"] == "nome"]
    gaps = []
    for _, s in by_name.iterrows():
        same = addresses[(addresses["street"] == s["street"]) & (addresses["number"] == s["number"])]
        if not same.empty:
            gaps.append(same.geometry.iloc[0].distance(s.geometry))
    if gaps:
        gaps = pd.Series(gaps)
        print(f"\nconferência nome × endereço ({len(gaps)} escolas com os dois): "
              f"mediana {gaps.median():.0f} m, {(gaps <= 300).mean():.0%} a até 300 m")
    low = by_name[by_name["name_score"] < 0.95]
    if not low.empty:
        print(f"casamentos por nome com semelhança entre {NAME_THRESHOLD} e 0,95: {len(low)} (conferir à mão)")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("uso: uv run python pipeline/locate_schools.py <cidade>   (ex.: sorocaba)")
    sys.path.insert(0, str(ROOT / "pipeline"))
    from build_city import load_toml

    key = sys.argv[1]
    city = load_toml(ROOT / "config" / "cidades" / f"{key}.toml")
    crs = city["crs_metrico"]
    sectors = gpd.read_file(ROOT / "dados" / "limpo" / key / "setores.gpkg").to_crs(crs)
    minx, miny, maxx, maxy = sectors.total_bounds
    bbox = tuple(gpd.GeoSeries([box(minx - 1500, miny - 1500, maxx + 1500, maxy + 1500)], crs=crs).to_crs(4326).total_bounds)

    located, addresses = locate_city(city, bbox, crs)
    report(located, addresses)

    out = ROOT / "dados" / "limpo" / key / "escolas.gpkg"
    keep = located[located.geometry.notna()][["CO_ENTIDADE", "TP_DEPENDENCIA", "method", "geometry"]]
    pyogrio.write_dataframe(keep, out)
    print(f"\ngravado: {out.relative_to(ROOT).as_posix()} ({len(keep)} escolas com local)")


if __name__ == "__main__":
    main()
