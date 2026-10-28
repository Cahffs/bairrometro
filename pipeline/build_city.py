"""Tratamento: transforma a camada bruta nos dados prontos que o site lê.

    uv run python pipeline/build_city.py sorocaba

Camadas: bruto (dados/bruto) → limpo (dados/limpo/<cidade>) → pronto (site/data/<cidade>.json).

Etapas (regras de negócio, seção 4):
1. setores censitários da cidade (IBGE) com população e saneamento;
2. nome do bairro de cada setor: o bairro mais próximo marcado no OpenStreetMap (D030);
   bairros pequenos são juntados ao vizinho com a maior fronteira (D035);
3. serviços por perto: contagens num raio de 1 km de cada setor (D015), em metros (UTM);
   saúde vem do CNES (D037), escolas do INEP localizadas com o OSM (D039), o resto do OpenStreetMap;
4. ocorrências da SSP-SP a até 500 m de cada setor, só as naturezas da segurança (D032, D033);
   endereço e número do boletim são descartados na leitura (LGPD);
5. agregação por bairro com média ponderada pela população e percentis dentro da cidade;
6. grava dados/limpo/<cidade>/setores.gpkg e site/data/<cidade>.json (só agregados).
"""

import json
import re
import sys
import time
import tomllib
import unicodedata
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import pyogrio
from locate_schools import locate_city
from osm_extract import osm_layer as osm_cut
from python_calamine import CalamineWorkbook
from shapely.geometry import box

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "dados" / "bruto"
RADIUS_M = 1000          # "por perto" (D015)
NIGHTLIFE_RADIUS_M = 500
SAFETY_RADIUS_M = 500    # ocorrências "perto de casa" (D032)
MIN_POPULATION = 100     # bairros quase sem moradores (áreas industriais, comerciais) ficam de fora

CRITERIA = [
    {"id": "daily", "label": "Dia a dia", "direction": "higher"},
    {"id": "education", "label": "Educação", "direction": "higher"},
    {"id": "health", "label": "Saúde", "direction": "higher"},
    {"id": "mobility", "label": "Mobilidade", "direction": "higher"},
    {"id": "safety", "label": "Segurança", "direction": "higher"},
    {"id": "green", "label": "Lazer e verde", "direction": "higher"},
    {"id": "infrastructure", "label": "Infraestrutura", "direction": "higher"},
    {"id": "quiet", "label": "Sossego", "direction": "higher"},
]

TAG = re.compile(r'"([^"]+)"=>"((?:[^"\\]|\\.)*)"')


# ---------------------------------------------------------------- utilidades

def load_toml(path: Path) -> dict:
    with path.open("rb") as f:
        return tomllib.load(f)


def percent_ranks(values: pd.Series) -> pd.Series:
    """Percentil 0–100 dentro da cidade; empates recebem a posição média (mesma regra do site)."""
    n = values.notna().sum()
    if n <= 1:
        return pd.Series(50.0, index=values.index).where(values.notna())
    return (values.rank(method="average") - 1) / (n - 1) * 100


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")[:60] or "bairro"


def parse_tags(other_tags: str | None) -> dict:
    """Converte o campo other_tags do GDAL ('"amenity"=>"school",...') em dicionário."""
    return dict(TAG.findall(other_tags)) if isinstance(other_tags, str) else {}


def to_number(series: pd.Series) -> pd.Series:
    """Números do IBGE vêm como texto, com vírgula decimal e 'X' quando sigilosos."""
    return pd.to_numeric(series.str.replace(",", ".", regex=False), errors="coerce")


def read_ibge_csv(zip_name: str, key: str, columns: list[str], codes: set[str]) -> pd.DataFrame:
    """Lê só as colunas e os setores da cidade de um CSV nacional do IBGE (em pedaços, para caber na memória)."""
    with zipfile.ZipFile(RAW / "ibge_censo2022" / zip_name) as zf, zf.open(zf.namelist()[0]) as f:
        parts = [
            chunk[chunk[key].isin(codes)]
            for chunk in pd.read_csv(f, sep=";", dtype=str, usecols=[key, *columns],
                                     encoding="latin-1", chunksize=200_000)
        ]
    df = pd.concat(parts).rename(columns={key: "CD_SETOR"})
    for c in columns:
        df[c] = to_number(df[c])
    return df


