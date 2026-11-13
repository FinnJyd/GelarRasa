import { at, calendar, HOURLY_POLLUTANTS, mean, quantile } from '../../data/hourly';
import type { HourlySelection } from '../../data/hourly';
import type { CorrelationMatrix, DriversData, ExtremeStats } from './types';

function ranks(values: readonly number[]): number[] {
  const sorted = values.map((value,index) => ({value,index})).sort((a,b) => a.value-b.value), output = Array<number>(values.length);
  for (let i = 0; i < sorted.length;) {
    let end = i+1; while (end < sorted.length && sorted[end]?.value === sorted[i]?.value) end++;
    for (let j = i; j < end; j++) { const item = sorted[j]; if (item) output[item.index] = (i+end+1)/2; }
    i = end;
  }
  return output;
}
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 30) return null;
  const rx = ranks(x), ry = ranks(y), center = (x.length+1)/2;
  let cross = 0, xx = 0, yy = 0;
  rx.forEach((value,i) => { const other = ry[i]; if (other === undefined) return; const a = value-center, b = other-center; cross+=a*b; xx+=a*a; yy+=b*b; });
  return xx > 0 && yy > 0 ? cross/Math.sqrt(xx*yy) : null;
}

export function aggregateDrivers(selection: HourlySelection): DriversData {
  const { dates, stations, pollutant } = selection, days = calendar(dates), column = HOURLY_POLLUTANTS.indexOf(pollutant);
  const values: number[] = [];
  for (const station of stations) for (let h=0; h<dates.length*24; h++) { const value=at(station,h,column); if(value!==null) values.push(value); }
  const threshold = quantile(values,.95);
  const wind: Record<string, number[][]> = {}, pollution_rose: DriversData['pollution_rose'] = {}, traffic_scatter: DriversData['traffic_scatter'] = {};
  const numbers = (): number[] => [];
  const seasonPairs = Object.fromEntries(['all','haze','nonhaze'].map(mode => [mode, Array.from({length:3}, () => ({x:numbers(),y:numbers()}))]));
  const grouped = { extreme:{wind:numbers(),humidity:numbers(),temperature:numbers(),haze:0,count:0,hours:Array<number>(24).fill(0)}, normal:{wind:numbers(),humidity:numbers(),temperature:numbers(),haze:0,count:0,hours:Array<number>(24).fill(0)} };
  for (const station of stations) {
    const sectors = Array.from({length:16}, (): number[] => []), stationValues: number[] = [];
    const bins = wind[station.station.siteType] ??= Array.from({length:6}, () => []);
    for(let h=0; h<dates.length*24; h++) {
      const value=at(station,h,column), day=days[Math.floor(h/24)]; if(value===null || !day) continue;
      stationValues.push(value);
      const speed=at(station,h,8), direction=at(station,h,9);
      if(speed!==null && direction!==null && speed>=.5) sectors[Math.floor((direction+11.25)/22.5)%16]?.push(value);
      if(speed!==null && speed>=0) { const index=[.5,1,2,3,5,Infinity].findIndex(edge => speed<edge); bins[index]?.push(value); }
      for(const mode of ['all',day.haze?'haze':'nonhaze']) for(let m=0;m<3;m++) {
        const weather=at(station,h,m+6), pair=seasonPairs[mode]?.[m];
        if(weather!==null && pair) {pair.x.push(value);pair.y.push(weather);}
      }
      if(threshold!==null) {
        const group=value>threshold?grouped.extreme:grouped.normal;
        group.count++; if(day.haze) group.haze++; group.hours[h%24]=(group.hours[h%24]??0)+1;
        if(speed!==null) group.wind.push(speed);
        const humidity=at(station,h,7), temperature=at(station,h,6);
        if(humidity!==null) group.humidity.push(humidity); if(temperature!==null) group.temperature.push(temperature);
      }
    }
    pollution_rose[station.station.code] = sectors.map((bucket,i) => ({direction_label:['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][i]??'',mean_concentration:bucket.length>=3?mean(bucket):null,count:bucket.length}));
    const average=mean(stationValues);
    traffic_scatter[station.station.code]={traffic_intensity_per_h:station.traffic,mean_concentration:average,site_type:station.station.siteType};
  }
  const correlation: DriversData['correlation'] = {};
  const modes: Record<string, CorrelationMatrix> = {};
  for(const mode of ['all','haze','nonhaze']) {
    const pairs=seasonPairs[mode]??[];
    const r=(index:number):number|null=>{const pair=pairs[index];return pair?spearman(pair.x,pair.y):null;};
    modes[mode]={[pollutant]:{temperature_c:r(0),humidity_pct:r(1),wind_speed_ms:r(2)}};
  }
  correlation['Pilihan']={all:modes['all']??{},haze:modes['haze']??{},nonhaze:modes['nonhaze']??{}};
  const stats=(group:typeof grouped.extreme):ExtremeStats=>({median_wind_speed:quantile(group.wind,.5),median_humidity:quantile(group.humidity,.5),median_temperature:quantile(group.temperature,.5),haze_season_share:group.count?group.haze/group.count:null,hour_distribution:group.hours});
  return {meta:{version:2,date_range:{start:dates[0]??'',end:dates.at(-1)??''},haze_months:[8,9,10],calm_wind_threshold_ms:.5,correlation_min_obs:30,extreme_percentile:95,pollutant},
    pollution_rose, correlation, traffic_scatter,
    wind_bins:Object.fromEntries(Object.entries(wind).map(([site,bins])=>[site,bins.map((bucket,index)=>({label:['0–0.5','0.5–1','1–2','2–3','3–5','5+'][index]??'',median_concentration:bucket.length>=5?quantile(bucket,.5):null,p25:bucket.length>=5?quantile(bucket,.25):null,p75:bucket.length>=5?quantile(bucket,.75):null,count:bucket.length}))])),
    extreme_vs_normal:{threshold:threshold,extreme:stats(grouped.extreme),normal:stats(grouped.normal)} };
}
