# Tab 5 and 6 implementation audit

13 November 2026 (WIB). Scope: the user's CASE_STUDY_CONTEXT.md request and explicit choice to use global filters and an evidence-based response matrix. This document records calculations and limits, not a claim that the detailed chart specification is an organizer requirement.

## Sources and preprocessing

Only the 33 committee CSVs supply analytical observations and dimensions. Existing source SHA-256 checks are retained. The handbook and the booklet recovered read-only from Git were reviewed; the user's deleted workspace files were not restored.

- AQMS sensor_id joins sensors.csv, then sites.csv through location_id. Hospitals have no location_id column: the existing validated join uses province and normalized kecamatan, with unique anonymous hospital matches.
- Daily exposure uses recorded calendar dates, finite nonnegative ug/m3 values, selected QC, duplicate timestamp exclusion, hourly-bin means, and at least 18 different eligible hours per day. No imputation or universal ppm conversion is introduced. VALID is primary; VALID+SUSPECT is sensitivity analysis.
- Three ppm logger stations remain unavailable for exposure comparisons. Their recorded health counts remain available. Muaro Jambi and Merauke lack sufficient usable PM2.5 histories for modeling; no substitute series are created.
- The common observation calendar remains 1 January 2024–14 October 2026. General respiratory, under-5 and over-60 counts remain separate; subgroup discrepancies are not reconciled with invented totals.
- Source rows, existing health_outcomes.json and health_exposure.json measurements remain unchanged. New health_lag.json contains fixed 2024 references; runtime validation checks them against actual daily series.

## Tab 5

| Requested analysis | Implementation and denominator |
| --- | --- |
| Dose-response | Existing selected-outcome mean admissions across paired facility-days in five equal-width concentration bins. Descriptive; not a relative-risk estimate. |
| Age/diagnosis baseline change | Per facility, baseline mean cases on exposure ≤P25 in 2024; comparison mean cases on selected dates >P75 2024. Percent change is calculated per facility then equally averaged. At least 30 reference exposure dates, 10 pairs on each side, and positive baseline required. Under-5/over-60 respiratory groups remain separate; PPOK/CVD are labelled all ages. |
| Lag 0–7 | Per-facility Pearson with ≥30 aligned calendar-day pairs and nonzero variance, equally averaged. Maximum value is emphasized in the chart and caption. This is exploratory association, not a causal lag or guaranteed response window. |
| Episode-centered study | Start above station-specific 2024 P90 after one available day ≤P90. Full selected-date exposure/outcome window −3:+7 required. Accepted centers are at least 11 days apart. The chart displays mean recorded cases per facility-episode at each relative day; tooltips additionally show percent changes normalized to each episode’s own mean days −3:−1. Positive baseline and at least three episodes required. No control group or adjusted causal interpretation. |
| Capacity pressure | Daily sum of recorded general respiratory + CVD counts across complete selected facilities, divided by recorded beds ×100. Diagnoses may overlap: counts are not deduplicated patients, BOR or beds required. Original respiratory-only KPI remains explicitly separate. |

Global station/site/region/date/outcome choices affect their supported summaries; pollutant/QC alter exposure pairing and fixed reference choice, not hospital records.

## Offline model and Tab 6

Weather plausibility checks use −30–60 °C and 0–100% RH. The supplied health records span 22.0–32.1 °C and 64.9–99.0% RH; zero rows are excluded by those plausibility limits.

Two Poisson log-link models, one per age group, are fitted independently in Python. Covariates are PM2.5 lag 0–7 divided by 10, temperature/10, RH/10, weekday indicators, hospital fixed effects, annual sine/cosine and linear elapsed years. Missing lag/weather/outcome values are excluded, not imputed. Covariance is hospital-clustered sandwich with small-sample correction. At least 60 training and 30 test observations per facility are required. Both QC modes retain 22 facilities.

Train: 2024–2025 only. Test: 1 January–14 October 2026. The comparator uses identical non-PM covariates and the same training/test rows. No test values fit coefficients or define training reference profiles/support.

### Full temporal evaluation