# ---------------------------------------------------------------- etapas

def load_sectors(city: dict) -> gpd.GeoDataFrame:
    code = city["codigo_ibge"]
    if not code.isdigit():  # o valor entra num filtro SQL: só aceita dígitos
        raise SystemExit(f"codigo_ibge inválido: {code!r}")
    gpkg = RAW / "ibge_censo2022" / f"{city['uf']}_setores_CD2022.gpkg"
    sectors = pyogrio.read_dataframe(gpkg, where=f"CD_MUN = '{code}'", columns=["CD_SETOR", "SITUACAO"])
    sectors = sectors.to_crs(city["crs_metrico"])
    codes = set(sectors["CD_SETOR"])

    basic = read_ibge_csv("Agregados_por_setores_basico_BR_20260520.zip", "CD_SETOR", ["v0001"], codes)
    part1 = read_ibge_csv("Agregados_por_setores_caracteristicas_domicilio1_BR_20261021.zip",
                          "setor", ["V00001"], codes)
    part2 = read_ibge_csv("Agregados_por_setores_caracteristicas_domicilio2_BR_20250417.zip",
                          "setor", ["V00111", "V00309", "V00397", "V00398"], codes)
    sectors = sectors.merge(basic, on="CD_SETOR", how="left").merge(part1, on="CD_SETOR", how="left")
    sectors = sectors.merge(part2, on="CD_SETOR", how="left")
    sectors["population"] = sectors["v0001"].fillna(0)
    homes = sectors["V00001"].where(sectors["V00001"] > 0)
    sectors["water_share"] = sectors["V00111"] / homes
    sectors["sewer_share"] = sectors["V00309"] / homes
    sectors["garbage_share"] = (sectors["V00397"] + sectors["V00398"]) / homes
    sectors["sanitation"] = sectors[["water_share", "sewer_share", "garbage_share"]].mean(axis=1)
    sectors["point"] = sectors.representative_point()
    return sectors


def osm_layer(layer: str, bbox: tuple, columns: list[str], where: str) -> gpd.GeoDataFrame:
    return osm_cut(layer, bbox, columns, where)  # lê do recorte da cidade em cache (osm_extract.py)


def name_neighborhoods(sectors: gpd.GeoDataFrame, bbox: tuple, crs: str) -> gpd.GeoDataFrame:
    """D030: cada setor recebe o nome do bairro mais próximo marcado no OpenStreetMap."""
    places = osm_layer("points", bbox, ["name", "place"], "place IN ('suburb','neighbourhood','quarter')")
    places = places[places["name"].notna()].to_crs(crs)
    city_area = sectors.geometry.union_all()
    places = places[places.within(city_area)]
    points = gpd.GeoDataFrame(sectors[["CD_SETOR"]], geometry=sectors["point"], crs=crs)
    nearest = gpd.sjoin_nearest(points, places[["name", "geometry"]], how="left", distance_col="name_dist_m")
    nearest = nearest.drop_duplicates("CD_SETOR")[["CD_SETOR", "name", "name_dist_m"]]
    out = sectors.merge(nearest, on="CD_SETOR", how="left")
    out["neighborhood"] = out["name"].str.strip()
    print(f"  {len(places)} bairros do OSM dentro do município; {out['neighborhood'].nunique()} usados")
    return out


