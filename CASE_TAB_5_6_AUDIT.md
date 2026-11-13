# Tab 5 and 6 implementation audit

13 November 2026 (WIB). Scope: the user's CASE_STUDY_CONTEXT.md request and explicit choice to use global filters and an evidence-based response matrix. This document records calculations and limits, not a claim that the detailed chart specification is an organizer requirement.

## Sources and preprocessing

Only the 33 committee CSVs supply analytical observations and dimensions. Existing source SHA-256 checks are retained. The handbook and the booklet recovered read-only from Git were reviewed; the user's deleted workspace files were not restored.

- AQMS sensor_id joins sensors.csv, then sites.csv through location_id. Hospitals have no location_id column: the existing validated join uses province and normalized kecamatan, with unique anonymous hospital matches.
- Daily exposure uses recorded calendar dates, finite nonnegative ug/m3 values, selected QC, duplicate timestamp exclusion, hourly-bin means, and at least 18 different eligible hours per day. No imputation or universal ppm conversion is introduced. VALID is primary; VALID+SUSPECT is sensitivity analysis.
- The approved logger normalization (scripts/unit_normalization.py) applies to BJB-01, MDN-01 and PSW-01: particulate ppm columns are treated as mg/m³ ×1,000, and gas ppmv columns convert to µg/m³ at 25 °C/1 atm. These are approved analytical assumptions, not verified conversions; no universal ppm conversion exists. JMB-02 has no days meeting the 18-hour rule and Merauke (MER-01) only two valid days, so both lack a usable PM2.5 history for pairing; no substitute series is created.
- The common observation calendar remains 1 January 2024–14 October 2026. General respiratory, under-5 and over-60 counts remain separate; subgroup discrepancies are not reconciled with invented totals.
- Source rows, existing health_outcomes.json and health_exposure.json measurements remain unchanged. New health_lag.json contains fixed 2024 references; runtime validation checks them against actual daily series.

## Tab 5

| Requested analysis | Implementation and denominator |
| --- | --- |
| Dose-response | Selected paired facility-days split into five equal-count exposure quintiles; each contributing facility's mean cases inside the quintile as percent change against its own mean over the same selection, equally averaged. Raw quintile means and counts stay in tooltips. Descriptive; not a relative-risk estimate. Supersedes the earlier five equal-width raw-count bins, whose upper bins held as few as 2–3 facility-days. |
| Age comparison (balita & lansia) | Per facility, baseline = mean under-5/over-60 respiratory admissions over all selected dates (≥30 paired days, positive baselines, dates without exposure retained in the baseline). Selected pairs split into five within-facility relative exposure quintiles P1–P5; bars show the equal-facility mean percent change against each age's period baseline. Always respiratory ages, independent of the indicator selector. Descriptive; not a relative-risk or vulnerability estimate. Supersedes the earlier fixed-2024 ≤P25/>P75 design, whose frozen baseline did not follow the selected period. |
| Lag 0–7 | Per-facility Pearson with ≥30 aligned calendar-day pairs and nonzero variance, equally averaged. Maximum value is emphasized in the chart and caption. This is exploratory association, not a causal lag or guaranteed response window. |
| Episode-centered study | Start above station-specific 2024 P90 after one available day ≤P90. Full selected-date exposure/outcome window −3:+7 required. Accepted centers are at least 11 days apart. The chart displays mean percent change normalized to each episode’s own mean days −3:−1 on a zero-inclusive range; tooltips show mean recorded cases per facility-episode. Positive baseline and at least three episodes required. No control group or adjusted causal interpretation. |
| Capacity pressure | Daily sum of recorded general respiratory + CVD counts across complete selected facilities, divided by recorded beds ×100. Diagnoses may overlap: counts are not deduplicated patients, BOR or beds required. Original respiratory-only KPI remains explicitly separate. |

Global station/site/region/date/outcome choices affect their supported summaries; pollutant/QC alter exposure pairing and fixed reference choice, not hospital records.

## Distributed-lag simulator (removed 13 November 2026)

The offline Poisson distributed-lag models and the `Simulasi PM2.5 dan Admisi` panel were implemented and then removed by explicit user decision: at full-network selection the scenario domain collapsed to the intersection of per-facility training exposure (as narrow as ~2 µg/m³), producing a flat, unusable chart. The whole chain was deleted with the panel: scripts/export-case-model.py, scripts/requirements-analysis.txt, model_coef.json, dataset/processed/model_validation.json, and the client-side lag-model/confidence-chart modules. `network_rank.json` generation moved into scripts/export-policy.py and reproduces byte-identical output. Tab 6 keeps the manual capacity calculator, which does not depend on the fitted model. See design.md decision log for the record.

## Response matrix and monitoring expansion

The response matrix is a synthesis of observed age-group patterns, with local fixed-2024 ≤P25, P25–P75, P75–P90 and >P90 bands. Cells report equal-facility average percent changes against that facility's low-exposure baseline. Insufficient cells are unavailable. Recommendations are review/preparation actions; the bands are not established clinical hazard thresholds or a validated early-warning system.

Expansion scoring uses raw master baseline_pm25, traffic_intensity_per_h, and nearest-neighbor Haversine distance against the **full** installed network. Each dimension uses full-catalog min–max normalization; scores are weighted means ×100. Weights are explicit user planning assumptions. Zero total weight gives unavailable scores; filtering does not redefine normalization. Top 10 are labelled and every matching score/source value is included in the accessible chart description. Road distance remains contextual source metadata, not a hidden fourth weight.

Existing station locations represent areas for a **siting study**, not fabricated new coordinates. Map circles use a user-selected 10–300 km geometric radius, explicitly an assumption. They do not prove instrument sensing coverage, population coverage or geographic monitoring deficits. No external population/boundary data or invented placement observations are added. Optional station-redundancy modeling is not implemented.

## Verification

Actual final verification and remaining browser limits are recorded in CHANGELOG.md. Source inspection alone is not browser or statistical validation. No commit or push is authorized by this task.
