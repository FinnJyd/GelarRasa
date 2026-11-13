import test from 'node:test';
import assert from 'node:assert/strict';
import { hourlyFixture } from './hourly-fixture';
import { aggregateDrivers, spearman } from '../dashboard/src/features/drivers/aggregate';

test('drivers uses only selected normalized hourly data for roses, traffic and the selected pollutant',()=>{
  const result=aggregateDrivers(hourlyFixture('AQMS-MDN-01','NO2'));
  assert.deepEqual(Object.keys(result.pollution_rose),['AQMS-MDN-01']);assert.equal(result.pollution_rose['AQMS-MDN-01']?.length,16);
  assert.ok((result.traffic_scatter['AQMS-MDN-01']?.mean_concentration??0)>0);
  assert.deepEqual(Object.keys(result.correlation['Pilihan']?.all??{}),['NO2']);assert.equal(result.correlation['Pilihan']?.haze['NO2']?.wind_speed_ms,null);
});
test('date, QC and pollutant selection alter actual extreme thresholds',()=>{
  const a=aggregateDrivers(hourlyFixture('AQMS-JKT-01')),b=aggregateDrivers(hourlyFixture('AQMS-JKT-01','PM2.5','v',213)),c=aggregateDrivers(hourlyFixture('AQMS-JKT-01','CO')),d=aggregateDrivers(hourlyFixture('AQMS-JKT-01','PM2.5','s'));
  assert.notEqual(a.extreme_vs_normal.threshold,b.extreme_vs_normal.threshold);assert.notEqual(a.extreme_vs_normal.threshold,c.extreme_vs_normal.threshold);assert.notDeepEqual(a.traffic_scatter,d.traffic_scatter);
});
test('Spearman handles ties, constant series and insufficient pairs explicitly',()=>{
  const x=Array.from({length:40},(_,i)=>Math.floor(i/2));assert.equal(spearman(x,x),1);assert.equal(spearman(x,x.map(v=>-v)),-1);assert.equal(spearman(x,x.map(()=>1)),null);assert.equal(spearman([1,2],[2,1]),null);
});
test('empty measurements leave weather statistics and the percentile unavailable',()=>{
  const source=hourlyFixture('AQMS-JKT-01');for(const station of source.stations)station.hours.fill(NaN);
  const result=aggregateDrivers(source);assert.equal(result.extreme_vs_normal.threshold,null);assert.equal(result.extreme_vs_normal.extreme.median_wind_speed,null);assert.equal(result.extreme_vs_normal.extreme.haze_season_share,null);
});
test('global vs station threshold mode provides both perspectives and diurnal probabilities',()=>{
  const result=aggregateDrivers(hourlyFixture('AQMS-JKT-01'));
  assert.ok(result.extreme_modes.global);
  assert.ok(result.extreme_modes.station);
  assert.equal(result.extreme_modes.global.diurnal.length, 24);
  assert.equal(result.extreme_modes.station.diurnal.length, 24);
  assert.ok(result.extreme_modes.global.conditions.all);
  assert.ok(result.extreme_modes.global.conditions.haze);
  assert.ok(result.extreme_modes.global.conditions.nonhaze);
});
test('driver ranking decomposition computes eta2 for categorical and R2 for weather factors',()=>{
  const result=aggregateDrivers(hourlyFixture('AQMS-JKT-01'));
  assert.ok(result.driver_rankings.length >= 7);
  const categorical = result.driver_rankings.filter(r => r.factorType === 'categorical');
  const continuous = result.driver_rankings.filter(r => r.factorType === 'continuous');
  assert.ok(categorical.every(c => c.metricName === 'η²'));
  assert.ok(continuous.every(c => c.metricName === 'R²'));
  for (let i = 1; i < result.driver_rankings.length; i++) {
    const prev = result.driver_rankings[i - 1]?.varianceExplained ?? 0;
    const curr = result.driver_rankings[i]?.varianceExplained ?? 0;
    assert.ok(prev >= curr);
  }
});
test('traffic scatter contains road distance and multi-pollutant averages',()=>{
  const result=aggregateDrivers(hourlyFixture('AQMS-JKT-01'));
  const pt = result.traffic_scatter['AQMS-JKT-01'];
  assert.ok(pt);
  assert.equal(pt.distance_to_road_m, 45.0);
  assert.ok(pt.mean_no2 !== undefined);
  assert.ok(pt.mean_co !== undefined);
  assert.ok(pt.mean_pm25 !== undefined);
});
test('wind bins are grouped and normalized by site type',()=>{
  const result=aggregateDrivers(hourlyFixture('AQMS-JKT-01'));
  assert.ok(Object.keys(result.wind_by_site_type).length > 0);
  for (const info of Object.values(result.wind_by_site_type)) {
    assert.equal(info.bins.length, 6);
  }
});