def merge_small_neighborhoods(sectors: gpd.GeoDataFrame, minimum: int) -> gpd.GeoDataFrame:
    """D035: junta cada bairro com menos de `minimum` moradores ao vizinho com quem divide a maior fronteira.

    Repete do menor para o maior até não sobrar bairro pequeno com vizinho. O nome original de cada
    setor fica em `original_name`, para a busca do site continuar achando os nomes absorvidos.
    """
    out = sectors.copy()
    out["original_name"] = out["neighborhood"]
    hoods = out.dissolve(by="neighborhood", aggfunc={"population": "sum"})
    shapes = hoods.geometry.to_dict()     # o mapa é dissolvido uma vez; a cada junção só o vizinho muda
    population = hoods["population"].to_dict()
    isolated = set()                      # bairro pequeno sem vizinho continua sem vizinho
    while True:
        small = sorted((p, name) for name, p in population.items() if p < minimum and name not in isolated)
        if not small:
            return out
        name = small[0][1]
        edge = shapes[name].buffer(1)     # 1 m de folga: setores vizinhos nem sempre encostam exatamente
        others = gpd.GeoSeries({n: g for n, g in shapes.items() if n != name})
        border = others.boundary.intersection(edge).length
        border = border[border > 0]
        if border.empty:
            isolated.add(name)
            continue
        target = border.idxmax()
        shapes[target] = shapes[target].union(shapes.pop(name))
        population[target] += population.pop(name)
        out.loc[out["neighborhood"] == name, "neighborhood"] = target


def classify_poi(tags: dict, highway: str | None) -> str | None:
    amenity, shop, leisure = tags.get("amenity"), tags.get("shop"), tags.get("leisure")
    healthcare = tags.get("healthcare")
    if shop in {"supermarket", "convenience", "bakery", "greengrocer", "butcher", "chemist"} or amenity == "pharmacy":
        return "daily"
    if amenity in {"school", "kindergarten"}:
        return "education"
    if amenity in {"clinic", "hospital", "doctors"} or healthcare in {"clinic", "hospital", "centre", "doctor"}:
        return "health"
    if highway == "bus_stop" or (tags.get("public_transport") == "platform" and tags.get("bus") == "yes"):
        return "mobility"
    if leisure in {"park", "playground", "garden", "fitness_station"}:
        return "green"
    if amenity in {"bar", "pub", "nightclub"}:
        return "nightlife"
    return None


def load_pois(bbox: tuple, crs: str) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """Estabelecimentos do OSM como pontos: nós e o centro das áreas (escolas e parques às vezes são áreas)."""
    pts = osm_layer("points", bbox, ["highway", "other_tags"], "other_tags IS NOT NULL OR highway = 'bus_stop'")
    pts["category"] = [classify_poi(parse_tags(t), h) for t, h in zip(pts["other_tags"], pts["highway"], strict=True)]
    areas = osm_layer("multipolygons", bbox, ["amenity", "shop", "leisure", "other_tags"],
                      "amenity IS NOT NULL OR shop IS NOT NULL OR leisure IS NOT NULL")
    area_tags = [
        {**parse_tags(t), **{k: v for k, v in (("amenity", a), ("shop", s), ("leisure", lz)) if v}}
        for t, a, s, lz in zip(areas["other_tags"], areas["amenity"], areas["shop"], areas["leisure"], strict=True)
    ]
    areas["category"] = [classify_poi(tags, None) for tags in area_tags]
    areas = areas.to_crs(crs)
    parks = areas[areas["category"] == "green"][["geometry"]].copy()
    areas["geometry"] = areas.representative_point()
    pois = pd.concat([pts.to_crs(crs)[["category", "geometry"]], areas[["category", "geometry"]]])
    pois = gpd.GeoDataFrame(pois[pois["category"].notna()], crs=crs)
    print("  pontos do OpenStreetMap por categoria (saúde e educação são trocadas pelo CNES e pelo INEP):",
          pois["category"].value_counts().to_dict())
    return pois, parks


def count_within(points_geom: gpd.GeoSeries, pois: gpd.GeoDataFrame, radius: float, keys: pd.Series) -> pd.DataFrame:
    buffers = gpd.GeoDataFrame({"CD_SETOR": keys.values}, geometry=points_geom.buffer(radius).values, crs=pois.crs)
    joined = gpd.sjoin(pois, buffers, predicate="within")
    return joined.groupby(["CD_SETOR", "category"]).size().unstack(fill_value=0)


