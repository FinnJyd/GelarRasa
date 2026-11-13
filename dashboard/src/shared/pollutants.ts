import type { FilterState, PollutantName } from '../data/types';

interface Reference {
  key: string;
  daily: number;
  hours: 24 | 8;
  annual: number | null;
  whoAnnual: number | null;
  bins: readonly number[];
}

export const REFERENCES: Record<PollutantName, Reference> = {
  'PM2.5': { key: 'pm25', daily: 55, hours: 24, annual: 15, whoAnnual: 5, bins: [15.5, 55.4, 150.4, 250.4] },
  PM10: { key: 'pm10', daily: 75, hours: 24, annual: 40, whoAnnual: 15, bins: [50, 150, 350, 420] },
  SO2: { key: 'so2', daily: 75, hours: 24, annual: 45, whoAnnual: null, bins: [52, 180, 400, 800] },
  CO: { key: 'co', daily: 4000, hours: 8, annual: null, whoAnnual: null, bins: [4000, 8000, 15000, 30000] },
  O3: { key: 'o3', daily: 100, hours: 8, annual: 35, whoAnnual: null, bins: [120, 235, 400, 800] },
  NO2: { key: 'no2', daily: 65, hours: 24, annual: 50, whoAnnual: 10, bins: [80, 200, 1130, 2260] },
};

export function selectedPollutant(state: FilterState): PollutantName {
  const name = state.pollutant ?? 'PM2.5';
  if (name === 'PM2.5' || name === 'PM10' || name === 'SO2' || name === 'CO' || name === 'O3' || name === 'NO2') return name;
  throw new Error(`Polutan tidak didukung: ${name}`);
}
