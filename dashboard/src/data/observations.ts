import type { MeasuredStationObservation, StationObservation } from './types';

export function hasMeasurements(station: StationObservation): station is MeasuredStationObservation {
  return station.measuredDays > 0 && station.average !== null && station.exceedance !== null && station.category !== null;
}
