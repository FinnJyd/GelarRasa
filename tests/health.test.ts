import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { parseHealth } from '../dashboard/src/features/health/load';
import { correlation, summarizeHealth } from '../dashboard/src/features/health/model';
import type { HealthData, HealthStation } from '../dashboard/src/features/health/types';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const raw = read('dashboard/data/health_outcomes.json');
const exposure = read('dashboard/data/health_exposure.json');
const health = parseHealth(raw, exposure);
const dashboard = parseDashboard(read('dashboard/tab1_ikhtisar.json'), read('dashboard/data/station_catalog.json'));
const all = defaultFilters();

test('health export preserves separate raw outcome totals and all hospital relationships', () => {
  assert.equal(health.dates.length, 1018);
  assert.equal(Object.keys(health.stations).length, 27);
  assert.equal(health.discrepancies, 92);
  let respiratory = 0, under = 0, over = 0;
  for (const item of Object.values(health.stations)) {
    respiratory += item.outcomes.resp.reduce<number>((a, b) => a + (b ?? 0), 0);
    under += item.outcomes.resp_admissions_under5.reduce<number>((a, b) => a + (b ?? 0), 0);
    over += item.outcomes.resp_admissions_over60.reduce<number>((a, b) => a + (b ?? 0), 0);
  }
  assert.equal(respiratory, 733191);
  assert.equal(under, 186167);
  assert.equal(over, 225117);
  assert.equal(health.stations['AQMS-JKT-01']?.hospital, 'RS-XXX-01');
  assert.equal(health.stations['AQMS-JMB-02']?.hospital, 'RS-XXX-27');
});

test('all six pollutants and QC change exposures without changing health counts', () => {
  const baseline = summarizeHealth(health, dashboard.stations, all, 'resp');
  for (const pollutant of ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2']) {
    const valid = summarizeHealth(health, dashboard.stations, { ...all, pollutant }, 'resp');
    const suspect = summarizeHealth(health, dashboard.stations, { ...all, pollutant, includeSuspect: true }, 'resp');
    assert.deepEqual(valid.daily, baseline.daily);
    assert.deepEqual(suspect.daily, baseline.daily);
    assert.ok(valid.pairs > 0);
    assert.ok(suspect.pairs >= valid.pairs);
    assert.notDeepEqual(valid.exposure, suspect.exposure);
  }
  assert.equal(baseline.beds, 6280);
  assert.ok(baseline.average && Math.abs(baseline.average - 733191 / 1018) < 1e-9);
});

test('raw logger scales are unavailable while hospital summaries remain available', () => {
  const result = summarizeHealth(health, dashboard.stations, { ...all, station: 'AQMS-BJB-01' }, 'resp');
  assert.equal(result.hospitals, 1);
  assert.equal(result.unscaled, 1);
  assert.equal(result.pairs, 0);
  assert.ok(result.average !== null && result.average > 0);
  assert.ok(result.exposure.every(value => value === null));
  assert.ok(result.lags.every(item => item.correlation === null));
  assert.equal(result.bins.length, 0);
});

test('sparse station coverage, dates, outcome and empty selections are explicit', () => {
  const sparse = summarizeHealth(health, dashboard.stations, { ...all, station: 'AQMS-JMB-02' }, 'death');
  assert.equal(sparse.pairs, 0);
  assert.ok(sparse.average !== null && sparse.average > 0);
  const zeroDate = health.dates[health.stations['AQMS-JMB-02']?.outcomes.death.findIndex(n => n === 0) ?? -1];
  assert.ok(zeroDate);
  const zero = summarizeHealth(health, dashboard.stations, { ...all, station: 'AQMS-JMB-02', startDate: zeroDate, endDate: zeroDate }, 'death');
  assert.equal(zero.average, 0);
  const single = summarizeHealth(health, dashboard.stations, { ...all, station: 'AQMS-JKT-01', startDate: '2024-01-01', endDate: '2024-01-01' }, 'cvd');
  assert.equal(single.dates.length, 1);
  assert.equal(single.average, health.stations['AQMS-JKT-01']?.outcomes.cvd[0]);
  assert.ok(single.lags.every(item => item.correlation === null));
  const invalid = summarizeHealth(health, dashboard.stations, { ...all, startDate: '2026-10-14', endDate: '2024-01-01' }, 'resp');
  assert.equal(invalid.dates.length, 0);
  assert.equal(invalid.average, null);
  const empty = summarizeHealth(health, dashboard.stations, { ...all, region: 'absent' }, 'resp');
  assert.equal(empty.hospitals, 0);
  assert.equal(empty.average, null);
  assert.equal(empty.pairs, 0);
});

