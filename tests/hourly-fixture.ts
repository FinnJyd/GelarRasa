import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseDashboard } from '../dashboard/src/data/validate';
import type { HourlySelection } from '../dashboard/src/data/hourly';
import type { PollutantName } from '../dashboard/src/data/types';

const read=(path:string):unknown=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
export const catalog=parseDashboard(read('../dashboard/tab1_ikhtisar.json'),read('../dashboard/data/station_catalog.json')).stations;
export function hourlyFixture(code:string, pollutant:PollutantName='PM2.5', mode:'v'|'s'='v', first=0, length=31):HourlySelection {
  const station=catalog.find(item=>item.code===code);if(!station)throw new Error('Station fixture missing');
  const raw=gunzipSync(readFileSync(new URL(`../dashboard/data/hourly/${code}-${mode}.bin`,import.meta.url)));
  const hours=new Float64Array(length*240);
  for(let i=0;i<hours.length;i++)hours[i]=raw.readDoubleLE((first*240+i)*8);
  const dates=Array.from({length},(_,i)=>new Date(Date.UTC(2024,0,1+first+i)).toISOString().slice(0,10));
  return {dates,pollutant,stations:[{station,traffic:1850,hours}]};
}
