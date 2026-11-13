"""Fit time-split distributed-lag models using only committee observations."""
import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import statsmodels.api as sm

ROOT = Path(__file__).resolve().parents[1]
DASH = ROOT / 'dataset/dashboard'


def emit(name, payload):
    content = json.dumps(payload, separators=(',', ':'), allow_nan=False) + '\n'
    if len(content.encode()) >= 2_000_000:
        raise ValueError('Export exceeds the case-study size limit')
    for directory in (DASH, ROOT / 'dashboard/data'):
        (directory / name).write_text(content)
    print(name, len(content.encode()), flush=True)


def fit_models():
    provenance = json.loads((DASH / 'health_provenance.json').read_text())
    for name, digest in provenance['sources'].items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != digest:
            raise ValueError('Raw source changed; regenerate health exports first')
    health = json.loads((DASH / 'health_outcomes.json').read_text())
    exposure = json.loads((DASH / 'health_exposure.json').read_text())
    dates = health['dates']
    from datetime import date
    calendar = [date.fromisoformat(day) for day in dates]
    with (ROOT / 'dataset/raw/health/HLT-01_health_outcomes_daily.csv').open() as stream:
        raw = {(row['hospital_id'], row['date']): row for row in csv.DictReader(stream)}
    models = {}
    for mode in ('v', 's'):
        records = []
        for code, facility in health['stations'].items():
            series = exposure['stations'][code][mode]['pm25']
            for i in range(7, len(dates)):
                lags = [series[i - lag] for lag in range(8)]
                row = raw.get((facility['hospital'], dates[i]))
                if row is None or any(value is None for value in lags):
                    continue
                temp, humidity = float(row['temp_c']), float(row['rhum_pct'])
                if not math.isfinite(temp) or not -30 <= temp <= 60 or not math.isfinite(humidity) or not 0 <= humidity <= 100:
                    continue
                if any(facility['outcomes'][key][i] is None for key in ('resp_admissions_under5', 'resp_admissions_over60')):
                    continue
                records.append((code, i, lags, temp, humidity))
        counts = {code: (sum(r[0] == code and dates[r[1]] < '2026-01-01' for r in records), sum(r[0] == code and dates[r[1]] >= '2026-01-01' for r in records)) for code in health['stations']}
        codes = sorted(code for code, (train, test) in counts.items() if train >= 60 and test >= 30)
        records = [row for row in records if row[0] in codes]
        if len(codes) < 10:
            raise ValueError('Insufficient independent hospital clusters')
        features = ['intercept'] + [f'pm25_lag{lag}_per10' for lag in range(8)] + ['temp_per10', 'rh_per10'] + [f'weekday_{day}' for day in range(1, 7)] + ['season_sin', 'season_cos', 'time_years'] + [f'hospital_{code}' for code in codes[1:]]
        def design(row):
            code, i, lags, temp, humidity = row
            day = calendar[i]
            phase = 2 * math.pi * (day.timetuple().tm_yday - 1) / (366 if day.year == 2024 else 365)
            return [1] + [value / 10 for value in lags] + [temp / 10, humidity / 10] + [float(day.weekday() == dow) for dow in range(1, 7)] + [math.sin(phase), math.cos(phase), i / 365.25] + [float(code == other) for other in codes[1:]]
        x = np.array([design(row) for row in records], dtype=float)
        train = np.array([dates[row[1]] < '2026-01-01' for row in records])
        groups = np.array([codes.index(row[0]) for row in records])
        if np.linalg.matrix_rank(x[train]) != x.shape[1]:
            raise ValueError('Distributed-lag design is not identifiable')
        training_pm = np.array([row[2][0] for row, keep in zip(records, train) if keep])
        lower, anchor, upper = np.quantile(training_pm, [.01, .5, .99]).tolist()
        output = {}
        for target, field in [('young', 'resp_admissions_under5'), ('older', 'resp_admissions_over60')]:
            y = np.array([health['stations'][row[0]]['outcomes'][field][row[1]] for row in records], dtype=float)
            result = sm.GLM(y[train], x[train], family=sm.families.Poisson()).fit(maxiter=100, cov_type='cluster', cov_kwds={'groups': groups[train], 'use_correction': True})
            baseline_cols = [0] + list(range(9, x.shape[1]))
            baseline = sm.GLM(y[train], x[train][:, baseline_cols], family=sm.families.Poisson()).fit(maxiter=100)
            predicted = result.predict(x[~train])
            simple = baseline.predict(x[~train][:, baseline_cols])
            truth = y[~train]
            metric = lambda pred: {'mae': float(np.mean(np.abs(truth - pred))), 'rmse': float(np.sqrt(np.mean((truth - pred) ** 2)))}
            covariance = np.asarray(result.cov_params())
            if not result.converged or not np.isfinite(result.params).all() or not np.isfinite(covariance).all():
                raise ValueError('Model failed to converge to finite results')
            lag_beta = float(np.sum(result.params[1:9]))
            lag_variance = float(np.sum(covariance[1:9, 1:9]))
            if lag_variance < -1e-10:
                raise ValueError('Invalid cumulative covariance')
            se = math.sqrt(max(0, lag_variance))
            references = {}
            for code in codes:
                mask = train & np.array([row[0] == code for row in records])
                template = x[mask].mean(axis=0)
                local_pm = [row[2][0] for row, keep in zip(records, mask) if keep]
                references[code] = {'features': template.tolist(), 'beds': health['stations'][code]['beds'], 'range': [min(local_pm), max(local_pm)]}
            bounds = {code: (min(row[2][0] for row, keep in zip(records, train) if keep and row[0] == code), max(row[2][0] for row, keep in zip(records, train) if keep and row[0] == code)) for code in codes}
            supported = np.array([not keep and all(bounds[row[0]][0] <= n <= bounds[row[0]][1] for n in row[2]) for row, keep in zip(records, train)])
            support_pred = result.predict(x[supported]); support_simple = baseline.predict(x[supported][:, baseline_cols]); support_truth = y[supported]
            supported_metric = lambda pred: {'mae': float(np.mean(np.abs(support_truth - pred))), 'rmse': float(np.sqrt(np.mean((support_truth - pred) ** 2)))}
            output[target] = {'supportedTest': supported_metric(support_pred), 'supportedBaseline': supported_metric(support_simple), 'supportedTestRows': int(supported.sum()), 'excludedTestRows': int((~train).sum() - supported.sum()), 'coefficients': result.params.tolist(), 'covariance': covariance.tolist(), 'trainRows': int(train.sum()), 'testRows': int((~train).sum()),
                              'test': metric(predicted), 'baseline': metric(simple), 'converged': bool(result.converged), 'dispersion': float(result.pearson_chi2 / result.df_resid),
                              'cumulativePer10': {'ratio': math.exp(lag_beta), 'lower': math.exp(lag_beta - 1.96 * se), 'upper': math.exp(lag_beta + 1.96 * se)}, 'references': references}
            print(mode, target, 'train', int(train.sum()), 'test', int((~train).sum()), metric(predicted), 'no-PM comparator', metric(simple), flush=True)
        models[mode] = {'features': features, 'anchor': anchor, 'range': [lower, upper], 'outcomes': output}
    payload = {'version': 1, 'train': ['2024-01-01', '2025-12-31'], 'test': ['2026-01-01', dates[-1]], 'models': models,
               'method': 'Poisson log-link; PM2.5 lags 0–7/10, temperature, RH, weekday, hospital fixed effects, annual sine/cosine and linear time. Cluster-robust hospital covariance. No imputation. Train-only reference profiles; each reference lag shifted equally to reach the selected mean concentration; scenarios restricted to each hospital training exposure range. CI for conditional expected mean, not patient-count prediction interval or causal benefit.',
               'raw_sources': provenance['sources']}
    emit('model_coef.json', payload)
    checks = []
    for mode, spec in models.items():
        for selection in ('all', 'Jakarta'):
            codes = [code for code in spec['outcomes']['young']['references'] if selection == 'all' or code.startswith('AQMS-JKT-')]
            refs = [spec['outcomes']['young']['references'][code] for code in codes]
            anchor = float(np.mean([np.mean(ref['features'][1:9]) * 10 for ref in refs]))
            lo = max(ref['range'][0] - value * 10 for ref in refs for value in ref['features'][1:9])
            hi = min(ref['range'][1] - value * 10 for ref in refs for value in ref['features'][1:9])
            for target, fit in spec['outcomes'].items():
                for delta in (lo, 0, hi):
                    x = np.array([fit['references'][code]['features'] for code in codes]); x[:, 1:9] += delta / 10
                    mu = np.exp(x @ np.array(fit['coefficients'])); expected = float(mu.sum()); gradient = (mu[:, None] * x).sum(axis=0)
                    variance = float(gradient @ np.array(fit['covariance']) @ gradient); error = 1.96 * math.sqrt(max(0, variance)) / expected
                    checks.append({'mode': mode, 'target': target, 'codes': codes, 'delta': delta, 'reference': anchor, 'min': anchor + lo, 'max': anchor + hi,
                                   'mean': expected, 'lower': expected * math.exp(-error), 'upper': expected * math.exp(error)})
    (ROOT / 'dataset/processed').mkdir(exist_ok=True)
    (ROOT / 'dataset/processed/model_validation.json').write_text(json.dumps({'version': 1, 'checks': checks}, separators=(',', ':'), allow_nan=False) + '\n')
    with (ROOT / 'dataset/raw/master/sites.csv').open() as stream:
        sites = list(csv.DictReader(stream))
    context = json.loads((DASH / 'policy_context.json').read_text())
    lookup = {station['code']: station for station in context['stations']}
    emit('network_rank.json', {'version': 1, 'sites': [{'code': row['station_code'], 'baseline': float(row['baseline_pm25']), 'traffic': float(row['traffic_intensity_per_h']), 'road': float(row['distance_to_road_m']), 'nearestKm': lookup[row['station_code']]['nearest']['km']} for row in sites],
                               'method': 'Min-max normalized against the full installed catalog. Baseline PM2.5 is source master context, not measured period concentration. Weights are user assumptions; existing station areas are siting-study candidates, not new sensor coordinates.'})


if __name__ == '__main__':
    fit_models()
