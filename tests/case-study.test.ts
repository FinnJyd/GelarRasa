import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { record } from '../dashboard/src/shared/parse';
import { parseNetwork, rankNetwork } from '../dashboard/src/features/recommendations/network';
import { parseHealth, validateHealthLag } from '../dashboard/src/features/health/load';
import { responseMatrix } from '../dashboard/src/features/health/response-matrix';
import { healthInsights } from '../dashboard/src/features/health/insights';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { parseDashboard } from '../dashboard/src/data/validate';
import { summarizeHealth } from '../dashboard/src/features/health/model';

const read = (name: string): unknown => JSON.parse(readFileSync(name, 'utf8'));
const network = parseNetwork(read('dataset/dashboard/network_rank.json'));
const health = parseHealth(read('dataset/dashboard/health_outcomes.json'), read('dataset/dashboard/health_exposure.json'));
const catalog = parseDashboard(read('dashboard/tab1_ikhtisar.json'), read('dashboard/data/station_catalog.json')).stations;
const codes = catalog.map(station => station.code), all = defaultFilters();
const close = (a: number, b: number): void => assert.ok(Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('expansion weights normalize against the full catalog and never fabricate new coordinates', () => {
  const distances = rankNetwork(network, codes, [0, 0, 1]); assert.equal(distances[0]?.site.code, 'AQMS-MER-01'); assert.equal(distances[0]?.score, 100);
  const traffic = rankNetwork(network, codes, [0, 1, 0]); assert.notEqual(traffic[0]?.site.code, distances[0]?.site.code);
  const selected = rankNetwork(network, ['AQMS-MER-01'], [0, 0, 10]); assert.equal(selected[0]?.score, distances[0]?.score);
  assert.deepEqual(rankNetwork(network, codes, [0, 0, 0]), []); assert.deepEqual(rankNetwork(network, codes, [-1, 1, 1]), []);
  assert.equal(network.length, 27); assert.ok(network.every(site => codes.includes(site.code)));
  assert.throws(() => parseNetwork({ version: 1, sites: [{ code: 'AQMS-X-01', baseline: NaN }] }));
});

test('health insights keep episode windows and capacity strain explicit under sparse periods', () => {
  const result = summarizeHealth(health, catalog, all, 'resp');
  assert.equal(result.episodes.changes.length, 11); assert.ok(result.episodes.events >= 3);
  const actual = Object.values(health.stations).reduce((sum, station) => sum + (station.outcomes.resp[0] ?? 0) + (station.outcomes.cvd[0] ?? 0), 0) / 6280 * 100;
  close(result.strain[0] ?? NaN, actual);
  const one = summarizeHealth(health, catalog, { ...all, startDate: '2026-10-14', endDate: '2026-10-14' }, 'resp');
  assert.equal(one.episodes.events, 0); assert.ok(one.episodes.changes.every(n => n === null));
  const unscaled = summarizeHealth(health, catalog, { ...all, station: 'AQMS-BJB-01' }, 'resp'); assert.ok(unscaled.strainPeak !== null);
});

test('episode windows do not overlap and a zero pre-episode baseline cannot invent percentages', () => {
  const source = health.stations['AQMS-JKT-01']; assert.ok(source);
  const dates = health.dates.slice(0, 120), exposure = dates.map((_, i) => i % 12 === 5 ? 100 : 10), counts = dates.map((_, i) => i % 12 === 5 ? 20 : 10);
  const fixture = { ...source, references: { ...source.references, v: { ...source.references.v, pm25: { count: 120, p25: 10, p75: 10, p90: 10 } } }, exposure: { ...source.exposure, v: { ...source.exposure.v, pm25: exposure } }, outcomes: { ...source.outcomes, resp: counts } };
  const result = healthInsights([fixture], dates.map((_, i) => i), 'pm25', 'v', 'resp');
  assert.ok(result.episodes.events >= 3); close(result.episodes.changes[3] ?? NaN, 100); close(result.episodes.admissions[3] ?? NaN, 20);
  const zero = healthInsights([{ ...fixture, outcomes: { ...fixture.outcomes, resp: dates.map(() => 0) } }], dates.map((_, i) => i), 'pm25', 'v', 'resp');
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


