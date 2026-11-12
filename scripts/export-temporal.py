"""Export temporal PM2.5 analytics for Tab 3: diurnal profiles, heatmap, timeseries, episodes."""
import csv
import datetime as dt
import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "dataset/raw"
START = dt.date(2024, 1, 1)
END = dt.date(2026, 10, 14)
DATES = [(START + dt.timedelta(days=i)).isoformat() for i in range((END - START).days + 1)]
DATE_INDEX = {d: i for i, d in enumerate(DATES)}
HAZE_MONTHS = {8, 9, 10}
EPISODE_THRESHOLD = 55.0
EPISODE_MIN_VALID_HOURS = 18
EPISODE_GAP_MERGE = 1  # days
TIMESERIES_STATIONS = {
    "AQMS-KTG-01", "AQMS-KTG-02", "AQMS-JMB-01", "AQMS-JMB-02",
    "AQMS-PKN-01", "AQMS-PKU-01", "AQMS-STG-01",
}

DIURNAL_MIN_OBS = 10
HEATMAP_MIN_OBS = 5
TIMESERIES_MIN_HOURS = 18


def records(path):
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def finite_nonneg(value):
    try:
        v = float(value)
        return v if math.isfinite(v) and v >= 0 else None
    except (ValueError, TypeError):
        return None


def percentile(values, p):
    """Return p-th percentile (0–100) of a sorted or unsorted list via linear interpolation."""
    if not values:
        return None
    s = sorted(values)
    n = len(s)
    if n == 1:
        return s[0]
    idx = p / 100.0 * (n - 1)
    lo = int(idx)
    hi = lo + 1
    if hi >= n:
        return s[lo]
    frac = idx - lo
    return s[lo] + frac * (s[hi] - s[lo])


def stats_cell(values):
    if len(values) < 1:
        return None
    return {
        "median": round(percentile(values, 50), 3),
        "p25": round(percentile(values, 25), 3),
        "p75": round(percentile(values, 75), 3),
    }


