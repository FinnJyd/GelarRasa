import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getCorrelationMatrix,
  getCorrelationStations,
  getExtremeVsNormal,
  getRoseData,
  getRoseStations,
  getTrafficScatterPoints,
  getWindBinsForSiteType,
  getWindBinSiteTypes,
} from '../dashboard/src/features/drivers/model';
import type { DriversData } from '../dashboard/src/features/drivers/types';

const read = (path: string): DriversData =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const data = read('../dashboard/data/tab4_drivers.json');

test('drivers export has valid meta and structure', () => {
  assert.equal(data.meta.version, 1);
  assert.equal(data.meta.calm_wind_threshold_ms, 0.5);
  assert.equal(data.meta.extreme_percentile, 95);
  assert.deepEqual(data.meta.haze_months, [8, 9, 10]);
});

test('pollution rose returns 16 sectors with non-negative counts', () => {
  const roseStations = getRoseStations(data);
  assert.ok(roseStations.includes('AQMS-KTG-01'));
  assert.ok(roseStations.includes('AQMS-JKT-01'));
  assert.ok(roseStations.includes('AQMS-KTB-01'));

  const ktgRose = getRoseData(data, 'AQMS-KTG-01');
  assert.equal(ktgRose.length, 16);
  ktgRose.forEach(sector => {
    assert.ok(sector.count >= 0);
  });
});

test('correlation matrices are populated for all three seasonal modes', () => {
  const corrStations = getCorrelationStations(data);
  assert.ok(corrStations.length > 0);

  const matAll = getCorrelationMatrix(data, 'AQMS-KTG-01', 'all');
  const matHaze = getCorrelationMatrix(data, 'AQMS-KTG-01', 'haze');
  const matNonHaze = getCorrelationMatrix(data, 'AQMS-KTG-01', 'nonhaze');

  assert.ok('pm25' in matAll);
  assert.ok('pm25' in matHaze);
  assert.ok('pm25' in matNonHaze);
});

test('wind bins return six speed bins for available site types', () => {
  const siteTypes = getWindBinSiteTypes(data);
  assert.ok(siteTypes.length > 0);

  const peatBins = getWindBinsForSiteType(data, 'Peatland Boundary');
  assert.equal(peatBins.length, 6);
  assert.equal(peatBins[0]?.label, '0–0.5');
  assert.equal(peatBins[5]?.label, '5+');
});

test('traffic scatter points include traffic intensity and gas concentrations', () => {
  const points = getTrafficScatterPoints(data);
  assert.equal(points.length, 27);
  points.forEach(pt => {
    assert.ok(pt.traffic >= 0);
    if (pt.no2 !== null) assert.ok(pt.no2 >= 0);
    if (pt.co !== null) assert.ok(pt.co >= 0);
    assert.ok(pt.siteType.length > 0);
  });
});

test('extreme vs normal comparison shows prominent haze season dominance', () => {
  const ext = getExtremeVsNormal(data);
  assert.ok(ext.threshold_pm25 > 50);
  assert.ok(ext.extreme.haze_season_share > 0.8); // Over 80% of extremes happen in haze season
  assert.equal(ext.extreme.hour_distribution.length, 24);
  assert.equal(ext.normal.hour_distribution.length, 24);
});

