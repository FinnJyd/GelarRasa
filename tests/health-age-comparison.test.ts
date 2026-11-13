import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { compareAgeGroups } from '../dashboard/src/features/health/age-comparison';
import { parseHealth } from '../dashboard/src/features/health/load';
import type { HealthData, HealthStation, Series } from '../dashboard/src/features/health/types';

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const dashboard = parseDashboard(read('dashboard/tab1_ikhtisar.json'), read('dashboard/data/station_catalog.json'));
const dates = Array.from({ length: 100 }, (_, i) => new Date(Date.UTC(2024, 0, i + 1)).toISOString().slice(0, 10));
const filters = defaultFilters();
const reference = { count: 0, p25: null, p75: null, p90: null };
const references = {
  v: { pm25: reference, pm10: reference, so2: reference, co: reference, o3: reference, no2: reference },
  s: { pm25: reference, pm10: reference, so2: reference, co: reference, o3: reference, no2: reference },
};
const station = (factor = 1): HealthStation => {
  const x = dates.map((_, i) => Math.floor(i / 20));
  const young = x.map(value => (value + 1) * 10 * factor);
  const old = x.map(value => (5 - value) * 10 * factor);
  const mode = { pm25: x, pm10: x, so2: x, no2: x, co: x, o3: x };
  return { references, hospital: `RS-XXX-${factor}`, beds: 100, unavailable: [],
    outcomes: { resp: young, resp_admissions_under5: young, resp_admissions_over60: old,
      asthma_emergency_cases: young, copd_admissions: old, cvd: old, death: young },
    exposure: { v: mode, s: mode } };
};

test('age comparison normalizes each age and facility against its whole-period mean with a fixed cohort', () => {
  const data: HealthData = { dates, discrepancies: 0, stations: { 'AQMS-JKT-01': station(), 'AQMS-JKT-02': station(4) } };
  const result = compareAgeGroups(data, dashboard.stations, filters);
  assert.equal(result.facilities, 2); assert.equal(result.baselineDays, 200);
  assert.equal(result.baselineUnder5, 75); assert.equal(result.baselineOver60, 75);
  assert.equal(result.points.length, 5);
  for (const [index, point] of result.points.entries()) {
    assert.ok(Math.abs(point.under5 - (((index + 1) / 3 - 1) * 100)) < 1e-9);
    assert.ok(Math.abs(point.over60 - (((5 - index) / 3 - 1) * 100)) < 1e-9);
    assert.equal(point.days, 40); assert.equal(point.exposure, index);
  }
  const scoped = compareAgeGroups(data, dashboard.stations, { ...filters, station: 'AQMS-JKT-01' });
  assert.equal(scoped.facilities, 1); assert.equal(scoped.baselineUnder5, 30);
  assert.equal(scoped.points[0]?.exposure, 0);
});

test('age baseline retains health dates without exposure and missing/zero/constant/short scopes stay unavailable', () => {
  const item = station();
  const x: Series = dates.map((_, index) => index === 99 ? null : Math.floor(index / 20));
  const data: HealthData = { dates, discrepancies: 0, stations: { 'AQMS-JKT-01': {
    ...item, outcomes: { ...item.outcomes, resp_admissions_under5: dates.map((_, i) => i === 99 ? 100 : (Math.floor(i / 20) + 1) * 10) },
    exposure: { ...item.exposure, v: { ...item.exposure.v, pm25: x } },
  } } };
  const result = compareAgeGroups(data, dashboard.stations, filters);
  assert.equal(result.baselineDays, 100); assert.equal(result.baselineUnder5, 30.5);
  assert.equal(result.points.reduce((sum, point) => sum + point.days, 0), 99);
  assert.ok(Math.abs((result.points[4]?.under5 ?? 0) - (50 / 30.5 - 1) * 100) < 1e-9);
  assert.equal(compareAgeGroups(data, dashboard.stations, { ...filters, endDate: '2024-01-29' }).facilities, 0);
  assert.equal(compareAgeGroups(data, dashboard.stations, { ...filters, startDate: '2025-01-01', endDate: '2024-01-01' }).points.length, 0);
  assert.equal(compareAgeGroups(data, dashboard.stations, { ...filters, region: 'absent' }).selectedFacilities, 0);
  const zero: HealthData = { ...data, stations: { 'AQMS-JKT-01': { ...item,
    outcomes: { ...item.outcomes, resp_admissions_over60: dates.map(() => 0) } } } };
  assert.equal(compareAgeGroups(zero, dashboard.stations, filters).points.length, 0);
  const constant: HealthData = { ...data, stations: { 'AQMS-JKT-01': { ...item,
    exposure: { ...item.exposure, v: { ...item.exposure.v, pm25: dates.map(() => 10) } } } } };
  assert.equal(compareAgeGroups(constant, dashboard.stations, filters).points.length, 0);
});

test('real age comparisons follow pollutant/date/QC and retain only genuinely paired observations', () => {
  const data = parseHealth(read('dashboard/data/health_outcomes.json'), read('dashboard/data/health_exposure.json'));
  const result = compareAgeGroups(data, dashboard.stations, filters);
  assert.ok(result.facilities > 0); assert.equal(result.points.length, 5);
  assert.ok(result.baselineDays >= result.points.reduce((sum, point) => sum + point.days, 0));
  assert.deepEqual(compareAgeGroups(data, dashboard.stations, { ...filters, station: 'AQMS-JMB-02' }).points, []);
  assert.notDeepEqual(compareAgeGroups(data, dashboard.stations, { ...filters, includeSuspect: true }), result);
  assert.notDeepEqual(compareAgeGroups(data, dashboard.stations, { ...filters, pollutant: 'NO2' }).points, result.points);
  assert.equal(compareAgeGroups(data, dashboard.stations, { ...filters, startDate: '2026-10-14', endDate: '2026-10-14' }).facilities, 0);
});
