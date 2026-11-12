"""Check source-to-export values and eight-hour completeness independently."""
import csv
import datetime as dt
import hashlib
import importlib.util
import json
import sys
import unittest
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('compliance_export', ROOT / 'scripts/export-compliance.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ComplianceExportTest(unittest.TestCase):
    def test_eight_hours_preserve_gaps_and_require_thirteen_complete_windows(self):
        day = '2024-01-01'
        hours = {(day, h): [float(h)] for h in range(24)}
        mean, maximum = module.aggregate_hours(hours, [day], True)
        self.assertEqual(mean, [11.5])
        self.assertEqual(maximum, [19.5])
        del hours[(day, 12)]
        self.assertEqual(module.aggregate_hours(hours, [day], True)[1], [None])
        hours = {(day, h): [0.] for h in range(4, 24)}
        self.assertEqual(module.aggregate_hours(hours, [day], True)[1], [0.])
        del hours[(day, 4)]
        self.assertEqual(module.aggregate_hours(hours, [day], True)[1], [None])

    def test_export_matches_raw_samples_with_qc_units_and_window_denominators(self):
        export = json.loads((ROOT / 'dashboard/data/compliance_daily.json').read_text(encoding='utf-8'))
        for code, filename, factor in [('AQMS-JKT-01', 'JKT-01_Gambir_AQMS.csv', 1), ('AQMS-BJB-01', 'BJB-01_Banjarbaru_AQMS.csv', 1000), ('AQMS-PLB-01', 'PLB-01_TalangBetutu_AQMS.csv', 1)]:
            with (ROOT / 'dataset/raw/aqms' / filename).open(encoding='utf-8-sig', newline='') as handle:
                rows = list(csv.DictReader(handle))
            duplicates = Counter(row['timestamp_start'] for row in rows)
            for pollutant, key in [('PM2.5', 'pm25'), ('NO2', 'no2'), ('SO2', 'so2'), ('CO', 'co'), ('O3', 'o3')]:
                column = key + ('_ppm' if factor == 1000 else '_ug_m3')
                multiplier = ({'pm25': 1000, 'no2': 46.006 / 24.45 * 1000, 'so2': 64.066 / 24.45 * 1000,
                               'co': 28.010 / 24.45 * 1000, 'o3': 48 / 24.45 * 1000}[key] if factor == 1000 else 1)
                for mode, flags in [('v', {'VALID'}), ('s', {'VALID', 'SUSPECT'})]:
                    for day in ['2024-01-01', '2025-06-01', '2026-10-14']:
                        by_hour = defaultdict(list)
                        for row in rows:
                            if not row['timestamp_start'].startswith(day) or row['qc_flag'] not in flags or duplicates[row['timestamp_start']] != 1:
                                continue
                            try:
                                value = float(row[column]) * multiplier
                            except ValueError:
                                continue
                            if not 0 <= value < float('inf'):
                                continue
                            by_hour[dt.datetime.fromisoformat(row['timestamp_start']).hour].append(value)
                        means = {h: sum(values) / len(values) for h, values in by_hour.items()}
                        expected = round(sum(means.values()) / len(means), 6) if len(means) >= 18 else None
                        i = export['dates'].index(day)
                        self.assertEqual(export['stations'][code]['pollutants'][pollutant][mode][i], expected)
                        if pollutant in ('CO', 'O3'):
                            windows = []
                            for start in range(17):
                                window = [means.get(h) for h in range(start, start + 8)]
                                if None not in window:
                                    windows.append(sum(window) / 8)
                            expected = round(max(windows), 6) if len(windows) >= 13 else None
                            self.assertEqual(export['stations'][code]['pollutants'][pollutant]['max8'][mode][i], expected)

    def test_source_hashes_and_export_copies_match(self):
        path = ROOT / 'dashboard/data/compliance_daily.json'
        self.assertEqual(path.read_bytes(), (ROOT / 'dataset/dashboard/compliance_daily.json').read_bytes())
        for relative, digest in json.loads(path.read_text())['sources'].items():
            self.assertEqual(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest(), digest)


if __name__ == '__main__':
    unittest.main()
