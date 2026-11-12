import csv
from collections import Counter, defaultdict
import math
import statistics
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from unit_normalization import concentration_column, APPROVED_LOGGERS

FACTORS = {'pm25': 1000, 'pm10': 1000, 'so2': 64.066 / 24.45 * 1000,
           'co': 28.010 / 24.45 * 1000, 'o3': 48.000 / 24.45 * 1000, 'no2': 46.006 / 24.45 * 1000}
NAMES = {'pm25': 'PM2.5', 'pm10': 'PM10', 'so2': 'SO2', 'co': 'CO', 'o3': 'O3', 'no2': 'NO2'}


class UnitNormalizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (ROOT / 'dataset/raw/master/sites.csv').open(encoding='utf-8-sig') as handle:
            cls.sites = {row['station_code']: row for row in csv.DictReader(handle)}

    def test_particulate_and_gas_factors_are_limited_to_approved_loggers(self):
        for code in APPROVED_LOGGERS:
            site = self.sites[code]
            for pollutant, factor in FACTORS.items():
                self.assertEqual(concentration_column(site, pollutant, [f'{pollutant}_ppm']), (f'{pollutant}_ppm', factor))
        for pollutant in FACTORS:
            site = {**self.sites['AQMS-JKT-01'], f'{pollutant}_unit': 'ppm'}
            self.assertIsNone(concentration_column(site, pollutant, [f'{pollutant}_ppm']))
            self.assertEqual(concentration_column(self.sites['AQMS-JKT-01'], pollutant, [f'{pollutant}_ug_m3']), (f'{pollutant}_ug_m3', 1.0))

    def test_exported_logger_daily_means_agree_across_tabs(self):
        compliance = json.loads((ROOT / 'dashboard/data/compliance_daily.json').read_text(encoding='utf-8'))
        health = json.loads((ROOT / 'dashboard/data/health_exposure.json').read_text(encoding='utf-8'))
        overview = json.loads((ROOT / 'dashboard/tab1_ikhtisar.json').read_text(encoding='utf-8'))['daily_cube']
        self.assertEqual(compliance['dates'], health['dates'])
        self.assertEqual(compliance['dates'], overview['dates'])
        for code in APPROVED_LOGGERS:
            for pollutant, name in NAMES.items():
                for mode in ['v', 's']:
                    values = compliance['stations'][code]['pollutants'][name][mode]
                    indices = [i for i, value in enumerate(values) if value is not None][:3]
                    self.assertEqual(len(indices), 3)
                    for index in indices:
                        reference = values[index]
                        self.assertAlmostEqual(health['stations'][code][mode][pollutant][index], reference, delta=.0051)
                        self.assertAlmostEqual(overview['stations'][code][mode][pollutant][index], reference, delta=.051)
                self.assertNotIn(pollutant, health['stations'][code]['unavailable'])
                self.assertNotIn(pollutant, overview['stations'][code]['unavailable'])

    def test_first_day_means_are_scaled_from_original_logger_records(self):
        data = json.loads((ROOT / 'dashboard/data/compliance_daily.json').read_text(encoding='utf-8'))
        day = data['dates'][0]
        for code in APPROVED_LOGGERS:
            path = next((ROOT / 'dataset/raw/aqms').glob(code.removeprefix('AQMS-') + '*.csv'))
            with path.open(encoding='utf-8-sig') as handle:
                rows = list(csv.DictReader(handle))
            duplicates = Counter(row['timestamp_start'] for row in rows)
            for pollutant, factor in FACTORS.items():
                hourly = defaultdict(list)
                for row in rows:
                    if row['qc_flag'] != 'VALID' or not row['timestamp_start'].startswith(day) or duplicates[row['timestamp_start']] > 1:
                        continue
                    try:
                        value = float(row[f'{pollutant}_ppm'])
                    except ValueError:
                        continue
                    if math.isfinite(value) and value >= 0:
                        hourly[row['timestamp_start'][11:13]].append(value * factor)
                self.assertGreaterEqual(len(hourly), 18)
                expected = statistics.mean(statistics.mean(values) for values in hourly.values())
                self.assertAlmostEqual(data['stations'][code]['pollutants'][NAMES[pollutant]]['v'][0], expected, places=5)


if __name__ == '__main__':
    unittest.main()
