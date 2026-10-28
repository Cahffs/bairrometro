"""Testes da ligação de registros entre escolas do INEP e do OpenStreetMap. Rodar: uv run pytest"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from locate_schools import house_number, match_names, school_key, similarity, street_key


def test_nome_de_escola_sem_palavras_genericas():
    # INEP em maiúsculas com abreviação × OSM por extenso: a mesma chave
    assert school_key("EM PROFA RENICE SERAPHIM") == school_key("Escola Municipal Professora Renice Seraphim")
    assert school_key("CEI 53 BENJAMIN FELIPE GRIZZI") == "53 BENJAMIN FELIPE GRIZZI"
    # sigla com pontos é a mesma palavra que sem pontos
    assert school_key("C.E.I. 12 - João Prado") == school_key("CEI 12 JOAO PRADO")
    assert school_key("E.E. Ana Lima") == school_key("EE ANA LIMA")


def test_rua_sem_tipo_e_com_abreviacao_expandida():
    assert street_key("Avenida Doutor Afonso Vergueiro") == street_key("AV DR AFONSO VERGUEIRO")
    assert street_key("Rua da Penha") == "PENHA"


def test_numero_da_casa():
    assert house_number("123A") == 123
    assert house_number("s/n") is None


def test_semelhanca():
    assert similarity("JOSE SILVA", "JOSE SILVA") == 1.0
    assert similarity("", "JOSE") == 0.0


def test_casa_so_quando_os_dois_lados_concordam():
    inep = pd.Series({0: school_key("EE JOSE ODIN DE ARRUDA"), 1: school_key("COLEGIO OBJETIVO"),
                      2: school_key("COLEGIO OBJETIVO SOROCABA"), 3: school_key("COLEGIO ANGLO UNIDADE II")})
    osm = pd.Series({10: school_key("Escola Estadual José Odin de Arruda"), 11: school_key("Colégio Objetivo"),
                     12: school_key("Colégio Anglo")})
    matches = match_names(inep, osm)
    assert matches[0][0] == 10
    # duas escolas do INEP com a mesma chave ("OBJETIVO"): não dá para saber qual é a do OSM
    assert 1 not in matches and 2 not in matches
    # "ANGLO II" × "ANGLO": semelhança abaixo do mínimo, não casa
    assert 3 not in matches


def test_sem_escolas_no_osm_nao_quebra():
    assert match_names(pd.Series({0: "JOSE SILVA"}), pd.Series(dtype=str)) == {}
