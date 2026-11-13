import gzip
import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
spec = importlib.util.spec_from_file_location('hourly_export', ROOT/'scripts/export-hourly.py')
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class HourlyExportTests(unittest.TestCase):
    def test_all_hourly_shards_match_production_daily_and_eight_hour_series(self):
        folder = ROOT/'dataset/dashboard/hourly'
        manifest = json.loads((folder/'manifest.json').read_text())
        daily = json.loads((ROOT/'dataset/dashboard/compliance_daily.json').read_text())
        self.assertEqual(manifest['dates'], daily['dates'])
        for code, station in manifest['stations'].items():
            for mode in ('v', 's'):
                content = (folder/f'{code}-{mode}.bin').read_bytes()
                self.assertEqual(hashlib.sha256(content).hexdigest(), station['hashes'][mode])
                self.assertEqual(content, (ROOT/'dashboard/data/hourly'/f'{code}-{mode}.bin').read_bytes())
                hours = np.frombuffer(gzip.decompress(content), dtype='<f8').reshape(-1,24,10)
                for column, pollutant in enumerate(exporter.compliance.POLLUTANTS):
                    values = hours[:,:,column]
                    counts = np.isfinite(values).sum(axis=1)
                    means = np.divide(np.nansum(values,axis=1), counts, out=np.full(len(counts),np.nan),where=counts>=18)
                    expected = np.array([np.nan if v is None else v for v in daily['stations'][code]['pollutants'][pollutant][mode]])
                    np.testing.assert_array_equal(np.isnan(means),np.isnan(expected))
                    np.testing.assert_allclose(means,expected,atol=1e-6,rtol=0,equal_nan=True)
                    if pollutant in ('CO','O3'):
                        windows = np.lib.stride_tricks.sliding_window_view(values,8,axis=1)
                        complete = np.isfinite(windows).all(axis=2)
                        averages = np.where(complete,windows.sum(axis=2)/8,-np.inf)
                        maxima = np.where(complete.sum(axis=1)>=13,averages.max(axis=1),np.nan)
                        expected = np.array([np.nan if v is None else v for v in daily['stations'][code]['pollutants'][pollutant]['max8'][mode]])
                        np.testing.assert_array_equal(np.isnan(maxima),np.isnan(expected))
                        np.testing.assert_allclose(maxima,expected,atol=1e-6,rtol=0,equal_nan=True)

    def test_rejection_counts_and_shared_eligibility_keep_zeros_and_reject_all_duplicate_rows(self):
        sites = exporter.compliance.records(ROOT/'dataset/raw/master/sites.csv')
        site = next(site for site in sites if site['station_code']=='AQMS-JKT-01')
        rows = [dict(timestamp_start=f'2024-01-01 {hour:02}:00:00',qc_flag='VALID',pm25_ug_m3=value)
                for hour,value in enumerate(['0','-1','NaN','Infinity','10000'])]
        rows.append(dict(rows[4],qc_flag='CALIBRATION'))
        accepted = list(exporter.compliance.eligible_values(rows,site,'pm25',{'2024-01-01'}))
        self.assertEqual([value for _,_,value in accepted],[0])
        report = exporter.rejection_report(rows,site,{'2024-01-01'})
        self.assertEqual(sum(report[key] for key in ['qc','duplicate','timestamp','outside_calendar','eligible_records']),len(rows))
        self.assertEqual(report['missing_raw_hours'],19)
        self.assertEqual(report['pollutants']['PM2.5']['invalid_value'],3)


if __name__ == '__main__':
    unittest.main()