test('Pearson requires 30 aligned pairs and variance, including zero-valued observations', () => {
  const x = Array.from({ length: 40 }, (_, i) => i);
  assert.equal(correlation(x, x), 1);
  assert.equal(correlation(x, x.map(n => 40 - n)), -1);
  assert.equal(correlation(x.slice(0, 29), x.slice(0, 29)), null);
  assert.equal(correlation(x, x.map(() => 1)), null);
});

test('lag uses preceding calendar dates outside selected outcome window, preserving gaps', () => {
  const dates = Array.from({ length: 50 }, (_, i) => new Date(Date.UTC(2024, 0, i + 1)).toISOString().slice(0, 10));
  const x = dates.map((_, i) => i % 7 === 0 ? 5 : i % 9);
  const y = x.map((_, i) => x[i - 2] ?? 0);
  const item: HealthStation = {
    hospital: 'RS-XXX-01', beds: 100, unavailable: [],
    outcomes: { resp: y, resp_admissions_under5: y, resp_admissions_over60: y, asthma_emergency_cases: y, copd_admissions: y, cvd: y, death: y },
    exposure: { v: { pm25: x, pm10: x, co: x, so2: x, o3: x, no2: x }, s: { pm25: x, pm10: x, co: x, so2: x, o3: x, no2: x } },
  };
  const data: HealthData = { dates, stations: { 'AQMS-JKT-01': item }, discrepancies: 0 };
  const result = summarizeHealth(data, dashboard.stations, { ...all, station: 'AQMS-JKT-01', startDate: '2024-01-11', endDate: '2024-02-19' }, 'resp');
  assert.equal(result.lags[2]?.correlation, 1);
  assert.equal(result.lags[2]?.pairs, 40);
  assert.equal(result.bins.reduce((sum, bin) => sum + bin.pairs, 0), result.pairs);
});

test('health validation rejects malformed calendars, counts, relationships and infinite exposures', () => {
  const fixture = () => {
    const values = () => [1, 2];
    const mode = () => ({ pm25: values(), pm10: values(), so2: values(), co: values(), o3: values(), no2: values() });
    const outcomes = { version: 1, dates: ['2024-01-01', '2024-01-02'], resp_discrepancies: 0,
      stations: { 'AQMS-JKT-01': { hospital: 'RS-XXX-01', beds: 300, outcomes: {
        resp: values(), resp_admissions_under5: values(), resp_admissions_over60: values(),
        asthma_emergency_cases: values(), copd_admissions: values(), cvd: values(), death: values(),
      } } } };
    const exposures = { version: 1, dates: [...outcomes.dates], stations: { 'AQMS-JKT-01': { v: mode(), s: mode(), unavailable: [] } } };
    return { outcomes, exposures };
  };
  const calendar = fixture();
  calendar.outcomes.dates[1] = '2024-01-01';
  assert.throws(() => parseHealth(calendar.outcomes, calendar.exposures), /Kalender/);
  const count = fixture();
  count.outcomes.stations['AQMS-JKT-01'].outcomes.resp[0] = -1;
  assert.throws(() => parseHealth(count.outcomes, count.exposures), /Nilai/);
  const relationship = fixture();
  relationship.outcomes.stations['AQMS-JKT-01'].hospital = 'Public hospital name';
  assert.throws(() => parseHealth(relationship.outcomes, relationship.exposures), /Relasi/);
  const infinite = fixture();
  infinite.exposures.stations['AQMS-JKT-01'].v.pm25[0] = Infinity;
  assert.throws(() => parseHealth(infinite.outcomes, infinite.exposures), /Nilai/);
});
