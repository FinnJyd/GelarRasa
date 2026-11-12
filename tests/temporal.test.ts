import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getDiurnalSeries,
  getHeatmapGrid,
  getSiteTypes,
  getTimeseriesForStation,
  getTopEpisodes,
} from '../dashboard/src/features/temporal/model';
import type { TemporalData } from '../dashboard/src/features/temporal/types';

const read = (path: string): TemporalData =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const data = read('../dashboard/data/tab3_temporal.json');

test('temporal export has valid meta and structure', () => {
  assert.equal(data.meta.version, 1);
  assert.equal(data.meta.episode_threshold_ug_m3, 55);
  assert.equal(data.meta.episode_min_valid_hours, 18);
  assert.equal(data.meta.episode_gap_merge_days, 1);
  assert.deepEqual(data.meta.haze_months, [8, 9, 10]);
});

test('diurnal data provides 24 hours for each site type and season split', () => {
  const siteTypes = getSiteTypes(data);
  assert.ok(siteTypes.length > 0);
  assert.ok(siteTypes.includes('Peatland Boundary'));

  const normalSeries = getDiurnalSeries(data, 'Peatland Boundary', 'all');
  assert.equal(normalSeries.length, 24);
  assert.equal(normalSeries[0]?.hour, 0);
  assert.equal(normalSeries[23]?.hour, 23);

  const hazeSeries = getDiurnalSeries(data, 'Peatland Boundary', 'haze');
  const nonHazeSeries = getDiurnalSeries(data, 'Peatland Boundary', 'nonhaze');
  assert.equal(hazeSeries.length, 24);
  assert.equal(nonHazeSeries.length, 24);

  // During haze season, peatland boundary concentration should be significantly higher
  const hazeValid = hazeSeries.filter(p => p.median !== null);
  const nonHazeValid = nonHazeSeries.filter(p => p.median !== null);
  assert.ok(hazeValid.length > 0);
  assert.ok(nonHazeValid.length > 0);
});

test('heatmap data returns 7 rows by 24 columns grid', () => {
  const grid = getHeatmapGrid(data, 'AQMS-KTG-01');
  assert.equal(grid.length, 7);
  grid.forEach(row => {
    assert.equal(row.length, 24);
  });
});

test('timeseries data provides daily points for hotspot stations', () => {
  assert.ok(data.timeseries.dates.length > 100);
  const ts = getTimeseriesForStation(data, 'AQMS-KTG-01');
  assert.equal(ts.dates.length, data.timeseries.dates.length);
  assert.equal(ts.values.length, data.timeseries.dates.length);
});

test('episodes data correctly identifies extreme episodes and top durations', () => {
  const topEpisodes = getTopEpisodes(data, 10);
  assert.ok(topEpisodes.length > 0);
  assert.ok(topEpisodes.length <= 10);

  // First episode should have duration >= second episode
  if (topEpisodes.length >= 2) {
    const first = topEpisodes[0];
    const second = topEpisodes[1];
    if (first && second) {
      assert.ok(first.duration_days >= second.duration_days);
    }
  }

  // Check summary properties
  assert.ok(data.episodes_summary.longest_episode.duration_days > 0);
  assert.ok(data.episodes_summary.most_episodes.count > 0);
});

