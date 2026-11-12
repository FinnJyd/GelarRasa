"""Export pollution-driver analytics for Tab 4 (Drivers)."""
import csv
import datetime as dt
import json
import math
from collections import defaultdict
from pathlib import Path

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from scipy.stats import spearmanr as scipy_spearmanr
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'dataset/raw'

DIRECTION_LABELS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
POLLUTANTS = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2']
METEO_VARS = ['temperature_c', 'humidity_pct', 'wind_speed_ms']
WIND_BIN_EDGES = [0, 0.5, 1, 2, 3, 5, math.inf]
WIND_BIN_LABELS = ['0\u20130.5', '0.5\u20131', '1\u20132', '2\u20133', '3\u20135', '5+']
HAZE_MONTHS = {8, 9, 10}


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def records(path):
    with path.open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def finite(value):
    try:
        v = float(value)
        return v if math.isfinite(v) else None
    except (ValueError, TypeError):
        return None


def percentile_sorted(sorted_vals, p):
    """Return p-th percentile (0-100) of a pre-sorted list."""
    n = len(sorted_vals)
    if n == 0:
        return None
    idx = p / 100.0 * (n - 1)
    lo = int(idx)
    hi = lo + 1
    if hi >= n:
        return float(sorted_vals[lo])
    frac = idx - lo
    return float(sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac)


def median_of(vals):
    if not vals:
        return None
    s = sorted(vals)
    return percentile_sorted(s, 50)


def spearman_r(x, y):
    """Return Spearman correlation for paired lists (equal length, no NaN)."""
    n = len(x)
    if n < 2:
        return None
    if HAS_SCIPY:
        r, _ = scipy_spearmanr(x, y)
        return None if not math.isfinite(r) else round(float(r), 6)
    # Manual implementation: rank both, compute Pearson of ranks
    def rank_series(vals):
        order = sorted(range(n), key=lambda i: vals[i])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and vals[order[j + 1]] == vals[order[j]]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[order[k]] = avg_rank
            i = j + 1
        return ranks
    rx, ry = rank_series(x), rank_series(y)
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    dx = math.sqrt(sum((rx[i] - mx) ** 2 for i in range(n)))
    dy = math.sqrt(sum((ry[i] - my) ** 2 for i in range(n)))
    if dx == 0 or dy == 0:
        return None
    return round(num / (dx * dy), 6)


def wind_bin_index(speed):
    for i, edge in enumerate(WIND_BIN_EDGES[1:], 0):
        if speed < edge:
            return i
    return len(WIND_BIN_LABELS) - 1


# ---------------------------------------------------------------------------
# load station metadata
# ---------------------------------------------------------------------------

def load_station_meta():
    """Return dict: sensor_id -> {station_code, site_type, region_group, traffic_intensity_per_h}"""
    sites_by_loc = {}
    for row in records(RAW / 'master/sites.csv'):
        sites_by_loc[row['location_id']] = {
            'station_code': row['station_code'],
            'site_type': row['site_type'],
            'region_group': row['region_group'],
            'traffic_intensity_per_h': finite(row['traffic_intensity_per_h']),
        }
    sensor_meta = {}
    for row in records(RAW / 'master/sensors.csv'):
        loc = row['location_id']
        if loc in sites_by_loc:
            sensor_meta[row['sensor_id']] = sites_by_loc[loc]
    return sensor_meta, sites_by_loc


# ---------------------------------------------------------------------------
# load all AQMS data
# ---------------------------------------------------------------------------

def load_aqms(sensor_meta):
    """
    Returns list of dicts with parsed fields per valid row.
    Each dict: station_code, site_type, timestamp, hour, month,
               pm25..no2, temperature_c, humidity_pct, wind_speed_ms, wind_direction_deg
    """
    rows_all = []
    station_counts = defaultdict(int)
    for path in sorted((RAW / 'aqms').glob('*.csv')):
        for row in records(path):
            if row.get('qc_flag') != 'VALID':
                continue
            meta = sensor_meta.get(row.get('sensor_id'))
            if meta is None:
                continue
            try:
                ts = dt.datetime.fromisoformat(row['timestamp_start'])
            except (ValueError, KeyError):
                continue
            parsed = {
                'station_code': meta['station_code'],
                'site_type': meta['site_type'],
                'ts': ts,
                'hour': ts.hour,
                'month': ts.month,
            }
            for col in POLLUTANTS:
                parsed[col] = finite(row.get(f'{col}_ug_m3'))
            for col in METEO_VARS:
                parsed[col] = finite(row.get(col))
            parsed['wind_direction_deg'] = finite(row.get('wind_direction_deg'))
            rows_all.append(parsed)
            station_counts[meta['station_code']] += 1
    return rows_all, station_counts


# ---------------------------------------------------------------------------
# 1. pollution_rose
# ---------------------------------------------------------------------------

