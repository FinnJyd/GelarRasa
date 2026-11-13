import { defaultFilters } from '../dashboard/src/features/overview/model';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePolicy } from '../dashboard/src/features/recommendations/load';
import { distanceKm, summarizePolicy } from '../dashboard/src/features/recommendations/model';
import { recommendActions } from '../dashboard/src/features/recommendations/actions';
import { quantile, simulate } from '../dashboard/src/shared/admissions';
import { admissionBaseline } from '../dashboard/src/features/recommendations/planning';
import type { PolicyData } from '../dashboard/src/features/recommendations/types';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const context = read('dataset/dashboard/policy_context.json');
const exposure = read('dataset/dashboard/health_exposure.json');
const data = parsePolicy(context, exposure);
const summary = admissionBaseline(summarizePolicy(data, { ...defaultFilters(), region: 'all' }));
const close = (a: number, b: number): void => assert.ok(Math.abs(a - b) < 1e-8, `${a} differs from ${b}`);

test('policy baseline exactly reproduces raw daily respiratory admissions and recorded beds', { skip: existsSync('dataset/raw/health/HLT-01_health_outcomes_daily.csv') ? false : 'Raw committee data is not bundled in Git; run this audit with the supplied CSV present.' }, () => {
  const lines = readFileSync('dataset/raw/health/HLT-01_health_outcomes_daily.csv', 'utf8').trimEnd().split(/\r?\n/);
  const header = lines.shift()?.split(',') ?? [];
  const respIndex = header.indexOf('resp'), dateIndex = header.indexOf('date'), hospitalIndex = header.indexOf('hospital_id');
  assert.ok(respIndex >= 0 && dateIndex >= 0 && hospitalIndex >= 0);
  const hospitalDates = new Map<string, number>();
  const daily = new Map<string, number>();
  for (const line of lines) {
    const row = line.split(','); const date = row[dateIndex];
    if (!date || date < '2024-01-01' || date > '2026-10-14') continue;
    const n = Number(row[respIndex]); assert.ok(Number.isInteger(n) && n >= 0);
    const key = `${row[hospitalIndex]}|${date}`;
    assert.ok(!hospitalDates.has(key), 'Duplicate source hospital/date');
    hospitalDates.set(key, n);
    daily.set(date, (daily.get(date) ?? 0) + n);
  }
  assert.equal(daily.size, 1018);
  assert.equal(summary.days, daily.size);
  for (const station of data.stations) assert.deepEqual(station.admissions, data.dates.map(date => hospitalDates.get(`${station.hospital}|${date}`)));
  assert.equal(summary.beds, 6280);
  assert.equal(summary.average, 733191 / 1018);
  assert.equal(summary.p90, quantile([...daily.values()], .9));
  const scenario = simulate(summary, { baseline: 'mean', increase: 0, extraBeds: 0 });
  assert.ok(scenario);
  assert.equal(scenario.baseline, summary.average);
  assert.equal(scenario.admissions, scenario.baseline);
  assert.equal(scenario.load, scenario.baselineLoad);
});

test('scenario math is exact for both baseline statistics and assumptions are independent', () => {
  for (const baseline of ['mean', 'p90'] as const) {
    const input = baseline === 'mean' ? summary.average : summary.p90; assert.ok(input !== null);
    for (const increase of [0, .25, 25, 100, 200]) {
      const result = simulate(summary, { baseline, increase, extraBeds: 100 }); assert.ok(result);
      close(result.admissions, input * (1 + increase / 100));
      assert.equal(result.capacity, 6380);
      close(result.load, result.admissions / 6380 * 100);
      const noBeds = simulate(summary, { baseline, increase, extraBeds: 0 }); assert.ok(noBeds);
      assert.equal(noBeds.admissions, result.admissions);
      assert.ok(result.load <= noBeds.load);
    }
  }
});

test('P90 is calculated after summing same-day hospitals, not by summing percentiles', () => {
  const a = data.stations[0], b = data.stations[1]; assert.ok(a && b);
  const first = Array.from({ length: 40 }, (_, i) => i % 2 ? 100 : 0);
  const second = first.map(n => 100 - n);
  const fixture: PolicyData = { dates: data.dates.slice(0, 40), stations: [{ ...a, admissions: first }, { ...b, admissions: second }] };
  const result = admissionBaseline(summarizePolicy(fixture, { ...defaultFilters(), region: 'all' }));
  assert.equal(result.p90, 100);
  assert.equal(quantile(first, .9), 100);
  assert.equal(quantile(second, .9), 100);
});

test('policy planning follows the region lookup and retains the full observation calendar', () => {
  const local = admissionBaseline(summarizePolicy(data, { ...defaultFilters(), region: 'Jakarta' }));
  assert.equal(local.facilities, 3); assert.equal(local.days, 1018); assert.equal(local.beds, 830);
  assert.notEqual(local.average, summary.average);
  const unscaled = admissionBaseline(summarizePolicy(data, { ...defaultFilters(), region: 'Kalimantan Selatan' }));
  assert.equal(unscaled.facilities, 1); assert.ok(unscaled.average !== null);
});

