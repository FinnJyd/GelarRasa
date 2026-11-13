"""Export source-checked station context for policy actions and network evidence."""
import csv
import datetime as dt
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'dataset/raw'
DASH = ROOT / 'dataset/dashboard'


def read_csv(path):
    with path.open(newline='') as stream:
        return list(csv.DictReader(stream))


def distance(a, b):
    lat1, lat2 = math.radians(a['latitude']), math.radians(b['latitude'])
    delta_lat = lat2 - lat1
    delta_lon = math.radians(b['longitude'] - a['longitude'])
    chord = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(min(1, max(0, chord))))


def export():
    provenance = json.loads((DASH / 'health_provenance.json').read_text())
    for name, expected in provenance['sources'].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise ValueError('Raw sources changed; run npm run data:health first.')
    exposure_bytes = (DASH / 'health_exposure.json').read_bytes()
    exposure = json.loads(exposure_bytes)
    health = json.loads((DASH / 'health_outcomes.json').read_text())
    dates = health['dates']
    if exposure['dates'] != dates:
        raise ValueError('Health and exposure calendars differ')
    index = {day: i for i, day in enumerate(dates)}
    sites = read_csv(RAW / 'master/sites.csv')
    sensors = read_csv(RAW / 'master/sensors.csv')
    sensor_by_location = {row['location_id']: row for row in sensors}
    sensor_code = {sensor_by_location[site['location_id']]['sensor_id']: site['station_code'] for site in sites}
    stations = []
    for site in sites:
        code = site['station_code']
        sensor = sensor_by_location[site['location_id']]
        facility = health['stations'][code]
        stations.append({
            'code': code, 'name': sensor['nama_sensor'], 'city': site['kota_kabupaten'],
            'province': site['provinsi'], 'region': site['region_group'], 'siteType': site['site_type'],
            'latitude': float(site['latitude_dd']), 'longitude': float(site['longitude_dd']),
            'status': sensor['status_operasional'], 'hospital': facility['hospital'], 'beds': facility['beds'],
            'admissions': facility['outcomes']['resp'],
            'recorded': [0] * len(dates), 'excluded': {'v': [0] * len(dates), 's': [0] * len(dates)},
        })
    lookup = {station['code']: station for station in stations}
    for path in sorted((RAW / 'aqms').glob('*.csv')):
        with path.open(newline='') as stream:
            for row in csv.DictReader(stream):
                try:
                    date = dt.datetime.fromisoformat(row['timestamp_start']).date().isoformat()
                except ValueError:
                    continue
                i = index.get(date)
                if i is None:
                    continue
                station = lookup[sensor_code[row['sensor_id']]]
                station['recorded'][i] += 1
                station['excluded']['v'][i] += row['qc_flag'] != 'VALID'
                station['excluded']['s'][i] += row['qc_flag'] not in ('VALID', 'SUSPECT')
    for station in stations:
        other = min((item for item in stations if item['code'] != station['code']), key=lambda item: distance(station, item))
        station['nearest'] = {'code': other['code'], 'km': distance(station, other)}
    output = {'version': 2, 'dates': dates, 'stations': stations,
              'provenance': {'exposure_sha256': hashlib.sha256(exposure_bytes).hexdigest(),
                             'raw_sources': provenance['sources'],
                             'qc_counts': 'Recorded-date rows excluded by selected flag; not a completeness percentage'}}
    content = json.dumps(output, separators=(',', ':'), allow_nan=False) + '\n'
    for directory in (DASH, ROOT / 'dashboard/data'):
        (directory / 'policy_context.json').write_text(content)
    print(f'policy_context.json: {len(content):,} bytes; {len(stations)} stations; {len(dates)} dates')
    print('Recorded status:', dict(Counter(s['status'] for s in stations)))
    rank = {'version': 1, 'sites': [{'code': row['station_code'], 'baseline': float(row['baseline_pm25']), 'traffic': float(row['traffic_intensity_per_h']), 'road': float(row['distance_to_road_m']), 'nearestKm': lookup[row['station_code']]['nearest']['km']} for row in sites],
            'method': 'Min-max normalized against the full installed catalog. Baseline PM2.5 is source master context, not measured period concentration. Weights are user assumptions; existing station areas are siting-study candidates, not new sensor coordinates.'}
    rank_content = json.dumps(rank, separators=(',', ':'), allow_nan=False) + '\n'
    for directory in (DASH, ROOT / 'dashboard/data'):
        (directory / 'network_rank.json').write_text(rank_content)
    print(f'network_rank.json: {len(rank_content):,} bytes; {len(sites)} sites')


if __name__ == '__main__':
    export()
