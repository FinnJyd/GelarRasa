import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters, filterStations, selectObservations, rankingGroups, summarize } from '../dashboard/src/features/overview/model';
import { hasMeasurements } from '../dashboard/src/data/observations';
import type { StationObservation } from '../dashboard/src/data/types';

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
  const stations = selectObservations(data.stations, state, data.cube);
  assert.ok(stations.length > 0);
  assert.ok(stations.every(station => station.region === state.region && station.siteType === state.siteType));
  const result = summarize(stations);
  assert.equal(result.distribution.reduce((total, category) => total + category.count, 0), stations.length);
  assert.equal(result.mean, stations.reduce((total, station) => total + (station.average ?? 0), 0) / stations.length);
  assert.equal(result.highest?.average, Math.max(...stations.map(station => station.average ?? 0)));
  assert.equal(result.exceedanceMean, stations.reduce((total, station) => total + (station.exceedance ?? 0), 0) / stations.length);
});

test('empty selections do not fall back to the full dataset or zero-valued averages', () => {
  const stations = selectObservations(data.stations, { ...defaultFilters(), region: 'unavailable' }, data.cube);
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
  assert.equal(data.nationalExceedance, 17.3);
  assert.deepEqual(data.reference, { daily: 55, annual: 15, whoAnnual: 5 });
  const invalid: unknown = JSON.parse(JSON.stringify(raw).replace('"pct_days_exceed_24h":17.3', '"pct_days_exceed_24h":101'));
  assert.throws(() => parseDashboard(invalid, catalog), /pct_days_exceed_24h/);
});

test('JMB-02 remains selected without becoming a zero-valued clean station', () => {
  for (const includeSuspect of [false, true]) {
    const all = selectObservations(data.stations, { ...defaultFilters(), includeSuspect }, data.cube);
    const missing = all.find(row => row.code === 'AQMS-JMB-02'); assert.ok(missing);
    assert.equal(all.length, 27); assert.equal(missing.measuredDays, 0); assert.equal(missing.periodDays, 1018);
    assert.equal(missing.average, null); assert.equal(missing.exceedance, null); assert.equal(missing.category, null);
    const measured = all.filter(hasMeasurements); const result = summarize(all);
    assert.equal(result.measured, measured.length);
    assert.equal(result.distribution.reduce((sum, item) => sum + item.count, 0), measured.length);
    assert.equal(result.mean, measured.reduce((sum, row) => sum + row.average, 0) / measured.length);
    const single = summarize([missing]);
    assert.equal(single.mean, null); assert.equal(single.exceedanceMean, null); assert.equal(single.highest, null);
    assert.ok(single.distribution.every(item => item.count === 0));
  }
});

test('partial coverage uses actual measured days and preserves genuine zero observations', () => {
  assert.ok(data.cube);
  const observations = selectObservations(data.stations, defaultFilters(), data.cube);
  const med = observations.find(row => row.code === 'AQMS-MDN-01'); assert.ok(med);
  const values = data.cube.stations[med.code]?.v['pm25']?.filter(value => value !== null) ?? [];
  assert.equal(med.measuredDays, values.length); assert.ok(med.measuredDays < med.periodDays);
  assert.equal(med.average, Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)));
  const source = data.cube.stations[med.code]; assert.ok(source);
  const cube = { ...data.cube, stations: { ...data.cube.stations, [med.code]: { ...source, v: { ...source.v, pm25: data.cube.dates.map(() => 0) } } } };
  const zero = selectObservations(data.stations, { ...defaultFilters(), station: med.code }, cube)[0]; assert.ok(zero);
  assert.equal(zero.average, 0); assert.equal(zero.exceedance, 0); assert.equal(zero.category, 'Baik');
  assert.equal(summarize([zero]).measured, 1);
});

test('unavailable series, unsupported units and empty dates keep station identities with null observations', () => {
  assert.ok(data.cube); const station = data.stations[0]; assert.ok(station);
  for (const state of [
    { ...defaultFilters(), startDate: '2026-10-15', endDate: '2026-10-16' },
    { ...defaultFilters(), startDate: '2026-10-14', endDate: '2024-01-01' },
  ]) {
    const result: StationObservation | undefined = selectObservations([station], state, data.cube)[0]; assert.ok(result);
    assert.equal(result.average, null); assert.equal(result.periodDays, 0);
  }
  const source = data.cube.stations[station.code]; assert.ok(source);
  const unsupported = { ...data.cube, stations: { ...data.cube.stations, [station.code]: { ...source, unavailable: ['pm25'] } } };
  const result = selectObservations([station], defaultFilters(), unsupported)[0]; assert.ok(result);
  assert.equal(result.code, station.code); assert.equal(result.average, null); assert.equal(result.unavailableReason, 'Satuan polutan belum didukung.');
  assert.equal(selectObservations([station], defaultFilters(), undefined)[0]?.average, null);
});
