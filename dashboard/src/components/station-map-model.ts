import type { StationObservation } from '../data/types';
import { categoryColors, unavailableColor } from '../shared/palette';

export type MapMode = 'daily' | 'annual';

export function referenceMarker(station: Pick<StationObservation, 'average' | 'category' | 'exceedance'>, mode: MapMode, annualReference: number): { color: string; radius: number } {
  if (station.average === null || station.category === null || station.exceedance === null) return { color: unavailableColor, radius: 7 };
  if (mode === 'daily') {
    return { color: categoryColors[station.category], radius: 7 + Math.min(100, Math.max(0, station.exceedance)) / 100 * 15 };
  }
  const normalized = Math.min(1, Math.max(0, (station.average - 9) / (105 - 9)));
  return { color: station.average <= annualReference ? categoryColors.Baik : categoryColors['Sangat Tidak Sehat'], radius: 7 + normalized * 15 };
}
