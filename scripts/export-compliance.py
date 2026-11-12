"""Export six daily pollutants and CO/O3 eight-hour maxima from raw AQMS."""
import csv
import datetime as dt
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from unit_normalization import concentration_column, LOGGER_NORMALIZATION

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'dataset/raw'
POLLUTANTS = {'PM2.5': 'pm25', 'PM10': 'pm10', 'SO2': 'so2', 'CO': 'co', 'O3': 'o3', 'NO2': 'no2'}


def aggregate_hours(hourly, dates, eight_hour=False):
    daily = defaultdict(dict)
    for (day, hour), values in hourly.items():
        daily[day][hour] = sum(values) / len(values)
    means, maxima = [], []
    for day in dates:
        hours = daily[day]
        means.append(round(sum(hours.values()) / len(hours), 6) if len(hours) >= 18 else None)
        if eight_hour:
            windows = [sum(hours[h] for h in range(start, start + 8)) / 8 for start in range(17)
                       if all(h in hours for h in range(start, start + 8))]
            maxima.append(round(max(windows), 6) if len(windows) >= 13 else None)
    return means, maxima


def records(path):
    with path.open(encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def export():
    sites = records(RAW / 'master/sites.csv')
    sensors = records(RAW / 'master/sensors.csv')
    dates_meta = records(RAW / 'metadata/metadata_dates.csv')
    start = min(dt.datetime.fromisoformat(r['date_start']).date() for r in dates_meta)
    end = max(dt.datetime.fromisoformat(r['date_end']).date() for r in dates_meta)
    dates = [(start + dt.timedelta(days=i)).isoformat() for i in range((end - start).days + 1)]
    index = {day: i for i, day in enumerate(dates)}
    locations = {r['location_id']: r for r in sites}
    sensor_sites = {r['sensor_id']: locations[r['location_id']] for r in sensors}
    stations = {}
    for path in sorted((RAW / 'aqms').glob('*.csv')):
        rows = records(path)
        ids = {r['sensor_id'] for r in rows}
        if len(ids) != 1 or not ids.issubset(sensor_sites):
            raise ValueError(f'Unknown/mixed sensor in {path}')
        site = sensor_sites[ids.pop()]
        code = site['station_code']
        if code in stations:
            raise ValueError(f'Duplicate station {code}')
        duplicates = Counter(r['timestamp_start'] for r in rows)
        pollutants = {}
        for name, key in POLLUTANTS.items():
            column = concentration_column(site, key, rows[0])
            output = {'reason': '' if column else f'Satuan {name} belum didukung kebijakan normalisasi.',
                      'v': [None] * len(dates), 's': [None] * len(dates), 'max8': None}
            eight_hour = name in ('CO', 'O3')
            if eight_hour:
                output['max8'] = {'v': [None] * len(dates), 's': [None] * len(dates)}
            hourly = {'v': defaultdict(list), 's': defaultdict(list)}
            for row in rows if column else []:
                source_column, factor = column
                if row['qc_flag'] not in ('VALID', 'SUSPECT') or duplicates[row['timestamp_start']] > 1:
                    continue
                try:
                    timestamp = dt.datetime.fromisoformat(row['timestamp_start'])
                    value = float(row[source_column]) * factor
                except ValueError:
                    continue
                if timestamp.date().isoformat() not in index or not math.isfinite(value) or value < 0:
                    continue
                key = (timestamp.date().isoformat(), timestamp.hour)
                for mode in (('v', 's') if row['qc_flag'] == 'VALID' else ('s',)):
                    hourly[mode][key].append(value)
            for mode in ('v', 's'):
                output[mode], maxima = aggregate_hours(hourly[mode], dates, eight_hour)
                if eight_hour:
                    output['max8'][mode] = maxima
            pollutants[name] = output
        stations[code] = {'pollutants': pollutants}
    if set(stations) != {r['station_code'] for r in sites}:
        raise ValueError('Station master/export mismatch')
    sources = list((RAW / 'master').glob('*.csv')) + list((RAW / 'metadata').glob('*.csv')) + list((RAW / 'aqms').glob('*.csv'))
    payload = {'version': 2, 'dates': dates, 'stations': stations,
               'method': 'Six pollutants in ug/m3; approved BJB/MDN/PSW particulate mass-scale x1000 and gas ppmv * molar_mass/24.45 *1000 at assumed 25 C/1 atm; recorded local WIB date; duplicate timestamps excluded; hourly means; >=18 distinct eligible hours/day; CO/O3 max8 uses 17 within-day rolling windows of 8 complete consecutive hours, >=13 windows/day; no imputation; v=VALID, s=VALID+SUSPECT.',
               'unit_normalization': LOGGER_NORMALIZATION,
               'sources': {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}}
    content = json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n'
    for relative in ['dataset/dashboard/compliance_daily.json', 'dashboard/data/compliance_daily.json']:
        (ROOT / relative).write_text(content, encoding='utf-8')
    print(f'Exported {len(stations)} stations, {len(dates)} days, six pollutants, {len(content.encode()):,} bytes')


if __name__ == '__main__':
    export()
