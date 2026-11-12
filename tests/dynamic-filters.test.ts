import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters, selectObservations, summarize, computeHospitalBurden } from '../dashboard/src/features/overview/model';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const raw = read('../dashboard/tab1_ikhtisar.json');
const catalog = read('../dashboard/data/station_catalog.json');
const data = parseDashboard(raw, catalog);

test('approved particulate and gas assumptions expose measured logger concentrations', () => {
  assert.ok(data.cube);
  const particulate = selectObservations(data.stations, { ...defaultFilters(), station: 'AQMS-BJB-01', pollutant: 'PM2.5' }, data.cube);
  assert.equal(particulate.length, 1);
  assert.ok((particulate[0]?.average ?? 0) > 0);
  const gas = selectObservations(data.stations, { ...defaultFilters(), station: 'AQMS-BJB-01', pollutant: 'CO' }, data.cube);
  assert.equal(gas.length, 1);
  assert.ok((gas[0]?.average ?? 0) > 0);
  assert.deepEqual(data.cube.stations['AQMS-BJB-01']?.unavailable, []);
});

test('daily_cube is parsed and populated', () => {
  assert.ok(data.cube);
  assert.equal(data.cube.dates.length, 1018);
  assert.equal(data.cube.pollutants.length, 6);
  assert.equal(Object.keys(data.cube.stations).length, 27);
  assert.ok(data.cube.thresholds['pm25']);
  assert.ok(data.cube.thresholds['so2']);
});

test('filtering by pollutant updates station metrics to that pollutant', () => {
  const pm25Stations = selectObservations(data.stations, { ...defaultFilters(), pollutant: 'PM2.5' }, data.cube);
  const pm10Stations = selectObservations(data.stations, { ...defaultFilters(), pollutant: 'PM10' }, data.cube);
  
  assert.equal(pm25Stations.length, 27);
  assert.equal(pm10Stations.length, 27);
  
  const pm25Summary = summarize(pm25Stations);
  const pm10Summary = summarize(pm10Stations);
  
  assert.notEqual(pm25Summary.mean, null);
  assert.notEqual(pm10Summary.mean, null);
  // PM10 concentrations are physically higher than PM2.5 concentrations
  assert.ok((pm10Summary.mean ?? 0) > (pm25Summary.mean ?? 0));
});

test('filtering by period preset slices the date range dynamically', () => {
  const full = selectObservations(data.stations, { ...defaultFilters() }, data.cube);
  const y2024 = selectObservations(data.stations, {
    ...defaultFilters(),
    periodPreset: '2024',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  }, data.cube);
  
  assert.equal(full.length, 27);
  assert.equal(y2024.length, 27);
  
  const hospitalFull = computeHospitalBurden(data.cube!, '2024-01-01', '2026-10-14');
  const hospital2024 = computeHospitalBurden(data.cube!, '2024-01-01', '2024-12-31');
  
  assert.ok(hospitalFull.burden > 0);
  assert.ok(hospital2024.burden > 0);
});

test('filtering by arbitrary custom date range calculates exact slice statistics', () => {
  const custom = selectObservations(data.stations, {
    ...defaultFilters(),
    periodPreset: 'custom',
    startDate: '2024-07-01',
    endDate: '2024-09-30',
  }, data.cube);
  assert.equal(custom.length, 27);
  const customSummary = summarize(custom);
  assert.notEqual(customSummary.mean, null);
  assert.ok((customSummary.mean ?? 0) > 0);
  
  const customHospital = computeHospitalBurden(data.cube!, '2024-07-01', '2024-09-30');
  assert.ok(customHospital.burden > 0);
});

test('including SUSPECT data updates station statistics and coverage', () => {
  const validOnly = selectObservations(data.stations, { ...defaultFilters(), includeSuspect: false }, data.cube);
  const withSuspect = selectObservations(data.stations, { ...defaultFilters(), includeSuspect: true }, data.cube);
  assert.equal(validOnly.length, 27);
  assert.equal(withSuspect.length, 27);
  
  const validSumm = summarize(validOnly);
  const suspectSumm = summarize(withSuspect);
  
  // Valid percentages with suspect are >= valid percentages without suspect
  assert.ok((suspectSumm.validMean ?? 0) >= (validSumm.validMean ?? 0));
});

test('dynamic hospital burden calculates local hospital burden per station and region', () => {
  assert.ok(data.cube);
  assert.ok(data.cube.health_daily.by_station);
  
  // National scope (all 27 stations)
  const national = computeHospitalBurden(data.cube, '2024-01-01', '2026-10-14', data.stations.map(s => s.code));
  assert.equal(national.hospitalCount, 27);
  assert.equal(national.beds, 6280);
  assert.ok(Math.abs(national.burden - 6.43) < 0.1);
  
  // Single station: AQMS-JKT-01 (RSUD XXX Gambir, 300 beds)
  const jkt01 = computeHospitalBurden(data.cube, '2024-01-01', '2026-10-14', ['AQMS-JKT-01']);
  assert.equal(jkt01.hospitalCount, 1);
  assert.equal(jkt01.beds, 300);
  assert.equal(jkt01.hospitalName, 'RSUD XXX Gambir');
  assert.ok(Math.abs(jkt01.burden - 10.09) < 0.1);

  // Single station: AQMS-BJB-01 (RSUD XXX Banjarbaru, 300 beds)
  const bjb01 = computeHospitalBurden(data.cube, '2024-01-01', '2026-10-14', ['AQMS-BJB-01']);
  assert.equal(bjb01.hospitalCount, 1);
  assert.equal(bjb01.beds, 300);
  assert.equal(bjb01.hospitalName, 'RSUD XXX Banjarbaru');
  assert.ok(Math.abs(bjb01.burden - 2.44) < 0.1);

  // Region: Jakarta (3 stations: JKT-01, JKT-02, JKT-03)
  const jkt = computeHospitalBurden(data.cube, '2024-01-01', '2026-10-14', ['AQMS-JKT-01', 'AQMS-JKT-02', 'AQMS-JKT-03']);
  assert.equal(jkt.hospitalCount, 3);
  assert.equal(jkt.beds, 830); // 300 + 250 + 280
  assert.ok(Math.abs(jkt.burden - 11.19) < 0.1);
});

