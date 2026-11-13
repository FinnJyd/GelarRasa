import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hourlyFixture } from './hourly-fixture';
import { aggregateTemporal } from '../dashboard/src/features/temporal/aggregate';
import { parseCompliance } from '../dashboard/src/features/compliance/load';
import { HOURLY_POLLUTANTS } from '../dashboard/src/data/hourly';
import { computeDailyStationAggregate, episodeIndicators } from '../dashboard/src/features/temporal/model';

const raw:unknown=JSON.parse(readFileSync(new URL('../dashboard/data/compliance_daily.json',import.meta.url),'utf8'));
const compliance=parseCompliance(raw);
test('hourly filtering reproduces production daily means across pollutants, both QC modes and converted/missing loggers',()=>{
  for(const code of ['AQMS-JKT-01','AQMS-MDN-01','AQMS-JMB-02'])for(const mode of ['v','s'] as const)for(const pollutant of HOURLY_POLLUTANTS){
    const result=aggregateTemporal(hourlyFixture(code,pollutant,mode));
    const expected=compliance.stations[code]?.pollutants[pollutant][mode].slice(0,31);assert.ok(expected);
    assert.deepEqual(result.timeseries.stations[code]?.map(value=>value===null?null:Number(value.toFixed(6))),expected);
  }
});
test('changing date range and pollutant changes real profiles and regulatory episode thresholds',()=>{
  const january=aggregateTemporal(hourlyFixture('AQMS-JKT-01'));
  const august=aggregateTemporal(hourlyFixture('AQMS-JKT-01','PM2.5','v',213,31));
  const co=aggregateTemporal(hourlyFixture('AQMS-JKT-01','CO'));
  assert.notDeepEqual(january.diurnal,august.diurnal);assert.notDeepEqual(january.diurnal,co.diurnal);
  assert.equal(co.meta.episode_threshold_ug_m3,4000);assert.equal(january.diurnal_haze['Pilihan']?.['0'],null);
});
test('missing days split episodes and are never bridged or filled with zero',()=>{
  const source=hourlyFixture('AQMS-JKT-01','PM2.5','v',0,5),station=source.stations[0];assert.ok(station);station.hours.fill(NaN);
  for(const day of [0,1,3,4])for(let hour=0;hour<24;hour++)station.hours[(day*24+hour)*10]=100;
  const result=aggregateTemporal(source);
  assert.deepEqual(result.episodes['AQMS-JKT-01']?.map(item=>item.duration_days),[2,2]);assert.equal(result.timeseries.stations['AQMS-JKT-01']?.[2],null);
});
test('empty selections retain unavailable episode summaries rather than fabricated defaults',()=>{
  const result=aggregateTemporal({dates:[],stations:[],pollutant:'PM2.5'});
  assert.equal(result.episodes_summary.longest_episode,null);assert.equal(result.episodes_summary.most_episodes,null);
});

test('a measured region with no exceedances reports zero episode indicators instead of unavailable data', () => {
  const source = hourlyFixture('AQMS-BGR-01', 'PM2.5', 'v', 0, 1018);
  assert.equal(source.stations[0]?.station.region, 'Bogor');
  const summary = aggregateTemporal(source).episodes_summary;
  assert.equal(summary.comparison_days, 1018);
  assert.equal(summary.longest_episode, null);
  assert.equal(summary.most_episodes, null);
  assert.deepEqual(episodeIndicators(summary), {
    longestDays: 0, mostCount: 0,
    emptyContext: 'Tidak ada pelampauan pada hari pembanding yang tersedia',
  });
});

test('missing regulatory comparison days remain unavailable even if a CO daily mean exists', () => {
  const source = hourlyFixture('AQMS-JKT-01', 'CO', 'v', 0, 1);
  const station = source.stations[0]; assert.ok(station);
  station.hours.fill(NaN);
  for (let hour = 0; hour < 18; hour++) station.hours[hour * 10 + 3] = 100;
  const data = aggregateTemporal(source);
  assert.equal(data.timeseries.stations['AQMS-JKT-01']?.[0], 100);
  assert.equal(data.episodes_summary.comparison_days, 0);
  const indicators = episodeIndicators(data.episodes_summary);
  assert.equal(indicators.longestDays, null);
  assert.equal(indicators.mostCount, null);
  assert.equal(indicators.emptyContext, 'Data pembanding belum mencukupi');
  const unavailable = episodeIndicators(aggregateTemporal({ dates: [], stations: [], pollutant: 'PM2.5' }).episodes_summary);
  assert.equal(unavailable.longestDays, null); assert.equal(unavailable.mostCount, null);
});

test('positive episode indicators retain their actual duration and station maximum count', () => {
  const summary = aggregateTemporal(hourlyFixture('AQMS-JKT-02', 'PM2.5', 'v', 0, 1018)).episodes_summary;
  assert.ok(summary.longest_episode && summary.most_episodes);
  const indicators = episodeIndicators(summary);
  assert.equal(indicators.longestDays, summary.longest_episode.duration_days);
  assert.equal(indicators.mostCount, summary.most_episodes.count);
  assert.ok(indicators.longestDays > 0 && indicators.mostCount > 0);
});

test('computeDailyStationAggregate calculates accurate quantiles and handles missing stations cleanly', () => {
  const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
  const stations: Record<string, readonly (number | null)[]> = {
    'S1': [10, 20, null],
    'S2': [20, 40, null],
    'S3': [30, 60, null],
    'S4': [40, 80, null],
    'S5': [50, 100, null],
  };
  const result = computeDailyStationAggregate(dates, stations);
  assert.equal(result.length, 3);

  // Day 1: [10, 20, 30, 40, 50]
  assert.equal(result[0]?.date, '2024-01-01');
  assert.equal(result[0]?.stationCount, 5);
  assert.equal(result[0]?.median, 30);
  assert.equal(result[0]?.p25, 20);
  assert.equal(result[0]?.p75, 40);
  assert.equal(result[0]?.mean, 30);

  // Day 2: [20, 40, 60, 80, 100]
  assert.equal(result[1]?.date, '2024-01-02');
  assert.equal(result[1]?.stationCount, 5);
  assert.equal(result[1]?.median, 60);
  assert.equal(result[1]?.p25, 40);
  assert.equal(result[1]?.p75, 80);
  assert.equal(result[1]?.mean, 60);

  // Day 3: all null
  assert.equal(result[2]?.date, '2024-01-03');
  assert.equal(result[2]?.stationCount, 0);
  assert.equal(result[2]?.median, null);
  assert.equal(result[2]?.p25, null);
  assert.equal(result[2]?.p75, null);
  assert.equal(result[2]?.mean, null);

  // Partial presence
  const partial = computeDailyStationAggregate(['2024-01-01'], {
    'A': [15],
    'B': [null],
  });
  assert.equal(partial[0]?.stationCount, 1);
  assert.equal(partial[0]?.median, 15);
  assert.equal(partial[0]?.p25, 15);
  assert.equal(partial[0]?.p75, 15);
  assert.equal(partial[0]?.mean, 15);
});

