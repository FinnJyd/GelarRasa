"""Normalized hourly dashboard shards for interactive temporal/driver filtering."""
import array
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import math
import shutil
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('compliance_export', ROOT / 'scripts/export-compliance.py')
compliance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compliance)
RAW = ROOT / 'dataset/raw'
WEATHER = ['temperature_c', 'humidity_pct', 'wind_speed_ms', 'wind_direction_deg']
COLUMNS = list(compliance.POLLUTANTS) + WEATHER


def rejection_report(rows, site, dates):
    duplicates = compliance.Counter(row['timestamp_start'] for row in rows)
    result = dict(total=len(rows), qc=0, duplicate=0, timestamp=0, outside_calendar=0, eligible_records=0)
    raw_hours = set()
    for row in rows:
        try:
            timestamp = dt.datetime.fromisoformat(row['timestamp_start'])
        except ValueError:
            timestamp = None
        if timestamp and timestamp.date().isoformat() in dates:
            raw_hours.add((timestamp.date().isoformat(), timestamp.hour))
        if row['qc_flag'] not in ('VALID', 'SUSPECT'):
            result['qc'] += 1
        elif duplicates[row['timestamp_start']] > 1:
            result['duplicate'] += 1
        elif timestamp is None:
            result['timestamp'] += 1
        elif timestamp.date().isoformat() not in dates:
            result['outside_calendar'] += 1
        else:
            result['eligible_records'] += 1
    result['missing_raw_hours'] = len(dates)*24-len(raw_hours)
    result['pollutants'] = {}
    for name, key in compliance.POLLUTANTS.items():
        count = sum(1 for _ in compliance.eligible_values(rows, site, key, dates))
        supported = compliance.concentration_column(site, key, rows[0]) if rows else None
        result['pollutants'][name] = {'eligible_records': count,
            'invalid_value': result['eligible_records']-count if supported else 0,
            'unsupported_unit': 0 if supported else result['eligible_records']}
    return result


def export():
    sites = compliance.records(RAW / 'master/sites.csv')
    locations = {site['location_id']: site for site in sites}
    sensors = {sensor['sensor_id']: locations[sensor['location_id']]
               for sensor in compliance.records(RAW / 'master/sensors.csv')}
    dates_meta = compliance.records(RAW / 'metadata/metadata_dates.csv')
    start = min(dt.datetime.fromisoformat(row['date_start']).date() for row in dates_meta)
    end = max(dt.datetime.fromisoformat(row['date_end']).date() for row in dates_meta)
    dates = [(start + dt.timedelta(days=i)).isoformat() for i in range((end-start).days+1)]
    index = {day: i for i, day in enumerate(dates)}
    output = ROOT / 'dataset/dashboard/hourly'
    output.mkdir(parents=True, exist_ok=True)
    stations = {}
    for path in sorted((RAW / 'aqms').glob('*.csv')):
        rows = compliance.records(path)
        ids = {row['sensor_id'] for row in rows}
        if len(ids) != 1 or not ids.issubset(sensors):
            raise ValueError(f'Unresolved sensor: {path}')
        site = sensors[ids.pop()]
        code = site['station_code']
        if code in stations:
            raise ValueError(f'Duplicate station: {code}')
        modes = {mode: array.array('d', [math.nan]) * (len(dates)*24*len(COLUMNS)) for mode in ('v', 's')}
        for column, (name, key) in enumerate(compliance.POLLUTANTS.items()):
            buckets = {mode: defaultdict(list) for mode in modes}
            for row, timestamp, value in compliance.eligible_values(rows, site, key, index):
                hour = index[timestamp.date().isoformat()] * 24 + timestamp.hour
                for mode in (('v', 's') if row['qc_flag'] == 'VALID' else ('s',)):
                    buckets[mode][hour].append(value)
            for mode, hours in buckets.items():
                for hour, values in hours.items():
                    modes[mode][hour*len(COLUMNS)+column] = sum(values)/len(values)
        duplicates = compliance.Counter(row['timestamp_start'] for row in rows)
        weather = {mode: defaultdict(lambda: defaultdict(list)) for mode in modes}
        for row in rows:
            if row['qc_flag'] not in ('VALID', 'SUSPECT') or duplicates[row['timestamp_start']] > 1:
                continue
            try:
                timestamp = dt.datetime.fromisoformat(row['timestamp_start'])
            except ValueError:
                continue
            if timestamp.date().isoformat() not in index:
                continue
            hour = index[timestamp.date().isoformat()] * 24 + timestamp.hour
            for column, key in enumerate(WEATHER, 6):
                try:
                    value = float(row[key])
                except (ValueError, TypeError):
                    continue
                if not math.isfinite(value):
                    continue
                for mode in (('v', 's') if row['qc_flag'] == 'VALID' else ('s',)):
                    weather[mode][hour][column].append(value)
        for mode, hours in weather.items():
            for hour, columns in hours.items():
                for column, values in columns.items():
                    value = sum(values)/len(values)
                    if column == 9:
                        # Directions use a circular mean, never an arithmetic wrap across north.
                        x = sum(math.cos(math.radians(v)) for v in values)
                        y = sum(math.sin(math.radians(v)) for v in values)
                        value = math.degrees(math.atan2(y, x)) % 360 if math.hypot(x, y) > 1e-10 else math.nan
                    modes[mode][hour*len(COLUMNS)+column] = value
        hashes = {}
        for mode, values in modes.items():
            if sys.byteorder != 'little':
                values.byteswap()
            content = gzip.compress(values.tobytes(), mtime=0)
            target = output / f'{code}-{mode}.bin'
            target.write_bytes(content)
            hashes[mode] = hashlib.sha256(content).hexdigest()
        stations[code] = {'traffic': float(site['traffic_intensity_per_h']), 'hashes': hashes,
                          'rejections': rejection_report(rows, site, index)}
        print(code, flush=True)
    if set(stations) != {site['station_code'] for site in sites}:
        raise ValueError('Station inventory mismatch')
    sources = [*sorted((RAW/'aqms').glob('*.csv')), *sorted((RAW/'master').glob('*.csv')),
               *sorted((RAW/'metadata').glob('*.csv'))]
    manifest = {'version': 1, 'dates': dates, 'columns': COLUMNS, 'stations': stations,
                'method': 'Little-endian Float64 hourly means; NaN=unavailable. v=VALID; s=VALID+SUSPECT. '
                'Uses export-compliance eligible_values and approved normalization. No imputation or concentration outlier removal. '
                'Finite weather values with identical QC/time/duplicate rules; circular hourly wind direction. '
                'Pollutant/weather pairing occurs at recorded local hour, without a timezone shift.',
                'sources': {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}}
    (output/'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
    shutil.copytree(output, ROOT/'dashboard/data/hourly', dirs_exist_ok=True)


if __name__ == '__main__':
    export()
