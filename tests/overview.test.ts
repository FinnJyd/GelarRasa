import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters, filterStations, rankingGroups, summarize } from '../dashboard/src/features/overview/model';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const raw = read('../dashboard/tab1_ikhtisar.json');
const catalog = read('../dashboard/data/station_catalog.json');
const data = parseDashboard(raw, catalog);

test('the supplied export matches the raw-master catalog without fabricated stations', () => {
  assert.equal(data.stations.length, 27);
  assert.equal(new Set(data.stations.map(station => station.code)).size, 27);
  const jakarta = filterStations(data.stations, { ...defaultFilters(), region: 'Jakarta' });
  assert.equal(jakarta.length, 3);
  assert.ok(jakarta.every(station => station.province === 'DKI Jakarta'));
});

test('combined filters produce the same population used by all overview summaries', () => {
  const state = { region: 'Bogor', siteType: 'Traffic / Roadside', station: 'all' };
  const stations = filterStations(data.stations, state);
  assert.ok(stations.length > 0);
  assert.ok(stations.every(station => station.region === state.region && station.siteType === state.siteType));
  const result = summarize(stations);
  assert.equal(result.distribution.reduce((total, category) => total + category.count, 0), stations.length);
  assert.equal(result.mean, stations.reduce((total, station) => total + station.average, 0) / stations.length);
  assert.equal(result.highest?.average, Math.max(...stations.map(station => station.average)));
  assert.equal(result.exceedanceMean, stations.reduce((total, station) => total + station.exceedance, 0) / stations.length);
});

test('empty selections do not fall back to the full dataset or zero-valued averages', () => {
  const stations = filterStations(data.stations, { ...defaultFilters(), region: 'unavailable' });
  const result = summarize(stations);
  assert.deepEqual(stations, []);
  assert.equal(result.mean, null);
  assert.equal(result.validMean, null);
  assert.equal(result.exceedanceMean, null);
  assert.equal(result.highest, null);
});

test('rankings remain ordered, disjoint, and bounded with small selections', () => {
  for (let length = 0; length <= data.stations.length; length++) {
    const selected = filterStations(data.stations.slice(0, length), defaultFilters());
    const { high, low } = rankingGroups(selected);
    assert.ok(high.length <= 10 && low.length <= 10);
    assert.equal(new Set([...high, ...low].map(station => station.code)).size, high.length + low.length);
    assert.ok(high.every((station, index) => !index || station.average <= (high[index - 1]?.average ?? Infinity)));
    assert.ok(low.every((station, index) => !index || station.average >= (low[index - 1]?.average ?? -Infinity)));
  }
});

test('invalid or missing exports fail validation rather than showing fallback observations', () => {
  assert.throws(() => parseDashboard(null, catalog));
  assert.throws(() => parseDashboard(raw, []), /Katalog/);
  const duplicateCatalog: unknown[] = Array.isArray(catalog) ? [...catalog, catalog[0]] : [];
  assert.throws(() => parseDashboard(raw, duplicateCatalog), /Duplikat/);
});

test('reference indicators read the export and reject invalid exceedance values', () => {
  assert.equal(data.nationalExceedance, 17.7);
  assert.deepEqual(data.reference, { daily: 55, annual: 15, whoAnnual: 5 });
  const invalid: unknown = JSON.parse(JSON.stringify(raw).replace('"pct_days_exceed_24h":17.7', '"pct_days_exceed_24h":101'));
  assert.throws(() => parseDashboard(invalid, catalog), /pct_days_exceed_24h/);
});
