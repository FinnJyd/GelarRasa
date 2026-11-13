import { at, calendar, HOURLY_POLLUTANTS, mean, quantile } from '../../data/hourly';
import type { HourlySelection } from '../../data/hourly';
import { REFERENCES } from '../../shared/pollutants';
import type { DiurnalBySiteType, Episode, TemporalData } from './types';

export function aggregateTemporal(selection: HourlySelection): TemporalData {
  const { dates, stations, pollutant } = selection;
  const reference = REFERENCES[pollutant], column = HOURLY_POLLUTANTS.indexOf(pollutant), days = calendar(dates);
  const profiles: Record<string, Record<string, number[][]>> = {};
  const heatmap: TemporalData['heatmap'] = {}, timeseries: TemporalData['timeseries']['stations'] = {}, episodes: TemporalData['episodes'] = {};
  const allCells = Array.from({length:168}, ():number[]=>[]);
  let longest: TemporalData['episodes_summary']['longest_episode'] = null;
  let most: TemporalData['episodes_summary']['most_episodes'] = null;
  let comparisonDays = 0;
  for (const item of stations) {
    const { code } = item.station;
    const profile = profiles['Pilihan'] ??= Object.fromEntries(['all','haze','nonhaze'].map(mode => [mode, Array.from({ length: 24 }, () => [])]));
    const cells = Array.from({ length: 168 }, (): number[] => []);
    const daily: (number|null)[] = [], comparison: (number|null)[] = [];
    for (let day = 0; day < dates.length; day++) {
      const calendarDay = days[day]; if (!calendarDay) continue;
      const values: number[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const value = at(item, day*24+hour, column); if (value === null) continue;
        values.push(value); cells[calendarDay.dow*24+hour]?.push(value); allCells[calendarDay.dow*24+hour]?.push(value);
        profile['all']?.[hour]?.push(value);
        profile[calendarDay.haze ? 'haze' : 'nonhaze']?.[hour]?.push(value);
      }
      daily.push(values.length >= 18 ? mean(values) : null);
      if (reference.hours === 24) comparison.push(daily.at(-1) ?? null);
      else {
        const windows: number[] = [];
        for (let start = 0; start <= 16; start++) {
          const window = Array.from({ length: 8 }, (_, offset) => at(item, day*24+start+offset, column));
          const complete = window.filter((value): value is number => value !== null);
          if (complete.length === 8) windows.push(complete.reduce((a,b) => a+b,0)/8);
        }
        comparison.push(windows.length >= 13 ? Math.max(...windows) : null);
      }
    }
    comparisonDays += comparison.filter(value => value !== null).length;
    timeseries[code] = daily;
    heatmap[code] = Object.fromEntries(Array.from({ length: 7 }, (_, dow) => [String(dow), Object.fromEntries(Array.from({ length: 24 }, (_, hour) => {
      const values = cells[dow*24+hour] ?? []; return [String(hour), values.length >= 5 ? quantile(values,.5) : null];
    }))]));
    const list: Episode[] = [];
    let current: { start: number; end: number; values: number[] } | null = null;
    const finish = (): void => {
      if (!current) return;
      const start = dates[current.start], end = dates[current.end], average = mean(current.values);
      if (start && end && average !== null) list.push({ start, end, duration_days: current.end-current.start+1, peak_concentration: Math.max(...current.values), mean_concentration: average });
      current = null;
    };
    comparison.forEach((value, index) => {
      if (value !== null && value > reference.daily) {
        // Only a measured non-exceeding day may bridge an episode; missing days always split it.
        if (current && index-current.end <= 2 && comparison.slice(current.end+1,index).every(v => v !== null)) {
          current.end = index; current.values.push(value);
        } else { finish(); current = { start:index, end:index, values:[value] }; }
      } else if (value === null) finish();
    });
    finish(); episodes[code] = list;
    for (const episode of list) if (!longest || episode.duration_days > longest.duration_days) longest = { station:code, ...episode };
    if (list.length && (!most || list.length > most.count)) most = { station:code, count:list.length };
  }
  heatmap['Pilihan'] = Object.fromEntries(Array.from({length:7},(_,dow)=>[String(dow),Object.fromEntries(Array.from({length:24},(_,hour)=>{const v=allCells[dow*24+hour]??[];return [String(hour),v.length>=5?quantile(v,.5):null];}))]));
  function profile(mode: string): DiurnalBySiteType {
    return Object.fromEntries(Object.entries(profiles).map(([site, modes]) => [site, Object.fromEntries(Array.from({ length:24 }, (_, hour) => {
      const values = modes[mode]?.[hour] ?? [], median = quantile(values,.5), p25 = quantile(values,.25), p75 = quantile(values,.75);
      return [String(hour), values.length >= 10 && median !== null && p25 !== null && p75 !== null ? {median,p25,p75} : null];
    }))]));
  }
  return { meta:{ version:2, date_range:{start:dates[0] ?? '',end:dates.at(-1) ?? ''}, haze_months:[8,9,10], episode_threshold_ug_m3:reference.daily, episode_min_valid_hours:18, episode_gap_merge_days:1, pollutant },
    diurnal:profile('all'), diurnal_haze:profile('haze'), diurnal_nonhaze:profile('nonhaze'), heatmap, timeseries:{dates,stations:timeseries}, episodes, episodes_summary:{comparison_days:comparisonDays,longest_episode:longest,most_episodes:most} };
}
