import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAnalysisCache } from '../dashboard/src/data/analysis-cache';
import type { AnalysisResults, AnalysisRunner } from '../dashboard/src/data/analysis-cache';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { aggregateTemporal } from '../dashboard/src/features/temporal/aggregate';
import { aggregateDrivers } from '../dashboard/src/features/drivers/aggregate';
import { hourlyFixture } from './hourly-fixture';

const source = hourlyFixture('AQMS-JKT-01');
const results: AnalysisResults = { temporal: aggregateTemporal(source), drivers: aggregateDrivers(source) };
const stations = source.stations.map(item => item.station);
const range = { start: '2024-01-01', end: '2026-10-14' };

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => { throw new Error('Promise not initialized'); };
  const promise = new Promise<T>(complete => { resolve = complete; });
  return { promise, resolve };
}

test('startup and both tabs share one pending calculation and reuse the completed result', async () => {
  let calls = 0;
  const job = deferred<AnalysisResults>();
  const cache = createAnalysisCache(stations, range, () => { calls++; return job.promise; });
  const filters = defaultFilters();
  const startup = cache.prepare(filters);
  const temporal = cache.prepare({ ...filters });
  const drivers = cache.prepare({ ...filters, periodPreset: 'custom' });
  assert.equal(startup, temporal); assert.equal(startup, drivers);
  await Promise.resolve(); assert.equal(calls, 1);
  job.resolve(results); await startup;
  assert.equal(cache.peek(filters), results);
  assert.equal(await cache.prepare(filters), results); assert.equal(calls, 1);
  cache.destroy(); assert.equal(cache.peek(filters), null);
});

test('every effective filter invalidates the previous result and only the latest scope is retained', async () => {
  let calls = 0;
  const cache = createAnalysisCache(stations, range, async () => { calls++; return results; });
  const initial = defaultFilters();
  await cache.prepare(initial);
  for (const change of [
    { region: 'Jakarta' }, { station: 'AQMS-JKT-01' }, { siteType: 'Urban Background' },
    { startDate: '2025-01-01' }, { endDate: '2025-12-31' }, { pollutant: 'CO' }, { includeSuspect: true },
  ]) {
    const filters = { ...initial, ...change };
    await cache.prepare(filters);
    assert.equal(cache.peek(filters), results);
    assert.equal(cache.peek(initial), null);
  }
  assert.equal(calls, 8);
  cache.destroy();
});

test('obsolete work is aborted and late completion cannot overwrite a newer cached result', async () => {
  const jobs: { signal: AbortSignal; completion: ReturnType<typeof deferred<AnalysisResults>> }[] = [];
  const run: AnalysisRunner = (_request, signal) => {
    const completion = deferred<AnalysisResults>(); jobs.push({ signal, completion }); return completion.promise;
  };
  const cache = createAnalysisCache(stations, range, run);
  const first = cache.prepare(defaultFilters());
  const rejected = assert.rejects(first, { name: 'AbortError' });
  await Promise.resolve();
  const filters = { ...defaultFilters(), pollutant: 'CO' };
  const next = cache.prepare(filters);
  await Promise.resolve();
  const oldJob = jobs[0], newJob = jobs[1]; assert.ok(oldJob && newJob);
  assert.equal(oldJob.signal.aborted, true);
  newJob.completion.resolve(results); await next;
  oldJob.completion.resolve(results); await rejected;
  assert.equal(cache.peek(filters), results); assert.equal(cache.peek(defaultFilters()), null);
  cache.destroy();
});

test('failed startup can retry and disposal cancels background work and releases its result', async () => {
  let calls = 0;
  const cache = createAnalysisCache(stations, range, async () => {
    if (++calls === 1) throw new Error('Unavailable export'); return results;
  });
  await assert.rejects(cache.prepare(defaultFilters()), /Unavailable export/);
  assert.equal(cache.peek(defaultFilters()), null);
  await cache.prepare(defaultFilters()); assert.equal(calls, 2);
  cache.destroy(); assert.equal(cache.peek(defaultFilters()), null);
  await assert.rejects(cache.prepare(defaultFilters()), { name: 'AbortError' });

  const signals: AbortSignal[] = [];
  const job = deferred<AnalysisResults>();
  const pendingCache = createAnalysisCache(stations, range, (_request, current) => { signals.push(current); return job.promise; });
  const pending = pendingCache.prepare(defaultFilters());
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await Promise.resolve(); pendingCache.destroy();
  const signal = signals[0]; assert.ok(signal); assert.equal(signal.aborted, true);
  job.resolve(results); await rejected;
});
