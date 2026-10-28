// Testes do cálculo das notas. Rodar na raiz do projeto:
//   node --test tests/site/scoring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  percentRanks, qualityScore, fitLine, bandOf, startingWeights,
  paretoFrontier, priceToRentYears, scoreCity, MIN_LISTINGS,
} from '../../site/assets/js/scoring.js';

const close = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('percentil: empates recebem a posição média', () => {
  assert.deepEqual(percentRanks([10, 20, 20, 40]).map((x) => Math.round(x * 10) / 10), [0, 50, 50, 100]);
});

test('qualidade: média ponderada e pesos zero ignorados', () => {
  const q = qualityScore({ a: 100, b: 0, c: 50 }, { a: 3, b: 1, c: 0 });
  close(q.score, 75);
  assert.equal(q.contributions.length, 2);
  assert.equal(q.contributions[0].id, 'a');
});

test('qualidade: todos os pesos em zero não geram nota', () => {
  assert.equal(qualityScore({ a: 80 }, { a: 0 }).score, null);
});

test('regressão: reproduz o exemplo do guia de estudos', () => {
  const q = [88, 82, 76, 71, 66, 63, 58, 52, 47, 41, 36, 30];
  const p = [42, 36, 37, 28, 31, 24, 30, 25, 21, 22, 17, 18];
  const fit = fitLine(q, p);
  close(fit.a, 3.91);
  close(fit.b, 0.40);
  close(fit.r2, 0.88);
});

test('faixas de nota (D022): arredonda antes de escolher', () => {
  assert.equal(bandOf(49.4).id, 'low');
  assert.equal(bandOf(49.5).id, 'mid');
  assert.equal(bandOf(79.4).id, 'mid');
  assert.equal(bandOf(79.5).id, 'high');
  assert.equal(bandOf(null), null);
});

test('pontos de partida: só aumentam e vale o maior peso', () => {
  const ids = ['daily', 'education', 'health', 'green', 'quiet'];
  const { weights } = startingWeights(ids, ['filhos', 'pet', 'semcarro']);
  assert.equal(weights.education, 5);
  assert.equal(weights.green, 5);   // filhos 4, pet 5 → 5
  assert.equal(weights.health, 4);
  assert.equal(weights.daily, 5);
  assert.equal(weights.quiet, 4);
  const base = startingWeights(ids, []);
  assert.ok(Object.values(base.weights).every((w) => w === 3));
});

test('fronteira: dominado sai, melhor qualidade fica mesmo caro', () => {
  const ids = paretoFrontier([
    { id: 'barato', x: 40, y: 15 }, { id: 'dominado', x: 35, y: 20 }, { id: 'caro', x: 90, y: 50 },
  ]);
  assert.deepEqual(ids.sort(), ['barato', 'caro']);
});

test('razão preço/aluguel em anos', () => {
  close(priceToRentYears(6000, 25), 20);
  assert.equal(priceToRentYears(0, 25), null);
});

test('cidade: poucos anúncios ficam sem custo-benefício e fora do ranking', () => {
  const mk = (id, q, price, n) => ({
    id, name: id, percentiles: { a: q }, price_m2: { rent: price, sale: price * 200 }, listings: { rent: n, sale: n },
  });
  const data = { neighborhoods: [mk('x', 20, 15, 10), mk('y', 50, 25, 10), mk('z', 80, 30, 10), mk('w', 60, 20, MIN_LISTINGS - 1)] };
  const res = scoreCity(data, { weights: { a: 3 }, deal: 'rent', emphasis: 0.5 });
  assert.equal(res.ranked.length, 3);
  assert.equal(res.unranked.length, 1);
  assert.equal(res.unranked[0].cb, null);
  assert.match(res.unranked[0].warnings[0], /poucos dados/);
  for (const r of res.ranked) close(r.final, 0.5 * r.quality + 0.5 * r.cb);
});
