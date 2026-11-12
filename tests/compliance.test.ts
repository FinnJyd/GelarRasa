import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDashboard } from '../dashboard/src/data/validate';
import { defaultFilters } from '../dashboard/src/features/overview/model';
import { parseCompliance } from '../dashboard/src/features/compliance/load';
import { annualAssessment, annualDisplayRows, categoryIndex, defaultComparisonCodes, stationComparisons, distributionRows, selectRows, splitRankings } from '../dashboard/src/features/compliance/model';
import { POLLUTANTS } from '../dashboard/src/data/types';
import { REFERENCES } from '../dashboard/src/features/compliance/pollutants';
import { estimateIku, ikuCategory, ikuScore } from '../dashboard/src/features/compliance/iku';

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = parseCompliance(read('../dashboard/data/compliance_daily.json'));
const catalog = parseDashboard(read('../dashboard/tab1_ikhtisar.json'), read('../dashboard/data/station_catalog.json')).stations;

test('compliance export includes approved particulate loggers while retaining genuine missing days', () => {
  assert.equal(Object.keys(data.stations).length, catalog.length);
  assert.equal(data.dates.length, 1018);
  assert.ok(Object.values(data.stations).every(row => !row.pollutants['PM2.5'].reason));
  assert.equal(selectRows(data, catalog, defaultFilters()).filter(row => row.mean !== null).length, 26);
  for (const station of Object.values(data.stations)) for (const row of Object.values(station.pollutants)) {
    assert.equal(row.v.length, data.dates.length);
    assert.equal(row.s.length, data.dates.length);
    if (row.reason) assert.ok([...row.v, ...row.s].every(value => value === null));
  }
});

test('period selection uses only observed days and preserves missing means instead of substituting zero', () => {
  const selected = selectRows(data, catalog, { ...defaultFilters(), station: 'AQMS-JKT-01', startDate: '2024-01-01', endDate: '2024-01-03' });
  const values = data.stations['AQMS-JKT-01']?.pollutants['PM2.5'].v.slice(0, 3).filter(value => value !== null) ?? [];
  assert.equal(selected.length, 1);
  assert.equal(selected[0]?.days, values.length);
  assert.equal(selected[0]?.mean, values.reduce((a, b) => a + b, 0) / values.length);
  assert.equal(selected[0]?.categories.reduce((a, b) => a + b, 0), values.length);
  const unavailable = selectRows(data, catalog, { ...defaultFilters(), station: 'AQMS-JMB-02' });
  assert.equal(unavailable[0]?.mean, null);
  assert.equal(unavailable[0]?.days, 0);
  assert.ok(selectRows(data, catalog, { ...defaultFilters(), startDate: '2025-01-01', endDate: '2024-01-01' }).every(row => row.mean === null));
});

test('daily PM2.5 categories respect the concentration boundaries including zero', () => {
  assert.deepEqual([0, 15.5, 15.6, 55.4, 55.5, 150.4, 150.5, 250.4, 250.5].map(value => categoryIndex(value)), [0, 0, 1, 1, 2, 2, 3, 3, 4]);
});

test('rankings remain disjoint with small and full selections', () => {
  const rows = selectRows(data, catalog, defaultFilters());
  const full = splitRankings(rows);
  assert.equal(full.high.length, 10);
  assert.equal(full.low.length, 10);
  assert.equal(new Set([...full.high, ...full.low].map(row => row.station.code)).size, 20);
  const single = splitRankings(rows.slice(0, 1));
  assert.equal(single.high.length, 1);
  assert.equal(single.low.length, 0);
});

test('priority distribution selects at most ten worst daily shares while all mode retains eligible stations', () => {
  const rows = selectRows(data, catalog, defaultFilters());
  const all = distributionRows(rows, 'all');
  const priority = distributionRows(rows, 'priority');
  assert.equal(all.length, 26);
  assert.equal(priority.length, 10);
  assert.deepEqual(priority, all.slice(0, 10));
  const share = (row: typeof all[number]): number => row.categories.slice(2).reduce((sum, count) => sum + count, 0) / row.days;
  assert.ok(all.every((row, i) => i === 0 || share(row) <= share(all[i - 1] ?? row)));
  assert.deepEqual(distributionRows(rows.filter(row => row.mean === null), 'priority'), []);
  assert.equal(distributionRows(rows.slice(0, 1), 'priority').length, 1);
});

test('year comparisons keep fixed Jan–14 Oct periods but follow station and QC selections', () => {
  const state = { ...defaultFilters(), station: 'AQMS-JKT-01' };
  const years = stationComparisons(data, catalog, state)[0]?.years ?? [];
  assert.deepEqual(years.map(row => row.year), [2024, 2025, 2026]);
  assert.deepEqual(years, stationComparisons(data, catalog, { ...state, startDate: '2026-05-01', endDate: '2026-05-03' })[0]?.years);
  for (const year of years) {
    const rows = selectRows(data, catalog, { ...state, startDate: `${year.year}-01-01`, endDate: `${year.year}-10-14` });
    assert.equal(year.days, rows[0]?.days);
    assert.equal(year.exceed, rows[0]?.exceed);
    assert.equal(year.rate, year.days ? year.exceed / year.days * 100 : null);
  }
});