def load_health_units(city: dict, types: set[int], crs: str) -> gpd.GeoDataFrame:
    """D037: unidades de saúde do CNES que atendem a população, ativas e com coordenadas.

    Só lê município, tipo, situação e coordenadas. Nome, razão social, CNPJ, telefone e e-mail
    nunca são lidos: o registro de um consultório de autônomo pode identificar a pessoa.
    """
    code = city["codigo_ibge"][:6]  # o CNES usa o código do município sem o dígito verificador
    columns = ["CO_IBGE", "TP_UNIDADE", "CO_MOTIVO_DESAB", "NU_LATITUDE", "NU_LONGITUDE"]
    with zipfile.ZipFile(RAW / "cnes_estabelecimentos" / "cnes_estabelecimentos_csv.zip") as zf, \
            zf.open(zf.namelist()[0]) as f:
        units = pd.concat(
            chunk[chunk["CO_IBGE"] == code]
            for chunk in pd.read_csv(f, sep=";", dtype=str, usecols=columns, encoding="latin-1", chunksize=200_000)
        )
    units = units[units["CO_MOTIVO_DESAB"].isna() & pd.to_numeric(units["TP_UNIDADE"], errors="coerce").isin(types)]
    lat, lon = to_number(units["NU_LATITUDE"]), to_number(units["NU_LONGITUDE"])
    ok = lat.notna() & lon.notna() & (lat != 0) & (lon != 0)
    print(f"  unidades de saúde do CNES: {len(units)} ativas dos tipos escolhidos, {int(ok.sum())} com coordenada")
    points = gpd.GeoDataFrame({"category": "health"}, index=units.index[ok],
                              geometry=gpd.points_from_xy(lon[ok], lat[ok]), crs="EPSG:4326")
    return points.to_crs(crs)


