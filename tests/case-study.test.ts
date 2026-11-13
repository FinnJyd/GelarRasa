import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { expectedAdmissions, parseLagData, record, list, finite, scenarioDomain } from '../dashboard/src/shared/lag-model';
import { parseNetwork, rankNetwork } from '../dashboard/src/features/recommendations/network';
import { parseHealth, validateHealthLag } from '../dashboard/src/features/health/load';
import { responseMatrix } from '../dashboard/src/features/health/response-matrix';
import { healthInsights } from '../dashboard/src/features/health/insights';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { parseDashboard } from '../dashboard/src/data/validate';
import { summarizeHealth } from '../dashboard/src/features/health/model';

const read = (name: string): unknown => JSON.parse(readFileSync(name, 'utf8'));
const modelSource = read('dataset/dashboard/model_coef.json'), model = parseLagData(modelSource);
const network = parseNetwork(read('dataset/dashboard/network_rank.json'));
const health = parseHealth(read('dataset/dashboard/health_outcomes.json'), read('dataset/dashboard/health_exposure.json'));
const catalog = parseDashboard(read('dashboard/tab1_ikhtisar.json'), read('dashboard/data/station_catalog.json')).stations;
const codes = catalog.map(station => station.code), all = defaultFilters();
const close = (a: number, b: number): void => assert.ok(Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('browser model predictions and full-covariance intervals match independent NumPy audit', () => {
  const audit = record(read('dataset/processed/model_validation.json'));
  for (const value of list(audit['checks'])) {
    const check = record(value), mode = check['mode'], target = check['target'];
    assert.ok(mode === 'v' || mode === 's'); assert.ok(target === 'young' || target === 'older');
    const selected = list(check['codes']).map(value => { assert.equal(typeof value, 'string'); return String(value); });
    const domain = scenarioDomain(model.models[mode], selected); assert.ok(domain);
    close(domain.reference, finite(check['reference'])); close(domain.min, finite(check['min'])); close(domain.max, finite(check['max']));
    const result = expectedAdmissions(model.models[mode].outcomes[target], selected, finite(check['delta'])); assert.ok(result);
    close(result.mean, finite(check['mean'])); close(result.lower, finite(check['lower'])); close(result.upper, finite(check['upper']));
    assert.ok(result.lower <= result.mean && result.mean <= result.upper);
  }
});

test('model reports failed extrapolation instead of hiding test rows or permitting unsupported scenarios', () => {
  for (const mode of ['v', 's'] as const) {
    const spec = model.models[mode], domain = scenarioDomain(spec, codes); assert.ok(domain); assert.equal(domain.codes.length, 24);
    for (const fit of [spec.outcomes.young, spec.outcomes.older]) {
      assert.equal(fit.supportedTestRows + fit.excludedTestRows, fit.testRows);
      assert.ok(fit.test.mae > fit.baseline.mae); assert.ok(fit.excludedTestRows > 0);
      assert.equal(expectedAdmissions(fit, domain.codes, domain.max - domain.reference + 1), null);
    }
    assert.ok(scenarioDomain(spec, ['AQMS-BJB-01']));
    assert.equal(scenarioDomain(spec, ['AQMS-MER-01']), null);
  }
  const fit = model.models.v.outcomes.young;
  assert.equal(expectedAdmissions({ ...fit, covariance: fit.covariance.map(row => row.map(() => Number.MAX_VALUE)) }, Object.keys(fit.references), 0), null);
  const raw = record(modelSource); assert.throws(() => parseLagData({ ...raw, train: ['2024-01-01', '2026-10-14'] }), /waktu/);
  assert.throws(() => parseLagData({ ...raw, version: 2 }), /Versi/);
});

test('expansion weights normalize against the full catalog and never fabricate new coordinates', () => {
  const distances = rankNetwork(network, codes, [0, 0, 1]); assert.equal(distances[0]?.site.code, 'AQMS-MER-01'); assert.equal(distances[0]?.score, 100);
  const traffic = rankNetwork(network, codes, [0, 1, 0]); assert.notEqual(traffic[0]?.site.code, distances[0]?.site.code);
  const selected = rankNetwork(network, ['AQMS-MER-01'], [0, 0, 10]); assert.equal(selected[0]?.score, distances[0]?.score);
  assert.deepEqual(rankNetwork(network, codes, [0, 0, 0]), []); assert.deepEqual(rankNetwork(network, codes, [-1, 1, 1]), []);
  assert.equal(network.length, 27); assert.ok(network.every(site => codes.includes(site.code)));
  assert.throws(() => parseNetwork({ version: 1, sites: [{ code: 'AQMS-X-01', baseline: NaN }] }));
});

test('health insights preserve separate age diagnoses and explicitly handle sparse periods', () => {
  const result = summarizeHealth(health, catalog, all, 'resp'); assert.equal(result.ages.length, 4);
  assert.ok(result.ages.every(row => row.change !== null && row.hospitals > 0));
  assert.match(result.ages[2]?.label ?? '', /semua usia/);
  assert.equal(result.episodes.changes.length, 11); assert.ok(result.episodes.events >= 3);
  const actual = Object.values(health.stations).reduce((sum, station) => sum + (station.outcomes.resp[0] ?? 0) + (station.outcomes.cvd[0] ?? 0), 0) / 6280 * 100;
  close(result.strain[0] ?? NaN, actual);
  const one = summarizeHealth(health, catalog, { ...all, startDate: '2026-10-14', endDate: '2026-10-14' }, 'resp');
  assert.equal(one.episodes.events, 0); assert.ok(one.episodes.changes.every(n => n === null));
  assert.ok(one.ages.every(row => row.change === null));
  const unscaled = summarizeHealth(health, catalog, { ...all, station: 'AQMS-BJB-01' }, 'resp'); assert.ok(unscaled.ages.every(row => row.change === null)); assert.ok(unscaled.strainPeak !== null);
});

test('episode windows do not overlap and a zero pre-episode baseline cannot invent percentages', () => {
  const source = health.stations['AQMS-JKT-01']; assert.ok(source);
  const dates = health.dates.slice(0, 120), exposure = dates.map((_, i) => i % 12 === 5 ? 100 : 10), counts = dates.map((_, i) => i % 12 === 5 ? 20 : 10);
  const fixture = { ...source, references: { ...source.references, v: { ...source.references.v, pm25: { count: 120, p25: 10, p75: 10, p90: 10 } } }, exposure: { ...source.exposure, v: { ...source.exposure.v, pm25: exposure } }, outcomes: { ...source.outcomes, resp: counts } };
  const result = healthInsights([fixture], dates, dates.map((_, i) => i), 'pm25', 'v', 'resp');
  assert.ok(result.episodes.events >= 3); close(result.episodes.changes[3] ?? NaN, 100); close(result.episodes.admissions[3] ?? NaN, 20);
  const zero = healthInsights([{ ...fixture, outcomes: { ...fixture.outcomes, resp: dates.map(() => 0) } }], dates, dates.map((_, i) => i), 'pm25', 'v', 'resp');
  assert.equal(zero.episodes.events, 0);
});

test('response matrix follows dates and QC with fixed per-station references and no clinical thresholds', () => {
  const matrix = responseMatrix(health, codes, all); assert.equal(matrix.rows.length, 4); assert.ok(matrix.rows.every(row => row.hospitals > 0));
  const sparse = responseMatrix(health, ['AQMS-BJB-01'], all); assert.ok(sparse.rows.every(row => row.young === null && row.older === null));
  const short = responseMatrix(health, codes, { ...all, startDate: '2026-10-14', endDate: '2026-10-14' }); assert.ok(short.rows.every(row => row.hospitals === 0));
});


test('offline health_lag references match validated exposure with explicit rejection of stale outputs', () => {
  const raw = read('dataset/dashboard/health_lag.json'); validateHealthLag(health, raw);
  const invalid = record(raw); assert.throws(() => validateHealthLag(health, { ...invalid, referenceYear: 2025 }), /health_lag/);
});


test('model validation rejects malformed covariance and missing fitted hospital profiles', () => {
  const source = record(modelSource), modes = record(source['models']), mode = record(modes['v']), outcomes = record(mode['outcomes']), fit = record(outcomes['young']);
  const corrupt = (patch: Record<string, unknown>): unknown => ({ ...source, models: { ...modes, v: { ...mode, outcomes: { ...outcomes, young: { ...fit, ...patch } } } } });
  assert.throws(() => parseLagData(corrupt({ covariance: [[1]] })), /kovarians/);
  assert.throws(() => parseLagData(corrupt({ references: {} })), /Cakupan/);
});