test('malformed exports fail before being used as typed compliance data', () => {
  const original = read('../dashboard/data/compliance_daily.json');
  assert.ok(original && typeof original === 'object');
  assert.throws(() => parseCompliance({ ...original, version: 1 }));
  assert.throws(() => parseCompliance({ ...original, dates: ['2024-02-30'] }));
  const pollutants = Object.fromEntries(POLLUTANTS.map(name => [name, { reason: '', v: [0], s: [0], max8: name === 'CO' || name === 'O3' ? { v: [0], s: [0] } : null }]));
  const payload = { version: 2, method: '', dates: ['2024-01-01'], stations: { bad: { pollutants } } };
  assert.doesNotThrow(() => parseCompliance(payload));
  assert.throws(() => parseCompliance({ ...payload, stations: { bad: { pollutants: { ...pollutants, SO2: { reason: '', v: [NaN], s: [0], max8: null } } } } }));
  assert.throws(() => parseCompliance({ ...payload, stations: { bad: { pollutants: { ...pollutants, SO2: { reason: 'ppm', v: [2], s: [null], max8: null } } } } }));
  assert.throws(() => parseCompliance({ ...payload, stations: { bad: { pollutants: { ...pollutants, CO: { reason: '', v: [0], s: [0], max8: null } } } } }));
});

test('station comparisons retain every selected station and effective pollutant/QC denominators', () => {
  for (const pollutant of POLLUTANTS) for (const includeSuspect of [false, true]) {
    const state = { ...defaultFilters(), pollutant, includeSuspect };
    const comparisons = stationComparisons(data, catalog, state);
    assert.equal(comparisons.length, catalog.length);
    for (const year of [2024, 2025, 2026]) {
      const rows = selectRows(data, catalog, { ...state, startDate: `${year}-01-01`, endDate: `${year}-10-14` });
      for (const row of rows) {
        const actual = comparisons.find(item => item.station.code === row.station.code)?.years.find(item => item.year === year);
        assert.equal(actual?.days, row.comparisonDays); assert.equal(actual?.exceed, row.exceed);
        assert.equal(actual?.rate, row.comparisonDays ? row.exceed / row.comparisonDays * 100 : null);
      }
    }
    const missing = comparisons.find(row => row.station.code === 'AQMS-JMB-02');
    assert.equal(missing?.pattern, 'Data tidak lengkap'); assert.equal(missing?.change2426, null);

  }
});

test('comparison defaults contain four explicit stations and remain inside scoped station choices', () => {
  const rows = stationComparisons(data, catalog, defaultFilters());
  assert.deepEqual(defaultComparisonCodes(rows), ['AQMS-SM2-01', 'AQMS-KTG-01', 'AQMS-PLB-01', 'AQMS-BJB-01']);
  const regional = stationComparisons(data, catalog, { ...defaultFilters(), region: 'Jakarta' });
  const defaults = defaultComparisonCodes(regional);
  assert.equal(defaults.length, 3); assert.equal(new Set(defaults).size, 3);
  assert.ok(defaults.every(code => regional.some(row => row.station.code === code)));
  assert.deepEqual(defaultComparisonCodes([]), []);
  const missing = stationComparisons(data, catalog, { ...defaultFilters(), station: 'AQMS-JMB-02' });
  assert.deepEqual(defaultComparisonCodes(missing), ['AQMS-JMB-02']);
});

test('annual comparison cannot classify partial years or incomplete data as compliant', () => {
  const row = selectRows(data, catalog, { ...defaultFilters(), station: 'AQMS-JKT-01' })[0];
  assert.ok(row);
  assert.equal(annualAssessment({ ...row, mean: 15, days: 365 }, '2025', '2026-10-14'), 'within');
  assert.equal(annualAssessment({ ...row, mean: 15.01, days: 365 }, '2025', '2026-10-14'), 'above');
  assert.equal(annualAssessment({ ...row, mean: 1, days: 200 }, '2025', '2026-10-14'), 'partial');
  assert.equal(annualAssessment({ ...row, mean: 1, days: 287 }, '2026', '2026-10-14'), 'partial');
  assert.equal(annualAssessment({ ...row, mean: null, days: 0 }, '2025', '2026-10-14'), 'unavailable');
  assert.equal(annualAssessment({ ...row, mean: 44, days: 365 }, '2025', '2026-10-14', 'SO2'), 'within');
  assert.equal(annualAssessment(row, '2025', '2026-10-14', 'CO'), 'unavailable');
});