def add_nearby_indicators(sectors: gpd.GeoDataFrame, bbox: tuple, crs: str,
                          health: gpd.GeoDataFrame, schools: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    pois, parks = load_pois(bbox, crs)
    # saúde: o CNES substitui os pontos de saúde do OSM, que cobrem só cerca de um terço das unidades (D037);
    # educação: as escolas em atividade do INEP, localizadas com o OSM, substituem os pontos de escola (D039)
    official = pd.concat([health[["category", "geometry"]], schools.assign(category="education")[["category", "geometry"]]])
    pois = gpd.GeoDataFrame(pd.concat([pois[~pois["category"].isin(["health", "education"])], official]), crs=crs)
    counts = count_within(sectors["point"], pois[pois["category"] != "nightlife"], RADIUS_M, sectors["CD_SETOR"])
    night = count_within(sectors["point"], pois[pois["category"] == "nightlife"], NIGHTLIFE_RADIUS_M, sectors["CD_SETOR"])
    out = sectors.merge(counts, left_on="CD_SETOR", right_index=True, how="left")
    out = out.merge(night.rename(columns={"nightlife": "nightlife_500m"}), left_on="CD_SETOR", right_index=True, how="left")
    for c in ["daily", "education", "health", "mobility", "green", "nightlife_500m"]:
        if c not in out:
            out[c] = 0
        out[c] = out[c].fillna(0)

    # área de parques e praças a até 1 km (m²)
    buffers = gpd.GeoDataFrame({"CD_SETOR": out["CD_SETOR"]}, geometry=out["point"].buffer(RADIUS_M).values, crs=crs)
    inter = gpd.overlay(buffers, parks, how="intersection", keep_geom_type=True)
    out = out.merge(inter.assign(a=inter.area).groupby("CD_SETOR")["a"].sum().rename("park_area_m2"),
                    left_on="CD_SETOR", right_index=True, how="left")
    out["park_area_m2"] = out["park_area_m2"].fillna(0)

    # distância até a via movimentada mais próxima (sossego)
    roads = osm_layer("lines", bbox, ["highway"],
                      "highway IN ('motorway','trunk','primary','motorway_link','trunk_link','primary_link')").to_crs(crs)
    pts = gpd.GeoDataFrame({"CD_SETOR": out["CD_SETOR"]}, geometry=out["point"].values, crs=crs)
    near = gpd.sjoin_nearest(pts, roads[["geometry"]], distance_col="road_dist_m").drop_duplicates("CD_SETOR")
    return out.merge(near[["CD_SETOR", "road_dist_m"]], on="CD_SETOR", how="left")


def load_crimes(city: dict, natures: set[str]) -> pd.DataFrame:
    """Lê as planilhas da SSP-SP em fluxo, só as linhas da cidade e só data, natureza e coordenadas.

    NUM_BO, LOGRADOURO e NUMERO_LOGRADOURO nunca são guardados (podem identificar pessoas).
    Só entram as naturezas da segurança (D033). Ocorrência sem coordenada não é localizada de outro
    jeito: a SSP omite o local de crimes como os sexuais para proteger a vítima.
    """
    keep = []
    without_coords = other_natures = 0
    for year in city["anos_ocorrencias"]:
        wb = CalamineWorkbook.from_path(RAW / "ssp_sp_criminais" / f"SPDadosCriminais_{year}.xlsx")
        for sheet_name in wb.sheet_names:
            if sheet_name.startswith("CAMPOS"):
                continue
            rows = wb.get_sheet_by_name(sheet_name).iter_rows()
            header = [str(h).strip().upper() for h in next(rows)]
            ix = {name: header.index(name) for name in ("CD_IBGE", "LATITUDE", "LONGITUDE", "NATUREZA_APURADA")}
            for row in rows:
                if str(row[ix["CD_IBGE"]]).split(".")[0] != city["codigo_ibge"]:
                    continue
                nature = unicodedata.normalize("NFC", str(row[ix["NATUREZA_APURADA"]]).strip().upper())
                if nature not in natures:
                    other_natures += 1
                    continue
                lat = pd.to_numeric(str(row[ix["LATITUDE"]]).replace(",", "."), errors="coerce")
                lon = pd.to_numeric(str(row[ix["LONGITUDE"]]).replace(",", "."), errors="coerce")
                if pd.isna(lat) or pd.isna(lon) or lat == 0 or lon == 0:
                    without_coords += 1
                    continue
                keep.append((year, nature, lat, lon))
    df = pd.DataFrame(keep, columns=["year", "nature", "lat", "lon"])
    total = len(df) + without_coords
    print(f"  ocorrências da segurança na cidade: {total} ({without_coords} sem coordenadas, "
          f"{without_coords / max(total, 1):.0%}); {other_natures} de outras naturezas ficaram de fora")
    return df


def add_crimes(sectors: gpd.GeoDataFrame, crimes: pd.DataFrame, crs: str) -> gpd.GeoDataFrame:
    """D032: ocorrências a até 500 m de cada setor (onde as pessoas moram), no período todo."""
    pts = gpd.GeoDataFrame({"category": "crime"}, index=crimes.index,
                           geometry=gpd.points_from_xy(crimes["lon"], crimes["lat"]), crs="EPSG:4326").to_crs(crs)
    near = count_within(sectors["point"], pts, SAFETY_RADIUS_M, sectors["CD_SETOR"])
    out = sectors.merge(near.rename(columns={"crime": "crimes_500m"}), left_on="CD_SETOR", right_index=True, how="left")
    out["crimes_500m"] = out["crimes_500m"].fillna(0)
    return out


def weighted_mean(df: pd.DataFrame, col: str) -> float:
    ok = df[col].notna() & (df["population"] > 0)
    w = df.loc[ok, "population"]
    return float(np.average(df.loc[ok, col], weights=w)) if w.sum() > 0 else float("nan")


def aggregate(sectors: gpd.GeoDataFrame, years: int) -> pd.DataFrame:
    rows = []
    for name, g in sectors.groupby("neighborhood"):
        pop = g["population"].sum()
        rows.append({
            "name": name,
            "population": int(pop),
            "sectors": len(g),
            "daily": weighted_mean(g, "daily"),
            "education": weighted_mean(g, "education"),
            "health": weighted_mean(g, "health"),
            "mobility": weighted_mean(g, "mobility"),
            "green": weighted_mean(g, "park_area_m2"),
            "playgrounds_parks": weighted_mean(g, "green"),
            "infrastructure": weighted_mean(g, "sanitation"),
            "road_dist_m": weighted_mean(g, "road_dist_m"),
            "nightlife_500m": weighted_mean(g, "nightlife_500m"),
            "crimes_500m_year": weighted_mean(g, "crimes_500m") / years,
            "aliases": sorted(set(g["original_name"].dropna()) - {name}),
        })
    return pd.DataFrame(rows)


def build_json(city: dict, hoods: pd.DataFrame, excluded: int, minimum: int, schools: tuple[int, int]) -> dict:
    pct = pd.DataFrame(index=hoods.index)
    for c in ["daily", "education", "health", "mobility", "green", "infrastructure"]:
        pct[c] = percent_ranks(hoods[c])
    pct["safety"] = 100 - percent_ranks(hoods["crimes_500m_year"])
    quiet = (percent_ranks(hoods["road_dist_m"]) + (100 - percent_ranks(hoods["nightlife_500m"]))) / 2
    pct["quiet"] = percent_ranks(quiet)

    used, items = set(), []
    for i, h in hoods.iterrows():
        slug = slugify(h["name"])
        while slug in used:
            slug += "-2"
        used.add(slug)
        items.append({
            "id": slug,
            "name": h["name"],
            "aliases": h["aliases"],
            "alias_ids": [slugify(a) for a in h["aliases"]],
            "population": h["population"],
            "sectors": h["sectors"],
            "percentiles": {c: round(float(pct.at[i, c]), 1) for c in pct.columns},
            "raw": {
                "mercados_farmacias_padarias_1km": round(h["daily"], 1),
                "escolas_creches_1km": round(h["education"], 1),
                "unidades_saude_1km": round(h["health"], 1),
                "pontos_onibus_1km": round(h["mobility"], 1),
                "area_parques_pracas_1km_m2": round(h["green"]),
                "domicilios_saneamento_pct": round(h["infrastructure"] * 100, 1) if pd.notna(h["infrastructure"]) else None,
                "distancia_via_movimentada_m": round(h["road_dist_m"]),
                "bares_casas_noturnas_500m": round(h["nightlife_500m"], 1),
                "ocorrencias_500m_ano": round(h["crimes_500m_year"], 1),
            },
            "price_m2": {"rent": None, "sale": None},
            "listings": {"rent": 0, "sale": 0},
        })
    return {
        "meta": {
            "city": city["nome"],
            "city_code": city["codigo_ibge"],
            "ibge_code": city["codigo_ibge"],
            "sample": False,
            "prices_available": False,
            "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "generated_by": "pipeline/build_city.py",
            "sources": [
                "IBGE, Censo Demográfico 2022 (setores censitários e agregados)",
                "© OpenStreetMap contributors (ODbL), extrato da Geofabrik",
                "Ministério da Saúde, Cadastro Nacional de Estabelecimentos de Saúde (CNES)",
                "INEP, Censo Escolar da Educação Básica 2024",
                f"Secretaria da Segurança Pública de SP, dados criminais {min(city['anos_ocorrencias'])}–{max(city['anos_ocorrencias'])}",
            ],
            "notes": [
                "Bairros aproximados: cada setor censitário recebe o nome do bairro mais próximo no OpenStreetMap.",
                (f"Bairros com menos de {minimum} moradores foram juntados ao vizinho com a maior fronteira; "
                 "os nomes antigos continuam na busca."),
                f"Bairros com menos de {MIN_POPULATION} moradores ficam de fora ({excluded} nesta cidade).",
                ("Segurança conta furtos, roubos, agressões e homicídios registrados a até 500 m de casa; "
                 "acidentes de trânsito e apreensões de drogas e armas ficam de fora."),
                ("Violência sexual e parte da violência doméstica não entram: a SSP não publica o local, "
                 "para proteger a vítima."),
                "Segurança mede ocorrências registradas, não a criminalidade real (subnotificação).",
                ("Saúde conta UBS, postos, policlínicas, clínicas especializadas, hospitais, pronto-atendimento "
                 "e CAPS do CNES; consultórios isolados ficam de fora."),
                (f"Educação conta as escolas e creches em atividade do Censo Escolar (INEP), localizadas com os dados "
                 f"do OpenStreetMap: {schools[0]} de {schools[1]}; as outras ficaram sem local e não entram."),
                "Preços ainda não coletados: o ranking usa só a qualidade.",
            ],
            "license_note": "Dados derivados do OpenStreetMap: ODbL 1.0.",
        },
        "criteria": CRITERIA,
        "neighborhoods": items,
    }


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("uso: uv run python pipeline/build_city.py <cidade>   (ex.: sorocaba)")
    key = sys.argv[1]
    city = load_toml(ROOT / "config" / "cidades" / f"{key}.toml")
    sources = load_toml(ROOT / "config" / "fontes.toml")
    health_types = {int(t) for t in sources["cnes_estabelecimentos"]["tipos_unidade"]}
    natures = {unicodedata.normalize("NFC", n.upper()) for n in sources["ssp_sp_criminais"]["naturezas_seguranca"]}
    minimum = int(city["bairro_min_moradores"])
    crs = city["crs_metrico"]

    started = last = time.perf_counter()

    def step_done() -> None:
        nonlocal last
        now = time.perf_counter()
        print(f"  ({now - last:.0f} s)", flush=True)
        last = now

    print("1. setores e dados do IBGE")
    sectors = load_sectors(city)
    print(f"  {len(sectors)} setores, {int(sectors['population'].sum())} moradores")
    step_done()
    # caixa de recorte com 1,5 km de folga (em metros, no CRS métrico) para o raio de 1 km
    minx, miny, maxx, maxy = sectors.total_bounds
    frame = gpd.GeoSeries([box(minx - 1500, miny - 1500, maxx + 1500, maxy + 1500)], crs=crs)
    bbox = tuple(frame.to_crs(4326).total_bounds)

    print("2. nomes de bairro (OpenStreetMap)")
    sectors = name_neighborhoods(sectors, bbox, crs)
    sectors = merge_small_neighborhoods(sectors, minimum)
    print(f"  {sectors['neighborhood'].nunique()} bairros depois de juntar os com menos de {minimum} moradores")
    step_done()

    print("3. serviços por perto (OpenStreetMap, CNES e INEP)")
    located, _ = locate_city(city, bbox, crs)
    schools = located[located.geometry.notna()]
    print(f"  escolas do INEP: {len(located)} em atividade, {len(schools)} localizadas "
          f"({located['method'].value_counts().to_dict()})")
    sectors = add_nearby_indicators(sectors, bbox, crs, load_health_units(city, health_types, crs), schools)
    step_done()

    print("4. ocorrências (SSP-SP)")
    sectors = add_crimes(sectors, load_crimes(city, natures), crs)
    step_done()

    print("5. bairros e percentis")
    hoods = aggregate(sectors, len(city["anos_ocorrencias"]))
    excluded = int((hoods["population"] < MIN_POPULATION).sum())
    hoods = hoods[hoods["population"] >= MIN_POPULATION].reset_index(drop=True)
    print(f"  {len(hoods)} bairros com moradores ({excluded} com menos de {MIN_POPULATION} ficaram de fora)")

    print("6. gravando")
    clean_dir = ROOT / "dados" / "limpo" / key
    clean_dir.mkdir(parents=True, exist_ok=True)
    keep = ["CD_SETOR", "neighborhood", "original_name", "population", "sanitation", "daily", "education",
            "health", "mobility", "green", "park_area_m2", "road_dist_m", "nightlife_500m", "crimes_500m", "geometry"]
    pyogrio.write_dataframe(sectors[keep], clean_dir / "setores.gpkg")
    pyogrio.write_dataframe(schools[["CO_ENTIDADE", "TP_DEPENDENCIA", "method", "geometry"]], clean_dir / "escolas.gpkg")
    out = ROOT / "site" / "data" / f"{key}.json"
    out.write_text(json.dumps(build_json(city, hoods, excluded, minimum, (len(schools), len(located))), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"  {clean_dir.relative_to(ROOT).as_posix()}/setores.gpkg, escolas.gpkg e {out.relative_to(ROOT).as_posix()}")
    print(f"pronto em {time.perf_counter() - started:.0f} s")


if __name__ == "__main__":
    main()
