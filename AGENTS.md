# Repository instructions

These instructions apply to all work in this repository.

## Design and competition requirements

- Read [design.md](design.md) before changing dashboard layout, styling, navigation, controls, charts, analytical copy, or responsive behavior. Follow its protected decisions and component contracts.
- Read the relevant sections of the local preliminary handbook and case-study booklet before making competition-sensitive decisions. Distinguish explicit organizer requirements, user requirements, and design preferences.
- Preserve `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` exactly as the visible application heading and HTML document title. Keep PRANA as secondary branding and tab names as separate section headings.
- Keep the official Gelar Rasa logo visible, legible, and proportionate. Allow the required title to wrap on small screens; never shorten, replace, or clip it to simplify the layout.
- Keep filters collapsed by default on every screen size, with selected values visible in the summary. Opening or closing must preserve selections.
- Make the overview visual first: use a Chart.js doughnut for category composition and a full-width interactive map, matching the reference overview sections. Keep supporting interface copy short; put detailed definitions in methodology. Follow the motion and opening contracts in design.md rather than removing all animation.
- Remove phase, scoring, and submission commentary from product copy. Preserve only the required exact title and supplied official logo. Center icon/text controls with explicit flex alignment and consistent SVG chevrons.
- Treat design targets and audit findings as pending until implemented and verified. Do not describe documented aspirations as working features.

## Communication and comments

- Limit changes strictly to what the user requests. Do not make unrelated fixes, refactors, formatting changes, or other file changes without explicit user approval.
- If something outside the requested scope looks unusual or potentially incorrect, tell the user and ask whether it is intentional or a mistake before changing it.

- Keep comments concise and on one line by default. Use multiple lines only when necessary to explain a non-obvious decision or behavior.
- Explain why a decision exists rather than restating what the code does.
- Investigate blockers and continue independent work. If a blocker requires a decision or missing information, explain it and ask for the user's input with a recommended option.

## Architecture and feature separation

- Keep each dashboard tab in its own feature module with its own components, data transformations, and lifecycle management.
- Separate presentation, data loading, domain calculations, and application state. Do not combine them in a single page or script.
- Put reusable controls, chart wrappers, layout elements, and design tokens in shared modules to maintain consistency across tabs.
- Keep feature-specific code inside its feature. Access other features through explicit public interfaces; do not import their internal implementation.
- Keep raw data, processing pipelines, dashboard exports, and frontend application code in their respective directories.
- Prefer small, explicit modules and readable names. Favor understandable control flow over clever abstractions or code that merely works.
- Follow established best practices appropriate to the project's stack and scope. Add dependencies or abstractions only when they solve a concrete need.

## TypeScript and correctness

