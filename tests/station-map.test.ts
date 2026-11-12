import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { referenceMarker } from '../dashboard/src/components/station-map-model';
import { parseDashboard } from '../dashboard/src/data/validate';
import { categoryColors, unavailableColor } from '../dashboard/src/shared/palette';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = parseDashboard(read('../dashboard/tab1_ikhtisar.json'), read('../dashboard/data/station_catalog.json'));
const station = data.stations[0];
if (!station) throw new Error('Expected supplied station data');

test('daily reference encodes category and frequency, independently of period concentration', () => {
  assert.deepEqual(referenceMarker({ ...station, average: 500, exceedance: 0 }, 'daily', 15), { color: categoryColors[station.category], radius: 7 });
  assert.equal(referenceMarker({ ...station, exceedance: 100 }, 'daily', 15).radius, 22);
  assert.equal(referenceMarker({ ...station, exceedance: 50 }, 'daily', 15).radius, 14.5);
});

test('annual reference includes the threshold and uses a fixed concentration scale across filters', () => {
  assert.equal(referenceMarker({ ...station, average: 15 }, 'annual', 15).color, categoryColors.Baik);
  assert.equal(referenceMarker({ ...station, average: 15.01 }, 'annual', 15).color, categoryColors['Sangat Tidak Sehat']);
  assert.equal(referenceMarker({ ...station, average: 0 }, 'annual', 15).radius, 7);
  assert.equal(referenceMarker({ ...station, average: 1000 }, 'annual', 15).radius, 22);
  assert.equal(data.stations.filter(row => row.average <= data.reference.annual).length, 3);
});

test('missing observations use a neutral fixed-size marker in both map modes', () => {
  const missing = { average: null, category: null, exceedance: null };
  for (const mode of ['daily', 'annual'] as const) assert.deepEqual(referenceMarker(missing, mode, 15), { color: unavailableColor, radius: 7 });
});
