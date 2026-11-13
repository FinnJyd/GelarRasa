import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hourlyFixture } from './hourly-fixture';
import { aggregateTemporal } from '../dashboard/src/features/temporal/aggregate';
import { parseCompliance } from '../dashboard/src/features/compliance/load';
import { HOURLY_POLLUTANTS } from '../dashboard/src/data/hourly';

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