- Use TypeScript for new or substantially rewritten frontend application logic, with `strict: true` in the TypeScript configuration.
- Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` when establishing TypeScript configuration.
- Define explicit types for dataset records, filter state, component interfaces, and chart inputs. Do not use `any`, unchecked assertions, or suppression comments to bypass errors.
- Validate external data at runtime before treating it as typed application data.
- Keep Python analysis and notebook workflows in Python; the TypeScript requirement applies to frontend application logic.
- Do not maintain backward compatibility. Remove obsolete interfaces, fallback paths, and duplicate implementations when replacing behavior.
- Handle missing data, empty selections, invalid date ranges, and unavailable resources explicitly. Never silently substitute invented values.

## Data integrity and analysis

- Use only the existing project datasets for analytical claims, metrics, charts, map markers, and dashboard content. Do not invent observations, statistics, trends, or fallback records.
- Read the relevant files in `dataset/raw/` before reasoning about a metric or implementing a data-dependent feature. Inspect their schemas, units, timestamps, quality flags, and missing values.
- Use `dataset/raw/master/` and `dataset/raw/metadata/` to understand station, sensor, hospital, and date relationships; inspect the relevant `aqms/` and `health/` records for the analysis.
- Treat `dataset/raw/` as the source of truth and preserve the original files. Keep cleaning and aggregation reproducible in the analysis pipeline.
- Use `dataset/processed/` for cleaned and intermediate analytical outputs and `dataset/dashboard/` for simplified data exported for dashboard display.
- The root `dashboard/` directory contains frontend code and the presentation export `tab1_ikhtisar.json`; `dashboard/data/` contains the generated station catalog. These summaries are not a substitute for examining raw data.
- Trace displayed values to source files and transformations. Document aggregation periods, denominators, units, quality filtering, and any limitations that affect interpretation.
- If the required raw data is missing or a claim cannot be supported, report the gap and request the missing information rather than guessing.
- Treat the committee-provided dataset as the accepted source for competition analysis. Do not repeatedly flag, add synthetic-data badges, or qualify recommendations merely because the dataset is synthetic; its origin is not a blocker to analysis. Preserve accurate source attribution and anonymous hospital identities. Continue checking units, missingness, relationships, and statistical validity; do not imply live observations, nationwide population representation, or causal health effects without supporting evidence.
- Validate logger units, completeness rules, averaging periods, classification definitions, and source relationships before presenting derived metrics. Do not assume a universal conversion for columns named `ppm`.
- Ensure displayed filters describe the effective data scope. Disable or clearly scope unsupported controls; changing a selection summary alone does not implement filtering.
- Keep methodology text synchronized with actual pipeline behavior and generated outputs. Do not hardcode unverified quality counts, hospital names, or explanatory statistics.

## Shared AQMS filtering contract

- Use the filtering flow verified in [simulasi_penyaringan_tab2.ipynb](notebooks/simulasi_penyaringan_tab2.ipynb) for new or changed AQMS analyses, notebooks, exports and dashboard features. The production references are [export-compliance.py](scripts/export-compliance.py), [unit_normalization.py](scripts/unit_normalization.py) and the annual assessment in [compliance/model.ts](dashboard/src/features/compliance/model.ts). The notebook explains and verifies these rules; its saved outputs are not a replacement data source. This contract does not apply AQMS rules to hospital outcome records.
- Resolve station/sensor relationships and supported units through raw master/metadata before aggregation. Reuse the existing normalization policy and its explicitly approved station-specific assumptions; never apply a universal ppm conversion, infer missing logger settings, or introduce new conversion assumptions without user approval.
- Accept only `VALID` by default. Include `SUSPECT` only when explicitly selected; all other QC flags stay excluded. Reject every record belonging to a duplicated `timestamp_start` within the station source, not just the later duplicate. Require readable timestamps and numeric concentrations, dates inside the export calendar, finite values and concentrations >= 0. Keep genuine zeros. Do not reject high concentrations solely because they are high or add weather/outlier cutoffs without user approval.
- Apply value eligibility per pollutant. Group accepted records by recorded local calendar date and hour, average records within each hour, then average the eligible hourly means with equal hour weights. Do not infer a timezone shift. A daily mean requires at least 18 distinct eligible hours; counting 18 rows is insufficient. Missing/insufficient days remain null, never zero or an imputed value.
- Daily-reference comparisons use 24-hour means for PM2.5, PM10, SO2 and NO2. CO/O3 use the maximum of complete eight-hour moving averages within the same day: starts 00 through 16, all eight consecutive hours required per window, at least 13 of 17 windows required per day. Do not substitute the 24-hour mean for an unavailable eight-hour maximum or add cross-midnight windows.
- Keep denominators explicit: measured days count available 24-hour means; comparison days count available observations of the required regulatory averaging period. Calculate exceedance percentages from comparison days, not the full calendar or an assumed shared denominator. With no comparison days, report unavailable rather than 0%.
- For annual evaluation, average available daily means in the selected year. Coverage uses all 365/366 calendar days. A measured series is partial when the export has not reached 31 December of that year or coverage is below 75%; no measured days means unavailable. Preserve the distinction between completeness and concentration relative to the reference; the 75% annual rule is an analytical convention, not a legal or organizer requirement. Do not invent annual references for pollutants without one.
- In the annual evaluation chart, keep `Sertakan data parsial` off initially and exclude partial rows before ranking. Enabling it includes existing partial results with neutral styling and visible coverage; it does not relax record/daily filtering or impute gaps. Retain partial/missing stations in the complete table and station inventory with explicit availability states.
- Reuse production transformations instead of maintaining divergent cleaning copies. When a separate explanatory calculation is necessary, verify it against the production pipeline and generated exports, including missing positions, QC modes, units, leap years and CO/O3 denominators. Preserve source provenance, regenerate affected exports through their pipeline, and synchronize methodology/notebook outputs when changing the authorized filtering behavior. Report rejection counts by stage without double-counting records and distinguish missing raw observations from observations rejected by QC/completeness.
- This is the required target for AQMS work, not a claim that every existing tab already conforms. If an older pipeline differs (including Tab 1), report the discrepancy and obtain user approval before migrating unrelated features. Do not silently change existing metrics, thresholds or datasets as part of another task.

## Performance and lifecycle

- Destroy chart and map instances when their owning components are removed or replaced. Reuse instances when updating them where the library supports it.
- Remove event listeners, observers, subscriptions, and timers on teardown; cancel pending requests when their results are no longer needed.
- Avoid duplicate initialization, unbounded caches, retained DOM references, and repeated allocations during rendering.
- Choose data structures and algorithms appropriate to dataset size. Avoid repeated full scans, redundant transformations, and loading raw analytical datasets into the browser when an export suffices.
- Check that switching tabs, changing filters, and repeated mounting do not accumulate resources or produce stale results.

## Accessibility and responsive behavior

- Use semantic HTML, properly associated labels, keyboard-operable controls, visible focus indicators, and accessible names and states.
- Provide text equivalents or summaries for charts and maps. Do not communicate meaning through color alone.
- Keep text readable, maintain sufficient contrast, and support usable touch targets.
- Ensure layouts and controls work on mobile, tablet, and desktop without clipped content or unintended horizontal scrolling.
- Respect reduced-motion preferences and manage focus correctly in dialogs and disclosures.

## Validation and Git workflow

- Validate the affected behavior with appropriate type checks, builds, and focused tests. For UI changes, check accessibility, responsive layouts, and interactions when browser tooling is available.
- Test meaningful behavior and edge cases rather than mirroring implementation details. Report verification limits honestly.
- Do not commit or push unless the user explicitly asks for that action for the current work. Do not carry an earlier push request into a later editing task.
- Keep each commit focused on one feature. Separate unrelated features and refactors into separate commits.
- Stage only files belonging to the feature being committed. Preserve unrelated user changes and never include them incidentally.
- Do not commit secrets, private configuration, or ignored raw datasets.

## Documentation and change logging

- Maintain [design.md](design.md) as the design contract and [CHANGELOG.md](CHANGELOG.md) as the chronological record of completed changes.
- For each implementation change, append a concise dated Markdown log entry covering what changed, why, affected files/components, validation, and outstanding limitations. Use WIB dates and distinguish completed work from proposals.
- Update the relevant design sections and decision log whenever behavior, visual conventions, protected requirements, or data interpretation changes. Preserve prior change-log entries, including reversals.
- Record actual verification results; source inspection is not browser verification or validation of statistical results. Report unavailable checks explicitly.
- Keep documentation detailed enough to guide implementation; the concise-comment rule applies to code comments, not to necessary design explanations.


## Frontend implementation workflow

- Use Vite for development: `bun run dev` (or `npm run dev`) must keep watching the source and update the browser automatically. Do not require a server restart or manual build after ordinary TypeScript, Tailwind/CSS, HTML, or dashboard-export edits. CSS uses hot updates; application, HTML, and export changes may reload the page. Refresh chart colors after CSS hot updates without recreating chart instances. Keep pending requests, chart instances, observers, and listeners safe on reload and teardown.
- Edit `dashboard/entry.html` for the source HTML, `dashboard/src/` for application logic, and `dashboard/styles.css` for Tailwind styling, design tokens, and precise component rules. Use the official Tailwind Vite plugin and Tailwind utilities/`@apply` for shared structure and controls; preserve the established tokens, responsive behavior, motion, and vendor styles. Do not enable Tailwind Preflight or replace the existing reset without verifying its effects on every tab, control, chart, and Leaflet map.
- `dashboard/index.html`, deep-link HTML entries, `dashboard/app.js`, `dashboard/app.css`, `dashboard/assets/`, and `dashboard/THIRD_PARTY_LICENSES.md` are generated outputs. Rebuild with `bun run build` or `npm run build`; never edit generated files directly. The Vite production build produces `dist/` and synchronizes the repository's static dashboard export. Use `bun run preview` for the built site; never use preview as the live development server.
- Use Node.js 24+ and synchronized `package-lock.json`/`bun.lock`. Run `npm run build`, `npm test`, and relevant browser checks against Vite development and the production preview after tooling/styling changes. Verify real source edits trigger live updates, test direct access/refresh on every route, and preserve `/dashboard/` asset resolution. Keep generated bundles, local fonts/licenses, and source changes synchronized so the static HTTP workflow continues to work.
- Keep measurement JSON generated by the analysis pipeline. Do not restore `window.TAB1_DATA`, legacy fallback records, or CDN runtime dependencies removed by the refactor.
- Regenerate station dimensions with `npm run data:catalog` when the raw station master changes. Preserve source `region_group` values; do not assume every group is an island or normalize it by guessing.
- Maintain explicit unavailable states for analyses without validated exports. Never fill those tabs with decorative or fabricated analytical results.
- Preserve the distinction between globally scoped health indicators and station-filtered observations. Keep unsupported date, pollutant, and QC controls disabled until the pipeline and UI support their real effects.


## Overview visualization and motion

- Bundle Chart.js locally and reuse chart instances for filter/theme updates. Destroy charts and owned observers/listeners on feature teardown; do not replace animated graphs with CSS-only imitations.
- Keep the PRANA haze/logo opening skippable, brief, and tied to actual loading. Ensure the first chart entrance is visible after the opening and reduced-motion users receive an immediate final state.
- Respect reduced-motion changes in JavaScript as well as CSS. Keep sidebar, drawer, and disclosure transitions smooth for normal motion.
- Do not require on-screen synthetic-data notices for the committee-provided dataset. Preserve material quality limitations and the effective health-data scope; shorten prose without hiding information needed to interpret results.


## Selection controls and routes

- Use the shared searchable-select component for supported selection filters. Search alone must not change analytical state; commit only a valid selected option and preserve the previous value on Escape or blur.
- Show only `Prana Textual.png` and the chevron in the expanded sidebar header. Remove `Prana Emblem.png` from the sidebar. When collapsed, hide the wordmark and center only the chevron in the header; preserve the mobile drawer wordmark.
- Maintain `dashboard/routes.json` as the single route registry. Each tab has its own canonical path; the overview is `/dashboard`. Keep browser history, direct access, generated static entries, and server routing aligned.
- Preserve the `/dashboard/` asset base and test refreshes on every deep link. Do not reintroduce `dashboard/index.html` as the displayed entry URL.


## Reference content

- Use commit `c593c4da5e815fbd0bc85283f1bf07860271051f` for requested research questions, analytical headings, headline indicator subjects, and planned tab descriptions; apply them through the current components and design contract, not the legacy page or script.
- Keep period means distinct from annual compliance, global hospital ratios distinct from station filters, and exported national day-station exceedance distinct from equal-weight selected-station percentages.
- Preserve the documented data corrections when restoring content. Do not copy hardcoded ticker claims, named anonymous hospitals, QC totals, unimplemented models, or unsupported methodology guarantees as facts.

- Match the reference overview’s section inventory: indicators/distribution followed by the full-width map. Do not restore the added rankings or standalone admissions panel. Use `Acuan Harian (ISPU 24-Jam)` and `Acuan Tahunan (PP 22/2021)` with their respective color/radius encodings, dynamic selected-data legends, and popups.