test('annual display defaults to the ten highest measured means and all mode retains the full measured scope', () => {
  const rows = selectRows(data, catalog, { ...defaultFilters(), startDate: '2025-01-01', endDate: '2025-12-31' });
  const measured = rows.filter(row => row.mean !== null);
  assert.ok(measured.length > 10);
  const input = [...rows].reverse(); const originalCodes = input.map(row => row.station.code);
  const top = annualDisplayRows(input, 'top');
  assert.equal(top.length, 10); assert.deepEqual(top, measured.slice(0, 10));
  assert.deepEqual(annualDisplayRows(input, 'all'), measured);
  assert.deepEqual(input.map(row => row.station.code), originalCodes);
  assert.equal(annualDisplayRows(rows.slice(0, 1), 'top').length, 1);
  assert.deepEqual(annualDisplayRows(rows.filter(row => row.mean === null), 'top'), []);
  assert.deepEqual(annualDisplayRows([], 'all'), []);
});

test('six pollutant selections use their actual series, categories, and regulatory averaging periods', () => {
  for (const pollutant of POLLUTANTS) for (const includeSuspect of [false, true]) {
    const state = { ...defaultFilters(), station: 'AQMS-JKT-01', pollutant, includeSuspect, startDate: '2024-01-01', endDate: '2024-01-03' };
    const source = data.stations[state.station]?.pollutants[pollutant]; assert.ok(source);
    const mode = includeSuspect ? 's' : 'v';
    const values = source[mode].slice(0, 3).filter(value => value !== null);
    const reference = REFERENCES[pollutant];
    const comparisons = (reference.hours === 8 ? source.max8?.[mode] : source[mode])?.slice(0, 3).filter(value => value !== null) ?? [];
    const row = selectRows(data, catalog, state)[0]; assert.ok(row);
    assert.equal(row.mean, values.reduce((sum, value) => sum + value, 0) / values.length);
    assert.equal(row.comparisonDays, comparisons.length);
    assert.equal(row.exceed, comparisons.filter(value => value > reference.daily).length);
    for (let i = 0; i < 5; i++) assert.equal(row.categories[i], values.filter(value => categoryIndex(value, pollutant) === i).length);
  }
  assert.ok((selectRows(data, catalog, { ...defaultFilters(), station: 'AQMS-BJB-01', pollutant: 'NO2' })[0]?.mean ?? 0) > 0);
  assert.equal(selectRows(data, catalog, { ...defaultFilters(), pollutant: 'NO2' }).filter(row => row.mean !== null).length, 26);
});

test('IKU matches the reference formula and category boundaries without clamping', () => {
  assert.ok(Math.abs(ikuScore(40, 20) - 50) < 1e-10);
  assert.ok(Math.abs(ikuScore(13.53, 7.90) - 85.19) < .02);
  assert.deepEqual([0, 25, 50, 70, 90, 100, -1, 101].map(ikuCategory), ['Sangat Kurang', 'Kurang', 'Sedang', 'Baik', 'Sangat Baik', 'Sangat Baik', 'Di luar rentang 0–100', 'Di luar rentang 0–100']);
  assert.ok(ikuScore(0, 0) > 100);
});

test('IKU computes each station from paired NO2/SO2 days and follows the actual filter scope', () => {
  const state = { ...defaultFilters(), region: 'Jakarta', startDate: '2024-01-01', endDate: '2024-01-03' };
  const results = estimateIku(data, catalog, state);
  assert.equal(results.length, 3);
  for (const result of results) {
    const source = data.stations[result.station.code]?.pollutants; assert.ok(source);
    const n: number[] = []; const s: number[] = [];
    for (let i = 0; i < 3; i++) { const no2 = source.NO2.v[i]; const so2 = source.SO2.v[i]; if (no2 !== null && no2 !== undefined && so2 !== null && so2 !== undefined) { n.push(no2); s.push(so2); } }
    const no2 = n.reduce((a, b) => a + b, 0) / n.length;
    const so2 = s.reduce((a, b) => a + b, 0) / s.length;
    assert.equal(result.no2, no2); assert.equal(result.so2, so2);
    assert.equal(result.score, ikuScore(no2, so2)); assert.equal(result.days, n.length);
  }
  assert.deepEqual(estimateIku(data, catalog, { ...state, pollutant: 'CO' }), results);
  const single = estimateIku(data, catalog, { ...state, station: 'AQMS-JKT-01' });
  assert.equal(single.length, 1); assert.equal(single[0]?.station.code, 'AQMS-JKT-01');
  assert.equal(estimateIku(data, catalog, { ...state, startDate: '2026-10-14', endDate: '2024-01-01' })[0]?.score, null);
  assert.ok(estimateIku(data, catalog, { ...defaultFilters(), station: 'AQMS-BJB-01' })[0]?.score !== null);
  const unavailable = estimateIku(data, catalog, { ...defaultFilters(), station: 'AQMS-JMB-02' })[0];
  assert.equal(unavailable?.score, null); assert.equal(unavailable?.days, 0);
});
