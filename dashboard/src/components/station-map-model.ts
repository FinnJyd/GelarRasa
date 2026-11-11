import type { Station } from '../data/types';
import { categoryColors } from '../shared/palette';

export type MapMode = 'daily' | 'annual';

export function referenceMarker(station: Station, mode: MapMode, annualReference: number): { color: string; radius: number } {
  if (mode === 'daily') {
    return { color: categoryColors[station.category], radius: 7 + Math.min(100, Math.max(0, station.exceedance)) / 100 * 15 };
  }
  const normalized = Math.min(1, Math.max(0, (station.average - 9) / (105 - 9)));
  return { color: station.average <= annualReference ? categoryColors.Baik : categoryColors['Sangat Tidak Sehat'], radius: 7 + normalized * 15 };
}