def export():
    # --- Build sensor -> station_code and station_code -> site_type maps ---
    sensors = records(RAW / "master/sensors.csv")
    sites = records(RAW / "master/sites.csv")
    loc_to_site = {s["location_id"]: s for s in sites}
    sensor_to_station = {}
    for sensor in sensors:
        site = loc_to_site.get(sensor["location_id"])
        if site:
            sensor_to_station[sensor["sensor_id"]] = site["station_code"]
    station_to_site_type = {s["station_code"]: s["site_type"] for s in sites}
    all_station_codes = sorted(station_to_site_type.keys())

    # Accumulators
    # diurnal: site_type -> season ("all"|"haze"|"nonhaze") -> hour -> list[pm25]
    diurnal_buckets = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    # heatmap: station_code -> dow -> hour -> list[pm25]
    heatmap_buckets = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    # timeseries: station_code -> date_index -> (sum_pm25, count_valid_hours)
    ts_hours = {sc: defaultdict(lambda: [0.0, 0]) for sc in TIMESERIES_STATIONS}
    # episodes: station_code -> date_index -> (sum_pm25, count_valid_hours)
    ep_hours = {sc: defaultdict(lambda: [0.0, 0]) for sc in all_station_codes}

    stations_processed = []

    for path in sorted((RAW / "aqms").glob("*.csv")):
        if path.name == ".gitkeep":
            continue
        rows = records(path)
        if not rows:
            continue
        # Determine station code from first valid sensor_id
        station_code = None
        for row in rows:
            sc = sensor_to_station.get(row["sensor_id"])
            if sc:
                station_code = sc
                break
        if station_code is None:
            print(f"  WARN: cannot map station for {path.name}")
            continue
        site_type = station_to_site_type.get(station_code)
        stations_processed.append(station_code)

        # Detect duplicates by timestamp_start
        ts_count = defaultdict(int)
        for row in rows:
            ts_count[row["timestamp_start"]] += 1

        for row in rows:
            if row["qc_flag"] != "VALID":
                continue
            if ts_count[row["timestamp_start"]] > 1:
                continue
            pm25 = finite_nonneg(row.get("pm25_ug_m3"))
            if pm25 is None:
                continue
            try:
                ts = dt.datetime.fromisoformat(row["timestamp_start"])
            except ValueError:
                continue
            date_str = ts.date().isoformat()
            if date_str < "2024-01-01" or date_str > "2026-10-14":
                continue
            day_idx = DATE_INDEX.get(date_str)
            hour = ts.hour
            dow = ts.weekday()  # 0=Mon, 6=Sun
            month = ts.month

            # --- Diurnal accumulation (all site_types) ---
            if site_type:
                season = "haze" if month in HAZE_MONTHS else "nonhaze"
                diurnal_buckets[site_type]["all"][hour].append(pm25)
                diurnal_buckets[site_type][season][hour].append(pm25)

            # --- Heatmap accumulation ---
            heatmap_buckets[station_code][dow][hour].append(pm25)

            # --- Timeseries accumulation ---
            if station_code in TIMESERIES_STATIONS and day_idx is not None:
                ts_hours[station_code][day_idx][0] += pm25
                ts_hours[station_code][day_idx][1] += 1

            # --- Episode accumulation (all stations) ---
            if station_code in ep_hours and day_idx is not None:
                ep_hours[station_code][day_idx][0] += pm25
                ep_hours[station_code][day_idx][1] += 1

    # --- Build diurnal output ---
    def build_diurnal(season_key, min_obs):
        result = {}
        for site_type, seasons in diurnal_buckets.items():
            hourly = seasons.get(season_key, {})
            hours_out = {}
            for h in range(24):
                vals = hourly.get(h, [])
                hours_out[str(h)] = stats_cell(vals) if len(vals) >= min_obs else None
            result[site_type] = hours_out
        return result

    diurnal = build_diurnal("all", DIURNAL_MIN_OBS)
    diurnal_haze = build_diurnal("haze", DIURNAL_MIN_OBS)
    diurnal_nonhaze = build_diurnal("nonhaze", DIURNAL_MIN_OBS)

    # --- Build heatmap output ---
    heatmap = {}
    for sc in all_station_codes:
        dow_map = {}
        for dow in range(7):
            hour_map = {}
            for hour in range(24):
                vals = heatmap_buckets[sc][dow][hour]
                hour_map[str(hour)] = (round(percentile(vals, 50), 3)
                                       if len(vals) >= HEATMAP_MIN_OBS else None)
            dow_map[str(dow)] = hour_map
        heatmap[sc] = dow_map

    # --- Build timeseries output ---
    ts_stations = {}
    for sc in sorted(TIMESERIES_STATIONS):
        series = []
        for i in range(len(DATES)):
            bucket = ts_hours[sc][i]
            if bucket[1] >= TIMESERIES_MIN_HOURS:
                series.append(round(bucket[0] / bucket[1], 3))
            else:
                series.append(None)
        ts_stations[sc] = series

    timeseries = {"dates": DATES, "stations": ts_stations}

    # --- Build episodes output ---
    def compute_daily_means(station_code):
        """Return dict of date_index -> daily_mean (or None if below threshold)."""
        daily = {}
        for day_idx, (total, count) in ep_hours[station_code].items():
            if count >= EPISODE_MIN_VALID_HOURS:
                daily[day_idx] = total / count
        return daily

    def find_episodes(daily_means):
        if not daily_means:
            return []
        extreme_days = sorted(d for d, v in daily_means.items() if v > EPISODE_THRESHOLD)
        if not extreme_days:
            return []
        # Group into consecutive runs
        runs = []
        run_start = extreme_days[0]
        run_end = extreme_days[0]
        for d in extreme_days[1:]:
            if d == run_end + 1:
                run_end = d
            else:
                runs.append((run_start, run_end))
                run_start = d
                run_end = d
        runs.append((run_start, run_end))
        # Merge runs separated by exactly EPISODE_GAP_MERGE days
        merged = [runs[0]]
        for start, end in runs[1:]:
            prev_start, prev_end = merged[-1]
            if start - prev_end <= EPISODE_GAP_MERGE + 1:  # gap in day indices
                merged[-1] = (prev_start, end)
            else:
                merged.append((start, end))
        # Build episode objects
        episodes = []
        for s_idx, e_idx in merged:
            days_in = range(s_idx, e_idx + 1)
            # Collect daily means for days that were extreme (or filled by gap)
            # For mean/peak we use all extreme-flagged days in the merged range
            extreme_in_range = [daily_means[d] for d in days_in if d in daily_means and daily_means[d] > EPISODE_THRESHOLD]
            if not extreme_in_range:
                continue
            start_date = (START + dt.timedelta(days=s_idx)).isoformat()
            end_date = (START + dt.timedelta(days=e_idx)).isoformat()
            duration = e_idx - s_idx + 1
            peak = round(max(extreme_in_range), 3)
            mean = round(sum(extreme_in_range) / len(extreme_in_range), 3)
            episodes.append({
                "start": start_date,
                "end": end_date,
                "duration_days": duration,
                "peak_pm25": peak,
                "mean_pm25": mean,
            })
        return episodes

    episodes = {}
    for sc in all_station_codes:
        daily = compute_daily_means(sc)
        eps = find_episodes(daily)
        episodes[sc] = eps

    # Summary stats
    longest_ep = None
    most_ep_station = None
    most_ep_count = 0
    for sc, eps in episodes.items():
        for ep in eps:
            if longest_ep is None or ep["duration_days"] > longest_ep["duration_days"]:
                longest_ep = {
                    "station": sc,
                    "start": ep["start"],
                    "end": ep["end"],
                    "duration_days": ep["duration_days"],
                }
        count = len(eps)
        if count > most_ep_count:
            most_ep_count = count
            most_ep_station = sc

    episodes_summary = {
        "longest_episode": longest_ep,
        "most_episodes": {"station": most_ep_station, "count": most_ep_count} if most_ep_station else None,
    }

    # --- Assemble output ---
    output = {
        "meta": {
            "version": 1,
            "date_range": {"start": "2024-01-01", "end": "2026-10-14"},
            "haze_months": [8, 9, 10],
            "episode_threshold_ug_m3": EPISODE_THRESHOLD,
            "episode_min_valid_hours": EPISODE_MIN_VALID_HOURS,
            "episode_gap_merge_days": EPISODE_GAP_MERGE,
        },
        "diurnal": diurnal,
        "diurnal_haze": diurnal_haze,
        "diurnal_nonhaze": diurnal_nonhaze,
        "heatmap": heatmap,
        "timeseries": timeseries,
        "episodes": episodes,
        "episodes_summary": episodes_summary,
    }

    content = json.dumps(output, separators=(",", ":"), ensure_ascii=False, allow_nan=False) + "\n"

    for dest in [
        ROOT / "dataset/dashboard/tab3_temporal.json",
        ROOT / "dashboard/data/tab3_temporal.json",
    ]:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        print(f"Written: {dest.relative_to(ROOT)}  ({len(content):,} bytes)")

    # --- Print summary ---
    site_types_found = sorted(diurnal.keys())
    print(f"\n=== export-temporal summary ===")
    print(f"Date range : {START.isoformat()} – {END.isoformat()}")
    print(f"Stations   : {len(stations_processed)} processed ({sorted(set(stations_processed))})")
    print(f"Site types : {site_types_found}")
    print(f"Heatmap    : {len(heatmap)} stations")
    print(f"Timeseries : {sorted(ts_stations.keys())}")
    total_episodes = sum(len(v) for v in episodes.values())
    print(f"Episodes   : {total_episodes} total across {len([s for s,v in episodes.items() if v])} stations")
    if longest_ep:
        print(f"  Longest  : {longest_ep['station']} {longest_ep['start']}–{longest_ep['end']} ({longest_ep['duration_days']} days)")
    if most_ep_station:
        print(f"  Most     : {most_ep_station} ({most_ep_count} episodes)")


if __name__ == "__main__":
    export()