def build_pollution_rose(rows):
    # sector_data[station_code][sector_idx] = list of pm25 values
    sector_data = defaultdict(lambda: defaultdict(list))
    for r in rows:
        ws = r['wind_speed_ms']
        wd = r['wind_direction_deg']
        pm25 = r['pm25']
        if ws is None or wd is None or pm25 is None:
            continue
        if ws < 0.5:
            continue  # calm wind excluded
        sector = int((wd + 11.25) / 22.5) % 16
        sector_data[r['station_code']][sector].append(pm25)

    result = {}
    total_sectors = 0
    for station, sectors in sorted(sector_data.items()):
        rose = []
        for idx, label in enumerate(DIRECTION_LABELS):
            vals = sectors.get(idx, [])
            count = len(vals)
            if count >= 3:
                mean_pm25 = round(sum(vals) / count, 4)
                total_sectors += 1
            else:
                mean_pm25 = None
            rose.append({'direction_label': label, 'mean_pm25': mean_pm25, 'count': count})
        result[station] = rose
    return result, total_sectors


# ---------------------------------------------------------------------------
# 2. correlation
# ---------------------------------------------------------------------------

def build_correlation(rows):
    # Collect per-station paired observations
    # obs[station][subset] -> {pollutant: {meteo: [x_vals, y_vals]}}
    # We'll store raw lists: obs[station][subset][pollutant][meteo] = ([x], [y])
    store = defaultdict(lambda: {'all': defaultdict(lambda: defaultdict(list)),
                                  'haze': defaultdict(lambda: defaultdict(list)),
                                  'nonhaze': defaultdict(lambda: defaultdict(list))})
    for r in rows:
        subset_keys = ['all']
        if r['month'] in HAZE_MONTHS:
            subset_keys.append('haze')
        else:
            subset_keys.append('nonhaze')
        for pol in POLLUTANTS:
            pval = r[pol]
            if pval is None:
                continue
            for mvar in METEO_VARS:
                mval = r[mvar]
                if mval is None:
                    continue
                for sk in subset_keys:
                    store[r['station_code']][sk][pol][mvar].append((pval, mval))

    result = {}
    for station, subsets in sorted(store.items()):
        result[station] = {}
        for sk in ('all', 'haze', 'nonhaze'):
            result[station][sk] = {}
            for pol in POLLUTANTS:
                result[station][sk][pol] = {}
                for mvar in METEO_VARS:
                    pairs = subsets[sk][pol][mvar]
                    if len(pairs) < 30:
                        result[station][sk][pol][mvar] = None
                    else:
                        x = [p[0] for p in pairs]
                        y = [p[1] for p in pairs]
                        result[station][sk][pol][mvar] = spearman_r(x, y)
    return result


# ---------------------------------------------------------------------------
# 3. wind_bins
# ---------------------------------------------------------------------------

def build_wind_bins(rows, all_site_types):
    # bin_data[site_type][bin_idx] = list of pm25
    bin_data = defaultdict(lambda: defaultdict(list))
    for r in rows:
        ws = r['wind_speed_ms']
        pm25 = r['pm25']
        if ws is None or pm25 is None:
            continue
        bidx = wind_bin_index(ws)
        bin_data[r['site_type']][bidx].append(pm25)

    result = {}
    for st in sorted(all_site_types):
        bins = bin_data[st]
        result[st] = []
        for bidx, label in enumerate(WIND_BIN_LABELS):
            vals = bins.get(bidx, [])
            count = len(vals)
            if count >= 5:
                sv = sorted(vals)
                median_pm25 = round(percentile_sorted(sv, 50), 4)
                p25 = round(percentile_sorted(sv, 25), 4)
                p75 = round(percentile_sorted(sv, 75), 4)
            else:
                median_pm25 = p25 = p75 = None
            result[st].append({'label': label, 'median_pm25': median_pm25,
                                'p25': p25, 'p75': p75, 'count': count})
    return result


# ---------------------------------------------------------------------------
# 4. traffic_scatter
# ---------------------------------------------------------------------------

def build_traffic_scatter(rows, sites_by_loc, sensor_meta):
    # Build station -> site info
    station_site = {}
    for meta in sensor_meta.values():
        sc = meta['station_code']
        if sc not in station_site:
            station_site[sc] = {
                'traffic_intensity_per_h': meta['traffic_intensity_per_h'],
                'site_type': meta['site_type'],
            }

    no2_acc = defaultdict(list)
    co_acc = defaultdict(list)
    for r in rows:
        sc = r['station_code']
        if r['no2'] is not None:
            no2_acc[sc].append(r['no2'])
        if r['co'] is not None:
            co_acc[sc].append(r['co'])

    result = {}
    for sc, info in sorted(station_site.items()):
        no2_vals = no2_acc.get(sc, [])
        co_vals = co_acc.get(sc, [])
        result[sc] = {
            'traffic_intensity_per_h': info['traffic_intensity_per_h'],
            'mean_no2': round(sum(no2_vals) / len(no2_vals), 4) if no2_vals else None,
            'mean_co': round(sum(co_vals) / len(co_vals), 4) if co_vals else None,
            'site_type': info['site_type'],
        }
    return result