| QC | Outcome | Train rows | Test rows | Model MAE | Model RMSE | No-PM MAE | No-PM RMSE |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| VALID | Under 5 | 15,067 | 5,965 | 2,048.43 | 74,463.29 | 2.94 | 5.51 |
| VALID | Over 60 | 15,067 | 5,965 | 1,827.21 | 66,687.00 | 3.25 | 6.20 |
| VALID+SUSPECT | Under 5 | 15,427 | 6,128 | 5.88 | 52.95 | 2.94 | 5.51 |
| VALID+SUSPECT | Over 60 | 15,427 | 6,128 | 6.15 | 53.42 | 3.26 | 6.19 |

Errors are per hospital-day, not errors of national daily totals. The unrestricted model **fails to generalize extreme 2026 observations**. At KTG-01, VALID training maximum PM2.5 is 127.14 µg/m3 while the test maximum is 1,127.57. These observations remain in full evaluation. They are not silently clipped, dropped as outliers, or replaced by successful in-range metrics.

Within each facility's training PM2.5 range across all eight lags, VALID has 5,274 test rows and 691 outside; sensitivity mode has 5,424 in range and 704 outside. In-range under-5 MAE is 1.60 versus 1.90 for the comparator (VALID); over-60 MAE is 1.76 versus 2.11. These supplementary results justify only bounded exploratory scenarios, not operational forecasting.

### Bounded model simulator

- Reference profiles average **training** covariates per facility. All eight PM2.5 lags shift by the same delta to reach the selected mean concentration. The permitted delta is the intersection of each selected facility's observed training support across its lag reference values. The control cannot extrapolate beyond that intersection.
- Expected counts use exp(xβ). Expected counts are summed across modeled facilities, with those facility/bed denominators displayed explicitly. An unsupported station receives unavailable model outputs while factual health/manual planning remains available.
- For a sum M of expected means, gradient g = sum(mu_i * x_i). Parameter variance is g'Cov(β)g. The 95% interval is exp(log(M) ±1.96*sqrt(variance)/M). This includes full coefficient covariance and shared uncertainty across facility predictions.
- Bands describe the conditional expected mean, not a future patient-count interval. They omit process noise, model misspecification, residual spatial dependence, and any causal policy-effect guarantee. The two age models are separate; no unjustified joint covariance interval is fabricated for their sum.
- Date filters select observational evidence and manual capacity totals, not model retraining or historical-reference profile changes. QC switches primary/sensitivity model; the model remains PM2.5-specific even when another pollutant is selected.
- The existing manual percentage-admission/capacity calculator remains visibly separate from fitted PM2.5 estimation. Its exact zero identity, limits, mean/P90-after-summing rule, and unavailable states are preserved.

Method references, not analytical datasets: [statsmodels GLM](https://www.statsmodels.org/stable/glm.html), [conditional mean prediction intervals](https://www.statsmodels.org/stable/generated/statsmodels.genmod.generalized_linear_model.GLMResults.get_prediction.html). Reproducible dependency versions are in scripts/requirements-analysis.txt. The browser's expected means/intervals are checked against independent NumPy calculations in dataset/processed/model_validation.json.

## Response matrix and monitoring expansion

The response matrix is a synthesis of observed age-group patterns, with local fixed-2024 ≤P25, P25–P75, P75–P90 and >P90 bands. Cells report equal-facility average percent changes against that facility's low-exposure baseline. Insufficient cells are unavailable. Recommendations are review/preparation actions; the bands are not established clinical hazard thresholds or a validated early-warning system.

Expansion scoring uses raw master baseline_pm25, traffic_intensity_per_h, and nearest-neighbor Haversine distance against the **full** installed network. Each dimension uses full-catalog min–max normalization; scores are weighted means ×100. Weights are explicit user planning assumptions. Zero total weight gives unavailable scores; filtering does not redefine normalization. Top 10 are labelled and every matching score/source value is included in the accessible chart description. Road distance remains contextual source metadata, not a hidden fourth weight.

Existing station locations represent areas for a **siting study**, not fabricated new coordinates. Map circles use a user-selected 10–300 km geometric radius, explicitly an assumption. They do not prove instrument sensing coverage, population coverage or geographic monitoring deficits. No external population/boundary data or invented placement observations are added. Optional station-redundancy modeling is not implemented.

## Verification

Actual final verification and remaining browser limits are recorded in CHANGELOG.md. Source inspection alone is not browser or statistical validation. No commit or push is authorized by this task.
