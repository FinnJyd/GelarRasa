"""Export health outcomes and independently quality-checked daily exposure for Tab 5."""
import csv
import datetime as dt
import hashlib
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from unit_normalization import concentration_column, LOGGER_NORMALIZATION

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'dataset/raw'
START, END = dt.date(2024, 1, 1), dt.date(2026, 10, 14)
DATES = [(START + dt.timedelta(days=i)).isoformat() for i in range((END - START).days + 1)]
INDEX = {date: i for i, date in enumerate(DATES)}
POLLUTANTS = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2']
OUTCOMES = ['resp', 'resp_admissions_under5', 'resp_admissions_over60',
            'asthma_emergency_cases', 'copd_admissions', 'cvd', 'death']


def records(path):
    with path.open(newline='') as stream:
        return list(csv.DictReader(stream))


def locality(value):
    return re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', value)).strip().casefold()


def finite(value):
    try:
        result = float(value)
        return result if math.isfinite(result) and result >= 0 else None
    except (ValueError, TypeError):
        return None


def quantile(values, probability):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lo, hi = math.floor(position), math.ceil(position)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (position - lo)


def export():
    sites = records(RAW / 'master/sites.csv')
    sites_by_code = {site['station_code']: site for site in sites}
    hospitals = records(RAW / 'master/hospitals.csv')
    sensors = records(RAW / 'master/sensors.csv')
    sensor_station = {sensor['sensor_id']: next(site['station_code'] for site in sites
                      if site['location_id'] == sensor['location_id']) for sensor in sensors}
    paired = {}
    used = set()
    for site in sites:
        matches = [h for h in hospitals if h['provinsi'] == site['provinsi']
                   and locality(h['kecamatan']) == locality(site['kecamatan'])]
        if len(matches) != 1 or matches[0]['hospital_id'] in used:
            raise ValueError(f"Ambiguous hospital relationship: {site['station_code']}")
        hospital = matches[0]
        used.add(hospital['hospital_id'])
        beds = finite(hospital['kapasitas_tempat_tidur'])
        if beds is None or beds == 0:
            raise ValueError('Missing hospital capacity')
        paired[site['station_code']] = {'hospital': hospital['hospital_id'], 'beds': beds,
                                       'outcomes': {key: [None] * len(DATES) for key in OUTCOMES}}
    by_hospital = {item['hospital']: item for item in paired.values()}
    seen = set()
    discrepancy = 0
    for row in records(RAW / 'health/HLT-01_health_outcomes_daily.csv'):
        if row['date'] not in INDEX:
            continue
        key = (row['hospital_id'], row['date'])
        if key in seen or row['hospital_id'] not in by_hospital:
            raise ValueError(f'Duplicate or unknown hospital: {key}')
        seen.add(key)
        outcomes = by_hospital[row['hospital_id']]['outcomes']
        for outcome in OUTCOMES:
            value = finite(row[outcome])
            if value is not None and not value.is_integer():
                raise ValueError(f'Noninteger outcome: {key}')
            outcomes[outcome][INDEX[row['date']]] = None if value is None else int(value)
        if all(outcomes[k][INDEX[row['date']]] is not None for k in OUTCOMES[:3]):
            discrepancy += outcomes['resp'][INDEX[row['date']]] < (
                outcomes['resp_admissions_under5'][INDEX[row['date']]]
                + outcomes['resp_admissions_over60'][INDEX[row['date']]])
    exposures = {}
    for path in sorted((RAW / 'aqms').glob('*.csv')):
        rows = records(path)
        station_codes = {sensor_station.get(row['sensor_id']) for row in rows}
        if len(station_codes) != 1 or None in station_codes:
            raise ValueError(f'Unknown or mixed station: {path.name}')
        station = station_codes.pop()
        duplicate_counts = defaultdict(int)
        for row in rows:
            duplicate_counts[row['timestamp_start']] += 1
        columns = {p: concentration_column(sites_by_code[station], p, rows[0]) for p in POLLUTANTS}
        available = [p for p in POLLUTANTS if columns[p] is not None]
        hours = {'v': defaultdict(lambda: [0.0, 0]), 's': defaultdict(lambda: [0.0, 0])}
        for row in rows:
            if row['qc_flag'] not in ('VALID', 'SUSPECT') or duplicate_counts[row['timestamp_start']] > 1:
                continue
            try:
                timestamp = dt.datetime.fromisoformat(row['timestamp_start'])
            except ValueError:
                continue
            day = INDEX.get(timestamp.date().isoformat())
            if day is None:
                continue
            for pollutant in available:
                source_column, factor = columns[pollutant]
                raw_value = finite(row[source_column])
                value = None if raw_value is None else finite(raw_value * factor)
                if value is None:
                    continue
                for mode in (('v', 's') if row['qc_flag'] == 'VALID' else ('s',)):
                    bucket = hours[mode][(day, timestamp.hour, pollutant)]
                    bucket[0] += value
                    bucket[1] += 1
        output = {'unavailable': [p for p in POLLUTANTS if p not in available]}
        for mode in ('v', 's'):
            daily = defaultdict(list)
            for (day, _hour, pollutant), (total, count) in hours[mode].items():
                daily[(day, pollutant)].append(total / count)
            output[mode] = {p: [round(sum(values) / len(values), 2) if len(values := daily[(i, p)]) >= 18
                               else None for i in range(len(DATES))] for p in POLLUTANTS}
        exposures[station] = output
    if set(paired) != set(exposures):
        raise ValueError('Station coverage mismatch')
    sources = sorted(list((RAW / 'aqms').glob('*.csv')) + list((RAW / 'health').glob('*.csv'))
                     + list((RAW / 'master').glob('*.csv')) + list((RAW / 'metadata').glob('*.csv')))
    provenance = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest() for path in sources}
    outcomes = {'version': 1, 'dates': DATES, 'stations': paired, 'resp_discrepancies': discrepancy}
    exposure = {'version': 1, 'dates': DATES, 'stations': exposures}
    manifest = {'version': 1, 'sources': provenance, 'outcomes': OUTCOMES, 'pollutants': POLLUTANTS,
                'method': 'Recorded-date hourly means; >=18 distinct eligible hours; finite nonnegative values; duplicate timestamps excluded; v=VALID, s=VALID+SUSPECT; no imputation; approved BJB/MDN/PSW particulate mass-scale x1000 and gas ppmv * molar_mass/24.45 *1000 at assumed 25 C/1 atm.',
                'unit_normalization': LOGGER_NORMALIZATION}
    references = {}
    for code, station in exposures.items():
        references[code] = {}
        for mode in ('v', 's'):
            references[code][mode] = {}
            for pollutant in POLLUTANTS:
                values = [n for date, n in zip(DATES, station[mode][pollutant]) if date.startswith('2024-') and n is not None]
                references[code][mode][pollutant] = {'count': len(values), 'p25': quantile(values, .25), 'p75': quantile(values, .75), 'p90': quantile(values, .9)}
    lag = {'version': 1, 'referenceYear': 2024, 'stations': references,
           'method': 'Fixed station/pollutant/QC references; linear interpolation at (n-1)*p. Frontend selects outcomes/dates and computes descriptive lag, dose bins, age comparison and non-overlapping -3:+7 event windows from validated daily exports.'}
    for name, payload in [('health_lag.json', lag), ('health_outcomes.json', outcomes), ('health_exposure.json', exposure), ('health_provenance.json', manifest)]:
        content = json.dumps(payload, separators=(',', ':'), allow_nan=False) + '\n'
        target = ROOT / 'dataset/dashboard' / name
        target.write_text(content)
        (ROOT / 'dashboard/data' / name).write_text(content)
        print(f'{name}: {len(content):,} bytes')


if __name__ == '__main__':
    export()
