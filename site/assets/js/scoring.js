// Cálculo das notas do Bairrômetro (regras de negócio, seções 4 e 5).
// Funções puras, sem tocar na página: assim dá para testar com `node --test`.

export const MIN_LISTINGS = 5;
export const BASE_WEIGHT = 3;
export const MAX_WEIGHT = 5;
export const DEFAULT_EMPHASIS = 0.5;

// Pontos de partida (seção 5): cada característica só AUMENTA pesos.
export const PRESETS = {
  filhos: {
    label: 'Com filhos',
    weights: { education: 5, safety: 5, health: 4, green: 4, infrastructure: 4 },
    why: {
      education: 'escola e creche perto encurtam o trajeto diário das crianças',
      safety: 'crianças circulam mais a pé pelo bairro',
      health: 'crianças vão ao médico com mais frequência',
      green: 'praças e parques são o quintal de quem mora com crianças',
      infrastructure: 'saneamento afeta diretamente a saúde infantil',
    },
  },
  pet: {
    label: 'Com pet',
    weights: { green: 5, quiet: 4 },
    why: {
      green: 'parques e praças para os passeios diários',
      quiet: 'menos trânsito intenso perto de casa deixa os passeios mais seguros',
    },
  },
  semcarro: {
    label: 'Sem carro',
    weights: { daily: 5, mobility: 5, health: 4 },
    why: {
      daily: 'as compras são feitas a pé',
      mobility: 'ônibus perto define a rotina',
      health: 'atendimento perto evita depender de transporte numa urgência',
    },
  },
};

// Faixas de nota (D022). A nota é arredondada antes de escolher a faixa.
export const BANDS = [
  { id: 'low', min: 0, max: 49, label: 'Nota baixa' },
  { id: 'mid', min: 50, max: 79, label: 'Nota intermediária' },
  { id: 'high', min: 80, max: 100, label: 'Nota alta' },
];

export function bandOf(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  const s = Math.round(score);
  return BANDS.find((b) => s >= b.min && s <= b.max) || null;
}

// Pesos iniciais: tudo em 3; com várias características, vale o MAIOR peso.
export function startingWeights(criteriaIds, flags = []) {
  const weights = {};
  const reasons = [];
  for (const id of criteriaIds) weights[id] = BASE_WEIGHT;
  for (const key of flags) {
    const preset = PRESETS[key];
    if (!preset) continue;
    for (const [id, w] of Object.entries(preset.weights)) {
      if (!(id in weights)) continue;
      if (w > weights[id]) weights[id] = w;
      reasons.push({ criterion: id, weight: w, preset: preset.label, text: preset.why[id] });
    }
  }
  // explica só o motivo que definiu o peso final de cada critério
  const final = reasons.filter((r) => r.weight === weights[r.criterion]);
  return { weights, reasons: dedupe(final) };
}

