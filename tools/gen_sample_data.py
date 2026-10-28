"""Gera os dados de EXEMPLO do site (bairros fictícios).

Serve para desenvolver e testar o site antes do pipeline de dados reais.
Nada aqui representa uma cidade de verdade. A semente fixa faz o arquivo
sair sempre igual (reprodutibilidade).

    python tools/gen_sample_data.py
"""

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests" / "site" / "exemplo.json"  # fora do site publicado
SEED = 42

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

NAMES = [
    "Alfa", "Beta", "Gama", "Delta", "Épsilon", "Zeta", "Eta", "Teta",
    "Iota", "Capa", "Lambda", "Mi", "Ni", "Csi", "Ômicron", "Pi",
]


def percent_ranks(values):
    """Percentil 0–100 dentro da cidade; empates recebem a posição média."""
    n = len(values)
    order = sorted(range(n), key=lambda i: values[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and values[order[j + 1]] == values[order[i]]:
            j += 1
        for k in range(i, j + 1):
            ranks[order[k]] = (i + j) / 2
        i = j + 1
    return [r / (n - 1) * 100 if n > 1 else 50.0 for r in ranks]


def main() -> None:
    rng = random.Random(SEED)
    hoods = []
    for name in NAMES:
        center = rng.random()   # quão central e movimentado
        green = rng.random()    # quão arborizado
        hoods.append({"name": name, "center": center, "green": green})

    # valores "brutos" fictícios de cada critério (maior = melhor)
    raw = {c["id"]: [] for c in CRITERIA}
    for h in hoods:
        c, g = h["center"], h["green"]
        raw["daily"].append(c + rng.gauss(0, 0.15))
        raw["education"].append(0.5 * c + 0.3 * g + rng.gauss(0, 0.2))
        raw["health"].append(0.8 * c + rng.gauss(0, 0.2))
        raw["mobility"].append(c + rng.gauss(0, 0.1))
        raw["safety"].append(-0.6 * c + 0.4 * g + rng.gauss(0, 0.2))
        raw["green"].append(g + rng.gauss(0, 0.1))
        raw["infrastructure"].append(0.6 * c + 0.2 * g + rng.gauss(0, 0.15))
        raw["quiet"].append(-c + 0.6 * g + rng.gauss(0, 0.15))

    pct = {cid: percent_ranks(vals) for cid, vals in raw.items()}

    neighborhoods = []
    for i, h in enumerate(hoods):
        percentiles = {cid: round(pct[cid][i], 1) for cid in pct}
        quality = sum(percentiles.values()) / len(percentiles)
        rent_m2 = 12 + 0.32 * quality + rng.gauss(0, 3.2)
        years = rng.uniform(14, 22)  # razão preço/aluguel fictícia
        sale_m2 = rent_m2 * 12 * years
        slug = (
            h["name"].lower()
            .replace("é", "e").replace("ô", "o").replace("ê", "e")
        )
        neighborhoods.append({
            "id": slug,
            "name": f"Bairro {h['name']}",
            "population": rng.randrange(3000, 30001, 100),
            "percentiles": percentiles,
            "price_m2": {"rent": round(rent_m2, 2), "sale": round(sale_m2)},
            "listings": {"rent": rng.randint(2, 40), "sale": rng.randint(1, 30)},
        })

    data = {
        "meta": {
            "city": "Cidade de exemplo",
            "city_code": "exemplo",
            "ibge_code": None,
            "sample": True,
            "note": "Dados fictícios, gerados por tools/gen_sample_data.py, para desenvolver o site. Não representam nenhuma cidade real.",
            "generated_by": "tools/gen_sample_data.py",
            "seed": SEED,
            "sources": [],
        },
        "criteria": CRITERIA,
        "neighborhoods": neighborhoods,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(neighborhoods)} bairros fictícios em {OUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