test('empty, partial facility dates and missing capacity remain unavailable without inventing totals', () => {
  const empty = admissionBaseline(summarizePolicy(data, { ...defaultFilters(), region: 'none' }));
  assert.equal(empty.average, null); assert.equal(empty.beds, null); assert.equal(empty.days, 0);
  assert.equal(simulate(empty, { baseline: 'mean', increase: 0, extraBeds: 10 }), null);
  const a = data.stations[0]; assert.ok(a);
  const missing: PolicyData = { ...data, stations: [{ ...a, admissions: a.admissions.map((n, i) => i ? n : null) }, ...data.stations.slice(1)] };
  assert.equal(admissionBaseline(summarizePolicy(missing, { ...defaultFilters(), region: 'all' })).days, 1017);
  for (const beds of [0, null]) {
    const missingCapacity: PolicyData = { ...data, stations: [{ ...a, beds }, ...data.stations.slice(1)] };
    assert.equal(admissionBaseline(summarizePolicy(missingCapacity, { ...defaultFilters(), region: 'all' })).beds, null);
    assert.equal(simulate({ average: 100, p90: 200, beds }, { baseline: 'mean', increase: 0, extraBeds: 10 }), null);
  }
  assert.equal(simulate({ average: 0, p90: 0, beds: 100 }, { baseline: 'mean', increase: 0, extraBeds: 0 })?.load, 0);
});

test('invalid scenarios cannot silently produce stale or invented numbers', () => {
  for (const increase of [NaN, Infinity, -1, 201]) assert.equal(simulate(summary, { baseline: 'mean', increase, extraBeds: 0 }), null);
  for (const extraBeds of [NaN, Infinity, -1, 1.5, 100001]) assert.equal(simulate(summary, { baseline: 'mean', increase: 0, extraBeds }), null);
});

test('network distance uses the full installed network even with one station selected', () => {
  const selected = summarizePolicy(data, { ...defaultFilters(), region: 'Papua' });
  assert.equal(selected.rows.length, 1);
  assert.equal(selected.rows[0]?.station.nearest.code, 'AQMS-SRG-01');
  const mer = data.stations.find(row => row.code === 'AQMS-MER-01'), sor = data.stations.find(row => row.code === 'AQMS-SRG-01'); assert.ok(mer && sor);
  close(selected.rows[0]?.station.nearest.km ?? 0, distanceKm(mer, sor));
  assert.ok(Math.abs(mer.nearest.km - 1318.7) < .1);
});

test('runtime validation rejects unsupported schema and mismatched station relationships', () => {
  if (!context || typeof context !== 'object') throw new Error('Invalid test fixture');
  const source = Object.fromEntries(Object.entries(context));
  assert.throws(() => parsePolicy({ ...source, version: 1 }, exposure), /Versi/);
  assert.throws(() => parsePolicy({ ...source, dates: ['2024-02-30'] }, exposure), /Tanggal/);
  assert.throws(() => parsePolicy({ ...source, stations: [] }, exposure), /Jaringan/);
});


test('policy actions use fixed-period six-pollutant evidence and restrict locations to the lookup', () => {
  const all = summarizePolicy(data, { ...defaultFilters(), region: 'all' });
  assert.equal(all.dates.length, 1018); assert.equal(all.rows.length, 27);
  assert.equal(all.rows.find(row => row.station.code === 'AQMS-MER-01')?.valid, 2);
  assert.equal(all.rows.find(row => row.station.code === 'AQMS-JMB-02')?.valid, 0);
  const actions = recommendActions(all);
  assert.deepEqual(actions.map(action => action.id), ['instrument', 'continuity', 'service', 'network']);
  assert.ok(actions.find(action => action.id === 'service')?.locations.includes('RS-XXX-05'));
  assert.ok(actions.find(action => action.id === 'network')?.locations.includes('AQMS-MER-01'));
  for (const row of all.rows) {
    const complete = data.dates.filter((_, i) => Object.values(row.station.exposure.v).every(series => series[i] !== null && series[i] !== undefined)).length;
    assert.equal(row.valid, row.station.exposure.v.pm25.filter(n => n !== null).length);
    assert.ok(complete <= row.valid);
  }
  const local = recommendActions(summarizePolicy(data, { ...defaultFilters(), region: 'Jakarta' }));
  assert.deepEqual(local.map(action => action.id), ['service', 'network']);
  assert.ok(local.every(action => !action.locations.includes('MER') && !action.locations.includes('RS-XXX-05')));
  assert.deepEqual(recommendActions(summarizePolicy(data, { ...defaultFilters(), region: 'missing' })), []);
});
