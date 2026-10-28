"""Testes das funções puras do tratamento. Rodar: uv run pytest"""

import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import box

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from build_city import classify_poi, merge_small_neighborhoods, parse_tags, percent_ranks, slugify, to_number


def test_percentil_igual_ao_do_site():
    # mesma regra do scoring.js: empates recebem a posição média
    assert percent_ranks(pd.Series([10, 20, 20, 40])).round(1).tolist() == [0.0, 50.0, 50.0, 100.0]


def test_numeros_do_ibge():
    s = to_number(pd.Series(["336", "0,5393", "X", None]))
    assert s.iloc[0] == 336
    assert s.iloc[1] == pytest.approx(0.5393)
    assert pd.isna(s.iloc[2])  # "X" = dado sigiloso do IBGE
    assert pd.isna(s.iloc[3])


def test_tags_do_osm():
    tags = parse_tags('"amenity"=>"school","name"=>"E.E. Teste"')
    assert tags == {"amenity": "school", "name": "E.E. Teste"}
    assert parse_tags(None) == {}


@pytest.mark.parametrize(("tags", "highway", "esperado"), [
    ({"shop": "supermarket"}, None, "daily"),
    ({"amenity": "pharmacy"}, None, "daily"),
    ({"amenity": "kindergarten"}, None, "education"),
    ({"healthcare": "clinic"}, None, "health"),
    ({}, "bus_stop", "mobility"),
    ({"leisure": "park"}, None, "green"),
    ({"amenity": "nightclub"}, None, "nightlife"),
    ({"amenity": "bench"}, None, None),
])
def test_categorias(tags, highway, esperado):
    assert classify_poi(tags, highway) == esperado


def test_slug():
    assert slugify("Jardim São Paulo") == "jardim-sao-paulo"
    assert slugify("Além Ponte") == "alem-ponte"


def _bairros(rows):
    """Setores de teste: (nome, população, xmin, ymin, xmax, ymax), em metros."""
    return gpd.GeoDataFrame(
        {"CD_SETOR": [str(i) for i in range(len(rows))], "neighborhood": [r[0] for r in rows],
         "population": [r[1] for r in rows]},
        geometry=[box(*r[2:]) for r in rows], crs="EPSG:31983",
    )


def test_junta_bairro_pequeno_ao_vizinho_com_maior_fronteira():
    # B (300) encosta em A por 1.000 m e em C por 500 m: vai para A
    sectors = _bairros([
        ("A", 2000, 0, 0, 2000, 1000),
        ("B", 300, 2000, 0, 3000, 1000),
        ("C", 2500, 3000, 500, 4000, 1000),
    ])
    out = merge_small_neighborhoods(sectors, 1000)
    assert out["neighborhood"].tolist() == ["A", "A", "C"]
    assert out["original_name"].tolist() == ["A", "B", "C"]


def test_junta_em_cadeia_e_deixa_isolado_como_esta():
    # X (200) vai para Y (500); X+Y = 700 ainda é pequeno e vai para Z. W não tem vizinho.
    sectors = _bairros([
        ("X", 200, 0, 0, 1000, 1000),
        ("Y", 500, 1000, 0, 2000, 1000),
        ("Z", 3000, 2000, 0, 3000, 1000),
        ("W", 400, 9000, 9000, 9500, 9500),
    ])
    out = merge_small_neighborhoods(sectors, 1000)
    assert out["neighborhood"].tolist() == ["Z", "Z", "Z", "W"]

