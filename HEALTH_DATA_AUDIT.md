# Health-tab dataset audit

Checked 11 November 2026 (WIB). Scope: the complete raw health file, all 27 AQMS files (667,981 measurement rows), station/sensor/hospital masters, date/sensor metadata, case-study health definitions, and the current overview notebook. Raw records and analytical exports were not changed. The committee dataset is accepted as the source for analysis.

## Health coverage and fields

- `dataset/raw/health/HLT-01_health_outcomes_daily.csv` contains 27,491 records for 27 hospital IDs over 1,019 distinct dates, 31 December 2023–14 October 2026.
- The common period 1 January 2024–14 October 2026 contains exactly 27,486 hospital-date records: all 27 hospitals on all 1,018 dates. Five hospitals also have records on 31 December 2023: RS-XXX-12, RS-XXX-13, RS-XXX-16, RS-XXX-19, RS-XXX-20.
- No duplicate hospital-date keys or blank fields were found. All seven outcome columns contain finite, nonnegative integer-valued counts. Day-of-week labels agree with calendar dates.
- Use `date` for joins and lag construction. `time` has different origins: 31 December 2023 for the five hospitals above and 1 January 2024 for the other 22 hospitals. It is not a shared calendar index.
- Available outcomes: respiratory admissions under age 5, respiratory admissions over age 60, asthma emergency cases, COPD admissions, general respiratory admissions (`resp`), cardiovascular admissions (`cvd`), and deaths. The age definitions follow the booklet; do not silently relabel over 60 as 60+.
- Daily temperature, dew point, and relative humidity are available for model adjustment. Population-at-risk counts, patient-level records, bed occupancy, and length of stay are not fields in these supplied health/master schemas.

### Outcome totals in the common period

These are sums of the supplied fields, not estimates of cases caused by pollution. Do not add the columns together as disjoint patient groups.

| Field | Sum, 1 January 2024–14 October 2026 |
| --- | ---: |
| `resp_admissions_under5` | 186,167 |
| `resp_admissions_over60` | 225,117 |
| `asthma_emergency_cases` | 132,825 |
| `copd_admissions` | 109,329 |
| `resp` | 733,191 |
| `cvd` | 206,668 |
| `death` | 54,630 |

There are 92 hospital-date records where `resp` is smaller than `resp_admissions_under5 + resp_admissions_over60`. For example, RS-XXX-27 on 16 January 2024 has 1 under-5 admission, 1 over-60 admission, and `resp = 0`. Preserve the fields independently; the supplied definitions do not resolve this discrepancy. Clarification is needed before treating these as a reconciled total/subgroup hierarchy.

## Relationships and capacity

All three master tables contain 27 records with no blank fields. The hospital master contains 6,280 beds in total. Hospital labels remain anonymous.

The existing notebook pairs `sites.iloc[i]` with `hospitals.iloc[i]`. Inspection of all 27 pairs found matching provinces and recognizable corresponding locations. Some administrative labels differ (for example, Jakarta city prefixes and parenthesized locality names). This supports the intended pairing but does not establish patient catchments or personal exposure. There is no explicit station foreign key in the hospital master. A future health pipeline should encode a checked ID mapping instead of relying on CSV row order. The AQMS sensor IDs can be joined through `sensors.csv` to `sites.csv`.

## PM2.5 coverage for paired analyses

The following is an independent coverage audit, not a regenerated dashboard export. For each raw AQMS file: parse `timestamp_start`, restrict its recorded calendar date to 1 January 2024–14 October 2026, keep `qc_flag == VALID`, require finite/nonnegative PM2.5, group by recorded date, and count distinct hour-of-day bins. A date qualifies with at least 18 such hours. Multiple readings within one hour count once. No unit conversion, imputation, timestamp rounding, or fitted model was performed. These are candidate exposure dates; actual lag analyses must also require the appropriate preceding dates and valid joins.

| AQMS file | PM2.5 field | Qualifying dates / 1,018 |
| --- | --- | ---: |
| `BGL-01_Bengkulu_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `BGR-01_Cisarua_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `BGR-02_Baranangsiang_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `BJB-01_Banjarbaru_AQMS.csv` | `pm25_ppm` | 1,018 |
| `BTM-01_Batam_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `IDP-01_Indrapuri_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `JKT-01_Gambir_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `JKT-02_Marunda_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `JKT-03_Cengkareng_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `JMB-01_KotaJambi_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `JMB-02_MuaroJambi_AQMS.csv` | `pm25_ug_m3` | 0 |
| `KTB-01_Kototabang_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `KTG-01_PalangkaRaya_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `KTG-02_Sampit_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `MDN-01_Medan_AQMS.csv` | `pm25_ppm` | 371 |
| `MER-01_Merauke_AQMS.csv` | `pm25_ug_m3` | 2 |
| `MLG-01_Malang_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `MRS-01_Maros_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `PKN-01_PangkalanBun_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `PKU-01_Pekanbaru_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `PLB-01_TalangBetutu_AQMS.csv` | `pm25_ug_m3` | 696 |
| `PLU-01_LoreLindu_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `PSW-01_Pesawaran_AQMS.csv` | `pm25_ppm` | 1,018 |
| `SM2-01_Samarinda_AQMS.csv` | `pm25_ug_m3` | 771 |
| `SRG-01_Sorong_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `STG-01_Sintang_AQMS.csv` | `pm25_ug_m3` | 1,018 |
| `YKY-01_Sleman_AQMS.csv` | `pm25_ug_m3` | 1,018 |