# ---------------------------------------------------------------------------
# 5. extreme_vs_normal
# ---------------------------------------------------------------------------

def build_extreme_vs_normal(rows):
    # Collect all valid pm25 with their meteo and time info
    all_pm25 = []
    full_rows = []  # rows with both pm25 and meteo
    for r in rows:
        pm25 = r['pm25']
        if pm25 is None:
            continue
        all_pm25.append(pm25)

    if not all_pm25:
        return {}

    sorted_pm25 = sorted(all_pm25)
    threshold = percentile_sorted(sorted_pm25, 95)

    def group_stats(grp_rows):
        ws_vals = [r['wind_speed_ms'] for r in grp_rows if r['wind_speed_ms'] is not None]
        hum_vals = [r['humidity_pct'] for r in grp_rows if r['humidity_pct'] is not None]
        temp_vals = [r['temperature_c'] for r in grp_rows if r['temperature_c'] is not None]
        haze_count = sum(1 for r in grp_rows if r['month'] in HAZE_MONTHS)
        hour_dist = [0] * 24
        for r in grp_rows:
            hour_dist[r['hour']] += 1
        return {
            'median_wind_speed': round(median_of(ws_vals), 4) if ws_vals else None,
            'median_humidity': round(median_of(hum_vals), 4) if hum_vals else None,
            'median_temperature': round(median_of(temp_vals), 4) if temp_vals else None,
            'haze_season_share': round(haze_count / len(grp_rows), 6) if grp_rows else None,
            'hour_distribution': hour_dist,
        }

    # Only rows where pm25 is valid
    pm25_rows = [r for r in rows if r['pm25'] is not None]
    extreme_rows = [r for r in pm25_rows if r['pm25'] > threshold]
    normal_rows = [r for r in pm25_rows if r['pm25'] <= threshold]

    return {
        'threshold_pm25': round(threshold, 4),
        'extreme': group_stats(extreme_rows),
        'normal': group_stats(normal_rows),
    }


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def export():
    sensor_meta, sites_by_loc = load_station_meta()

    # Collect all site types from sites
    all_site_types = set()
    for loc_info in sites_by_loc.values():
        all_site_types.add(loc_info['site_type'])

    print('Loading AQMS data...')
    rows, station_counts = load_aqms(sensor_meta)
    print(f'  Loaded {len(rows):,} valid AQMS rows from {len(station_counts)} stations')

    stations_processed = sorted(station_counts.keys())
    site_types_found = sorted(all_site_types)
    print(f'  Site types: {site_types_found}')

    print('Building pollution_rose...')
    pollution_rose, total_sectors = build_pollution_rose(rows)
    print(f'  Rose sectors with data (count>=3): {total_sectors}')

    print('Building correlation...')
    correlation = build_correlation(rows)

    print('Building wind_bins...')
    wind_bins = build_wind_bins(rows, all_site_types)

    print('Building traffic_scatter...')
    traffic_scatter = build_traffic_scatter(rows, sites_by_loc, sensor_meta)

    print('Building extreme_vs_normal...')
    extreme_vs_normal = build_extreme_vs_normal(rows)

    output = {
        'meta': {
            'version': 1,
            'date_range': {'start': '2024-01-01', 'end': '2026-10-14'},
            'haze_months': [8, 9, 10],
            'calm_wind_threshold_ms': 0.5,
            'correlation_min_obs': 30,
            'extreme_percentile': 95,
        },
        'pollution_rose': pollution_rose,
        'correlation': correlation,
        'wind_bins': wind_bins,
        'traffic_scatter': traffic_scatter,
        'extreme_vs_normal': extreme_vs_normal,
    }

    content = json.dumps(output, separators=(',', ':'), ensure_ascii=False, allow_nan=False) + '\n'

    dest1 = ROOT / 'dataset/dashboard/tab4_drivers.json'
    dest2 = ROOT / 'dashboard/data/tab4_drivers.json'
    dest1.parent.mkdir(parents=True, exist_ok=True)
    dest2.parent.mkdir(parents=True, exist_ok=True)
    dest1.write_text(content, encoding='utf-8')
    dest2.write_text(content, encoding='utf-8')
    print(f'tab4_drivers.json: {len(content):,} bytes')
    print(f'Written to: {dest1}')
    print(f'Written to: {dest2}')

    print('\n=== Summary ===')
    print(f'  Stations processed: {len(stations_processed)}')
    print(f'  Stations: {stations_processed}')
    print(f'  Site types found: {site_types_found}')
    print(f'  Rose sectors computed (count>=3): {total_sectors}')
    print(f'  Extreme P95 threshold (PM2.5): {extreme_vs_normal.get("threshold_pm25")} µg/m³')


if __name__ == '__main__':
    export()