function dedupe(reasons) {
  const seen = new Set();
  return reasons.filter((r) => {
    const k = r.criterion;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Percentil 0–100; empates recebem a posição média.
export function percentRanks(values) {
  const n = values.length;
  if (n === 0) return [];
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = avg;
    i = j + 1;
  }
  return ranks.map((r) => (n > 1 ? (r / (n - 1)) * 100 : 50));
}

// Q = média dos percentis ponderada pelos pesos (seção 4.4).
// "impact" mede quanto cada critério puxa a nota para cima (+) ou para baixo (−) em relação a 50.
export function qualityScore(percentiles, weights) {
  let sumW = 0;
  let sum = 0;
  for (const [id, w] of Object.entries(weights)) {
    if (w > 0 && typeof percentiles[id] === 'number') {
      sumW += w;
      sum += w * percentiles[id];
    }
  }
  if (sumW === 0) return { score: null, contributions: [] };
  const contributions = Object.entries(weights)
    .filter(([id, w]) => w > 0 && typeof percentiles[id] === 'number')
    .map(([id, w]) => ({ id, weight: w, percentile: percentiles[id], impact: (w * (percentiles[id] - 50)) / sumW }))
    .sort((a, b) => b.impact - a.impact);
  return { score: sum / sumW, contributions };
}

// Regressão linear simples por mínimos quadrados: y = a + b·x.
export function fitLine(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  const a = my - b * mx;
  let ssr = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    ssr += (ys[i] - (a + b * xs[i])) ** 2;
    sst += (ys[i] - my) ** 2;
  }
  return { a, b, r2: sst === 0 ? 1 : 1 - ssr / sst, n };
}

// Fronteira de eficiência: ninguém tem qualidade ≥ e preço ≤, sendo melhor em um dos dois.
export function paretoFrontier(points) {
  return points
    .filter((p) => !points.some((o) => o !== p && o.x >= p.x && o.y <= p.y && (o.x > p.x || o.y < p.y)))
    .map((p) => p.id);
}

// Anos de aluguel que equivalem ao preço de compra (seção 7).
export function priceToRentYears(saleM2, rentM2) {
  if (!(saleM2 > 0 && rentM2 > 0)) return null;
  return saleM2 / (rentM2 * 12);
}

// Calcula tudo para uma cidade: qualidade, preço esperado, custo-benefício e nota final.
export function scoreCity(data, { weights, deal = 'rent', emphasis = DEFAULT_EMPHASIS }) {
  const rows = data.neighborhoods.map((n) => {
    const q = qualityScore(n.percentiles, weights);
    const price = n.price_m2 ? n.price_m2[deal] : null;
    const listings = n.listings ? n.listings[deal] || 0 : 0;
    const enough = price !== null && price !== undefined && listings >= MIN_LISTINGS;
    const listingsRent = n.listings ? n.listings.rent || 0 : 0;
    const listingsSale = n.listings ? n.listings.sale || 0 : 0;
    const years = listingsRent >= MIN_LISTINGS && listingsSale >= MIN_LISTINGS
      ? priceToRentYears(n.price_m2.sale, n.price_m2.rent)
      : null;
    return {
      id: n.id, name: n.name, population: n.population,
      quality: q.score, contributions: q.contributions,
      price, listings, enough, years,
      expected: null, diff: null, cb: null, final: null, band: null, warnings: [],
    };
  });

  const eligible = rows.filter((r) => r.enough && r.quality !== null);
  const fit = fitLine(eligible.map((r) => r.quality), eligible.map((r) => r.price));
  if (fit) {
    for (const r of eligible) {
      r.expected = fit.a + fit.b * r.quality;
      r.diff = r.expected > 0 ? (r.expected - r.price) / r.expected : null;
    }
    const withDiff = eligible.filter((r) => r.diff !== null);
    const cbs = percentRanks(withDiff.map((r) => r.diff));
    withDiff.forEach((r, i) => { r.cb = cbs[i]; });
  }

  for (const r of rows) {
    if (r.quality === null) {
      r.warnings.push('Sem nota: todos os pesos estão em zero.');
      continue;
    }
    if (!r.enough) {
      r.warnings.push(`Preço com poucos dados: menos de ${MIN_LISTINGS} anúncios. Sem nota de custo-benefício.`);
    } else if (r.cb === null) {
      r.warnings.push('Custo-benefício indisponível: poucos bairros com preço para comparar.');
    }
    r.final = r.cb === null ? null : (1 - emphasis) * r.quality + emphasis * r.cb;
    r.band = bandOf(r.final === null ? r.quality : r.final);
  }

  const ranked = rows.filter((r) => r.final !== null).sort((a, b) => b.final - a.final);
  const unranked = rows.filter((r) => r.final === null).sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1));
  ranked.forEach((r, i) => { r.rank = i + 1; });

  const frontier = paretoFrontier(eligible.map((r) => ({ id: r.id, x: r.quality, y: r.price })));
  return { ranked, unranked, fit, frontier };
}