Twenty-two stations have all 1,018 qualifying dates under this rule. Medan, Merauke, Muaro Jambi, Palembang, and Samarinda have reduced coverage.

- Muaro Jambi: 10,951 blank/non-numeric PM2.5 values, 873 nonfinite values, 7,589 negative finite values, 223 repeated sensor/start-timestamp records beyond the first, and timestamps extending back to 1970. Only 122 rows carry `VALID`; no date meets the coverage rule. Keep the hospital's descriptive data available, but do not substitute another station's exposure or zero exposure.
- Merauke: 9,778 blank/non-numeric PM2.5 values and 1,780 negative finite values; only two dates qualify.
- Medan: 20,800 rows over 999 recorded dates, rather than a full nominal hourly sequence. There are 624 blank/non-numeric PM2.5 values.
- Palembang: 36,381 rows include irregular/subhourly sampling. Counting distinct valid timestamps gives 698 dates with at least 18 readings, but counting distinct valid hours gives 696. Row count alone does not establish 18-hour coverage.
- The three PM2.5 fields labeled `ppm` occur in Banjarbaru, Medan, and Pesawaran. The current notebook multiplies these values by 1,000. The metadata names both standard and logger-export units but does not specify a numerical conversion for particulate mass. Confirm the logger scale before interpreting normalized concentrations or exposure–response slopes; this audit does not validate that multiplier.
- Batam, Kota Jambi, Malang, Sintang, and Pangkalan Bun have start timestamps just before midnight on 31 December 2023. Preserve recorded dates unless an explicit clock-alignment rule is justified; lag alignment must not assume every nominal first record is on 1 January.

## Existing export implications

The overview notebook computes `total_resp` as under-5 plus over-60 admissions. That is a combined age-group measure, not the supplied general respiratory field `resp`. It fills missing values/dates with zero, pairs hospital/station rows by position, and uses a daily QC row count rather than distinct valid hours per pollutant for completeness. These are findings for review, not fixes made by this audit. The health-tab export does not yet exist; the tab remains unavailable.

## Recommended health-tab scope

Start with daily admission summaries and separate under-5/over-60 trends using the complete health period. Support the other recorded outcomes through an outcome selector. Build PM2.5 lag 0–7 analyses only on eligible matched exposure/outcome dates; report effective hospital/date coverage and uncertainty. Never compress missing calendar dates when shifting lags. A lag-7 analysis starting at the beginning of the supplied exposure period needs seven preceding exposure dates, which are not available for a complete first-week analysis.

Keep raw age-group counts distinct from population-based vulnerability or incidence rates. An admissions-per-100-beds measure is possible, but it is not occupancy. Model estimates, age differences in adjusted associations, exposure–response shapes, and a strongest lag remain uncalculated. No frontend, build, browser, causal inference, or fitted-model validation was performed.

## Implementation follow-up — 12 November 2026 (WIB)

The audit above describes the state inspected on 11 November. Tab 5 is now implemented with its own `scripts/export-health.py` pipeline and separate outcome/exposure/provenance exports. The original overview notebook remains unchanged. The new pipeline resolves the reviewed concerns for this tab by using checked province/district matching, calendar-date joins, distinct-hour per-pollutant coverage, explicit nulls, separate raw outcomes, and exclusion of logger units lacking a verified conversion.

All six pollutant fields were scanned across the raw records. In the new export, each pollutant has 21,829 eligible VALID station-days out of 27,486 possible station-days, with three logger-unit stations excluded. With VALID+SUSPECT, PM2.5/SO2 have 22,329 eligible station-days and PM10/CO/O3/NO2 have 22,441. These are exposure availability counts, not measurements of health effects. Palembang has 696 VALID PM2.5 dates under the distinct-hour rule. Each health outcome is preserved separately; complete outcome counts remain available independently of exposure eligibility. Health-tab lag and grouped-concentration summaries are descriptive calculations over this export; adjusted models remain unimplemented.
