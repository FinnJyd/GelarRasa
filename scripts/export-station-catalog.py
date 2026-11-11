"""Export station dimensions from the supplied master table without changing measurements."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def export_catalog():
    source = ROOT / 'dataset/raw/master/sites.csv'
    with source.open(encoding='utf-8-sig', newline='') as handle:
        records = list(csv.DictReader(handle))
    catalog = []
    codes = set()
    for row in records:
        code = row['station_code']
        if code in codes:
            raise ValueError(f'Duplicate station: {code}')
        codes.add(code)
        catalog.append({
            'code': code,
            'city': row['kota_kabupaten'],
            'province': row['provinsi'],
            'region': row['region_group'],
            'siteType': row['site_type'],
            'notes': row['notes'],
            'latitude': float(row['latitude_dd']),
            'longitude': float(row['longitude_dd']),
        })
    content = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
    for relative in ['dataset/dashboard/station_catalog.json', 'dashboard/data/station_catalog.json']:
        target = ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding='utf-8')
    print(f'Exported {len(catalog)} station dimensions from {source.relative_to(ROOT)}')


if __name__ == '__main__':
    export_catalog()
