# Change log

Record completed changes chronologically with dates in WIB. Each entry states the scope, reason, validation, and remaining limitations. Planned work belongs in the design audit or feature plan, not among completed changes.

## 12 November 2026 — Remove health bottom disclosure and footer

- Removed the pictured `Data & Cara Membaca` disclosure and source footer from Dampak Kesehatan, including its table/pagination code, listeners, and unused CSS. Preserved methodology in the global dialog and adjusted chart text alternatives to remove references to deleted tables while retaining concise summaries and individual lag/bin values.
- Affected: `features/health/view.ts`, `features/health/charts.ts`, `components/methodology.ts`, `dashboard/styles.css`, rebuilt `dashboard/app.js`, the focused health browser assertions, and `design.md`. No dataset, calculation, filter, or route changes.
- Validation: strict build and all 23 model tests passed. All 8 focused health browser checks passed, including assertions that the disclosure/footer are absent, responsive layouts, filter/route interactions, and visible animation updates. Reviewed the updated desktop dark screenshot. Full-suite pre-existing overview failures remain as documented in the implementation entry. No commit or push.

## 12 November 2026 — Dampak Kesehatan implementation

- Replaced the Tab 5 placeholder with a dedicated strict TypeScript feature: outcome selection, four real-data health/bed-burden indicators, paired-coverage context, aligned daily exposure/admission plots, lag 0–7 Pearson plots, and descriptive concentration-group comparisons. Added expandable definitions plus keyboard-accessible tables and daily pagination. Preserved the required application title, original research question, branding, shared typography, and light/dark visual system.
- Reused the existing shared filters for all six pollutants, region, site type, station, dates, and QC; navigation collapses the disclosure without losing selections. Added only the seven-outcome searchable selector locally. Exposure/QC changes leave raw health counts unchanged. Kept missing/insufficient exposure visible while retaining available health summaries, and labeled respiratory bed burden independently of the selected outcome.
- Added `scripts/export-health.py` (`npm run data:health`) and mirrored outcome/exposure/source-provenance JSON files under `dataset/dashboard/` and `dashboard/data/`. Matched hospitals by checked province/district rather than row order, preserved raw outcomes/nulls, required 18 distinct eligible hourly bins per pollutant/day, excluded duplicate timestamps and invalid values, and left unverified ppm conversions unavailable. Each of the two analytical payloads is below 2 MB (452,820 and 1,924,453 bytes); no raw file or overview calculation/export changed.
- Added runtime schema/calendar/count validation, lazy health-data loading with a bounded validated cache, sibling-request cancellation on failure, loading/retry states, and abort/teardown handling. All four Chart.js instances are reused for updates; the shared lifecycle supports null-valued gaps, themes, and live reduced-motion changes. Added years on trend axes, all 0–7 lag labels, readable wrapping metric labels, desktop/two-column/phone layouts, and explicit aligned control icons.
- Updated `design.md`, `HEALTH_DATA_AUDIT.md`, the shared shell/main wiring, health-specific methodology, and the existing navigation test for the newly available tab. Source implementation lives in `dashboard/src/features/health/`; rebuilt `dashboard/app.js` through the normal build. No dependency or lockfile changes were needed.
- Validation: Node 24 strict `npm run build` and all 23 `npm test` checks passed. All 8 focused health browser checks passed, including actual counts, direct refresh/history, retained shared filters and canvas nodes, outcome selection/cancellation, missing exposure, single-day insufficient lag data, pagination, retry, pending-request navigation, theme/reduced-motion updates, and repeated teardown without detached canvas painting. Reviewed light/dark screenshots at phone/desktop widths and intermediate layouts (320–1440px), with no page horizontal overflow. Source mirrors and generated coverage counts were checked independently; `git diff --check` passed.
- Broader verification: full Playwright suite passed 40/43. The three failing overview checks were reproduced against unchanged commit `8c5a815` in `/tmp/gelar-health-baseline`: expected exceedance 17.7 versus existing 15.96; expected annual-map counts 3/24 versus existing 4/23; and map-explanation vertical-alignment tolerance (<1px) exceeded by about 1.3–1.5px. These are pre-existing overview failures and were not changed within this health-tab task.
- Limits: correlations and grouped case means are exploratory and unadjusted; no fitted risk/causal model, confidence interval, or event study is claimed. Logger-unit stations remain excluded from paired exposure analysis until conversion is supported, while their health data remain available. No exhaustive heap or assistive-technology audit, commit, or push performed.

## 11 November 2026 — Committee dataset policy and health-data audit

- Updated `AGENTS.md` and the superseding policy in `design.md` at the user's request: accept committee-provided data without repeated synthetic-data qualifications or required badges. Retained accurate source attribution, anonymous hospitals, and substantive analytical checks.
- Added `HEALTH_DATA_AUDIT.md` after scanning all 27,491 health rows and 667,981 AQMS rows, inspecting master/metadata relationships and relevant booklet definitions, and reviewing the overview notebook. Recorded health completeness, separate outcome totals, 92 total/subgroup discrepancies, differing `time` origins, station-specific PM2.5 coverage, unit questions, and current export assumptions.
- Validation: Python standard-library CSV/date/numeric audits, distinct-hour PM2.5 coverage checks, all 27 location-pair comparisons, and `git diff --check`. No raw data, generated export, frontend, or pipeline behavior changed; builds/browser tests and fitted-model validation are outside this documentation-only change. Proposed health features remain unimplemented.

## 11 November 2026 — Dynamic multi-dimensional filtering, custom date range, badges, and metric card styling

- Implemented daily multi-dimensional timeseries cube export in `notebooks/etl_tab1_ikhtisar.ipynb` and generated `tab1_ikhtisar.json` (1.64 MB, within booklet <2 MB limit) covering 1,018 dates × 27 stations × 6 criteria pollutants (`pm25`, `pm10`, `so2`, `co`, `o3`, `no2`) across both `VALID` and `VALID + SUSPECT` modes with $\ge 75\%$ daily completeness.
- Converted logger units (`_ppm` to $\mu\text{g}/\text{m}^3$) for `BJB-01`, `MDN-01`, and `PSW-01` during normalization.
- Activated all filter dimensions in `dashboard/src/components/filters.ts`: pollutant selector buttons, SUSPECT checkbox, period presets, and arbitrary custom start/end date pickers with bidirectional preset synchronization.
- Updated filter summary header (`#filter-summary`) to display modular visual badges (`.filter-badge`) including active state highlights and explicit site type scope.
- Aligned KPI metric card title (`.metric-label`) typography with panel header `h3` (`Kategori ISPU Dominan Stasiun`: 15px, font-weight 600, color `var(--text)`).
- Replaced absolute positioning of `.metric-icon` with a flex container header (`.metric-header`) aligning title and icon on the exact same horizontal row (`align-items: center; justify-content: space-between`).
- Enforced single-row display on metric card subtitle (`.metric-context`) with `white-space: nowrap; text-overflow: ellipsis;` across both expanded and collapsed sidebar layouts.
- Removed redundant scope strip (`.scope-strip`) containing station counts, date period details, and inline methodology note button from the Overview tab.
- Updated topbar eyebrow brand text from generic `PRANA / AIR & HEALTH` to an informative 6-word title `PRANA: SISTEM PEMANTAUAN KUALITAS UDARA NASIONAL`.
- Removed the `Dataset sintetis` badge from the section header in `dashboard/src/components/shell.ts`.
- Established clearer typography hierarchy between outer row containers and inner chart panels: container headers (`.panel-header h3`) enlarged to 20px (-0.025em letter spacing; 18px on mobile), while inner chart headers (`.composition-panel .panel-header h3`) and metric card titles remain at 15px.
- Made the application topbar header sticky (`position: sticky; top: 0; z-index: 900`) so title, branding, theme switch, and methodology actions stay permanently accessible when scrolling.
- Fixed sticky header overlap bug where navigating to a tab triggered browser default scroll-into-view on `main.focus()`, obscuring the page intro; resolved with `main.focus({ preventScroll: true })`, `window.scrollTo(0, 0)`, and `html { scroll-padding-top: 96px }`.
- Fixed critical station code size (`.metric-station .metric-value strong`) to `38px` on desktop and `26px` on mobile.
- Added client-side dynamic slice-and-aggregate engine in `dashboard/src/features/overview/model.ts` and hospital burden estimation over active date ranges.
- Validation: Bun TypeScript check passed with 0 errors (`bun run typecheck`), build passed (`bun scripts/build.mjs`), and 15/15 unit tests passed (`bun test`).
- Limitations: Tabs 2–6 remain placeholders pending their respective ETL pipelines. Analysis covers synthetic competition dataset.

## 10 November 2026 — Design contract and competition title correction

- Added `design.md` after reading the preliminary handbook and case-study booklet, reviewing the current dashboard source and Tab 1 pipeline, inspecting raw master/metadata tables and representative measurements, and checking all AQMS file headers.
- Documented competition constraints and scoring priorities, protected design decisions, layout and typography scales, theme colors, filter semantics, KPI definitions, chart/map conventions, responsive behavior, accessibility, and release checks.
- Added an open audit register that distinguishes unsupported or incomplete behavior from implemented features; no analytical calculations or exports changed.
- Expanded `AGENTS.md` to require reading the design contract, preserving the exact competition title and logo, retaining collapsed filters, using truthful data presentation, and maintaining Markdown change history.
- Restored `DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi` in the visible heading and HTML document title in `dashboard/index.html`. This corrects the earlier title simplification.
- Updated `dashboard/styles.css` so the top bar can grow and the complete title can wrap; removed the title wrapper's non-shrinking constraint and text-selection restriction.
- Retained the existing all-device collapsed filter default and selected-value summary.
- Validation: checked exact title text in HTML, preserved collapsed filter initialization, parsed HTML for duplicate IDs and control structure, checked local Markdown links, and ran `git diff --check`.
- Limitations: no visual browser verification or full statistical audit performed. Other design audit items remain pending, including filter consistency, unsupported claims, unit normalization, completeness rules, and accessibility improvements. No commit or push performed for this revision.

## 10 November 2026 — Apply dashboard design and TypeScript component architecture

- Replaced the monolithic frontend with strict TypeScript under `dashboard/src/`, separating shared components, data contracts/loading/validation, the overview model/view, and modules for all six navigation sections.
- Added a locked npm toolchain, strict compiler configuration, static esbuild output, local Leaflet styles/library, and locally served Inter/Space Grotesk fonts with their licenses. Existing HTTP/Live Server access to `/dashboard/` remains supported.
- Rebuilt the layout with restrained light/dark surfaces, readable labels, consistent panel spacing, compact metrics, full competition-title wrapping, an 80px desktop rail, and a mobile navigation drawer. Preserved official branding and the all-device collapsed filter default.
- Connected region, site type, and station selections to the same overview population for metrics, distribution, rankings, map, and table. Added dependent selection reconciliation, announcements, and reset without changing disclosure visibility.
- Disabled unsupported date, period, pollutant, and SUSPECT controls with a visible explanation. The interface no longer implies that changing these unsupported dimensions recalculates the results.
- Generated a small station catalog from the raw master via `scripts/export-station-catalog.py`; retained source region-group labels, including mixed city/province groups, instead of inventing island groups.
- Replaced the unsynchronized station-day exceedance headline with selected-station count and recorded-row VALID coverage. Selected mean and highest concentration come from the existing per-station export. The existing health indicator is a separate, fixed-scope panel with its admissions/capacity denominator and limitations.
- Replaced the donut with a labeled category distribution bar and shared HTML rankings with matched zero-based scales. Ranking groups do not overlap when fewer than 20 stations match. Added an accessible full station table.
- Removed unsupported ticker claims, fabricated fallback observations and real hospital aliases, hardcoded methodology QC figures, decorative title animation, card hover glow, and runtime Tailwind/Chart.js CDN dependencies.
- Implemented native methodology-dialog semantics, contained dialog/drawer focus, Escape dismissal, focus restoration, labeled controls, a skip link, reduced-motion handling, and polite filter announcements.
- Added explicit teardown for maps, layers, resize/theme observers, component listeners, requests, retry controls, and application lifetime. Theme changes reuse the map layer; resizing refits selected station bounds. Map tile failure preserves points and the station table with a single failure message.
- Removed `dashboard/tab1_data.js` and stopped the notebook from regenerating its obsolete global-data wrapper. Measurement JSON and analytical calculations were not changed or rerun.
- Updated `design.md`, `AGENTS.md`, and `README.md` with the implemented architecture, remaining audit issues, development commands, data scope, and verification boundaries. Ignored browser-test artifacts.
- Validation: strict TypeScript checking and static build passed; all five focused data/model tests passed; all 12 browser tests passed across 320, 375, 768, 1024, 1440, and 1920px in both themes. Checked exact titles, synchronized exports/catalog copies, dependency-lock consistency, tab/map remounts, failure recovery, keyboard focus, reduced-motion reflow, and `git diff --check`. Reviewed desktop light/dark and mobile screenshots.
- Limitations: logger-unit normalization, regulatory classification definitions, daily completeness rules, and existing health missing-value assumptions still need statistical validation. These limitations are visible in the UI and methodology. Tabs 2–6 remain explicitly unavailable. Automated map tests block basemap requests to exercise failure handling; successful live tile delivery and a dedicated assistive-technology/heap-profile audit were not performed. No commit or push performed.

## 10 November 2026 — Development-server port conflicts

- Changed `dev` to run `scripts/dev.py`, which tries port 5500 and up to nine subsequent ports when occupied, prints the actual `/dashboard/` URL, supports `--port`, and closes the server on Ctrl+C.
- Updated `README.md` and `design.md` with the launch behavior. Existing processes are never stopped to free a port.
- Validation: `bun run dev --help` passed; a real occupied-port smoke check selected a subsequent port and returned the dashboard HTML with HTTP 200. No frontend behavior or dataset values changed.

## 10 November 2026 — Esri World Street Map basemap

- Replaced CARTO's light/dark tile endpoint with the public Esri World Street Map raster service in `dashboard/src/components/station-map.ts`, using the service's `z/y/x` tile order with no API-key or token parameter.
- Updated map captions and Leaflet attribution to the source list published by the Esri service. Kept the native street-map appearance in both themes and removed the unnecessary tile-theme observer.
- Retained station coordinates, measurements, filter synchronization, resize handling, map teardown, error messaging, and table alternatives. Esri is used for geographic context only, without joining external observations to the competition dataset.
- Updated the browser request interception and added an endpoint/attribution/theme regression check. Rebuilt `dashboard/app.js` and updated `design.md` and `README.md`.
- Validation: strict TypeScript checking and build passed; retrieved Esri service metadata and a real Indonesia-region tile without authentication, and visually checked the returned tile. All 13 browser tests passed, including the public Esri endpoint, provider attribution, theme preservation, synchronized filtering, and six viewport widths. `git diff --check` passed.
- Provider limitation: this legacy service is listed for retirement in December 2029 in Esri's lifecycle notice, linked from `design.md`. No API-key configuration is required by the implemented endpoint; network availability and provider terms still apply.

## 11 November 2026 — Visualization-first Ikhtisar Nasional

- Reconnected `dashboard/index.html` to the modular TypeScript application after inspecting the pulled `c593c4d` worktree; retained the exact required title, official logo, existing data exports, and Esri World Street Map. The user's stash was not applied, modified, or discarded.
- Rewrote `design.md` around visual comprehension, short supporting copy, composition/comparison chart choices, purposeful motion, alignment, responsive plotting, and accessible alternatives. Updated `AGENTS.md` to preserve this direction.
- Added locally bundled Chart.js and reusable chart/lifecycle components. Replaced the static category strip with an animated doughnut, a centered selected-station count, and a concise category/count/percentage legend.
- Replaced HTML ranking bars with animated horizontal Chart.js comparisons, direct value labels, full-location tooltips, a shared zero-based maximum, and matched category-axis widths so paired plot areas remain comparable. Small selections remain disjoint rather than duplicating stations.
- Reorganized the overview into a compact 2×2 indicator block beside composition, paired rankings, and a larger station map beside compact health context. Replaced long panel explanations with short captions while keeping the provisional-data control, health scope, units, and definitions available.
- Added category and concentration map views using the actual selected station population. Category colors and relative-size concentration markers have explicit dynamic legends; no unverified annual-compliance classifications were added.
- Added a PRANA emblem/wordmark opening with CSS haze clearing and a breathing light strip. It is keyboard-skippable, reveals loading within a bounded time, avoids trapping failed/slow data, restores access/focus, and skips decorative delay for reduced motion.
- Ensured charts mount after their panels are connected and after the opening reveals the application, so the entrance animation is visible. Filtering, themes, and sidebar resizing retain the same chart canvases; feature teardown stops/destroys charts and removes their listeners/observers.
- Restored animated sidebar widths, deliberate mobile drawer motion, filter disclosure/chevron motion, panel/dialog entrances, and press/hover feedback. Resizing across the mobile breakpoint does not animate a phantom drawer over the dashboard.
- Replaced baseline-sensitive dropdown glyphs with consistent SVG chevrons and explicit centered flex wrappers. Preserved readable labels, focus indicators, and mobile touch heights. Category fills were checked against both panel surfaces; adjusted green and amber exceed 3:1 in light and dark themes.
- Removed phase, scoring, and participation commentary from product copy. The protected exact title and official logo remain; methodological data limitations remain accessible without filling the analytical canvas with paragraphs.
- Removed the unused `tab1_data.js` global wrapper and stopped its regeneration in the notebook. Analytical calculations and measurement JSON were not changed or rerun.
- Updated README development instructions for the active build, local fonts/libraries, static server, and browser verification. Browser artifacts are ignored.
- Validation: strict TypeScript checking/build, all five data/model tests, and the full 18-test browser suite pass. Browser evidence covers actual canvas painting during animation, chart identity across updates, smooth intermediate sidebar widths, centered dropdown/disclosure icons, both map views, no phase commentary, a bounded/skippable opening, delayed/error loading, reduced motion, dialog/drawer keyboard focus, and six viewport widths in both themes. Reviewed fresh desktop light/dark, mobile, and PRANA opening screenshots. All 27 station catalog entries match the raw master; measurement JSON copies, manifest/lockfile, Markdown links, and `git diff --check` were verified. Automated basemap requests remain intentionally blocked to test graceful failure.
- Remaining limitations: normalizing logger units, validating regulatory classes and daily completeness, and auditing existing health missing-value assumptions remain analytical work. Tabs 2–6 remain explicitly unavailable. No commit, push, or publication performed.

## 11 November 2026 — Searchable filters, sidebar chevron, and tab URLs

- Added a shared searchable-select component for region, site type, and station. It searches existing option labels/code/location text without changing results until a valid option is selected, supports arrow keys/Enter/Escape/Tab, preserves committed values on cancellation, and displays field-specific no-match messages.
- Kept dependent option reconciliation and reset synchronized with the analytical state. Popup lists render outside the collapsing filter container, fit available viewport space, close when navigating/collapsing filters, and release their observers/listeners/DOM at teardown.
- Replaced sidebar/menu hamburger icons with chevrons. The toggle stays to the right of the PRANA emblem in both desktop states; the collapsed rail is 104px so the two controls remain on one row. Mobile drawer accessibility and animations remain supported.
- Introduced `dashboard/routes.json` as the shared route registry and real navigation links backed by browser history. The canonical overview path is `/dashboard`; the other tabs use `/dashboard/kepatuhan-regulasi`, `/dashboard/pola-waktu`, `/dashboard/faktor-pemicu`, `/dashboard/dampak-kesehatan`, and `/dashboard/rekomendasi-kebijakan`.
- Updated the development server to serve known routes directly, redirect root/trailing-slash/index entries to canonical paths, reject unknown paths with 404, and support a strict test port. Updated the build to generate physical HTML entries for deep links and the document asset base to `/dashboard/`.
- Browser Back/Forward restores the active section and preserves committed filters within the current session. Direct opening/refresh selects the requested section; reload-level filter persistence is not added.
- Updated `design.md`, `AGENTS.md`, and README for search behavior, chevron geometry, route ownership, and static-hosting requirements. Measurements, exports, and analytical calculations were not changed.
- Validation: strict TypeScript/build, seven data/model/route checks, and all 28 browser checks pass. Browser verification covers every direct URL/refresh, canonical entry, history, search selection/cancellation/no matches, dependent choices, mobile popup fit, and chevron placement. Reviewed fresh mobile search and collapsed-sidebar screenshots; `git diff --check` passes. No commit or push performed; the existing stash remains untouched.

## 11 November 2026 — Development refresh reliability

- Investigated the report that all UI changes were missing. The running server on port 5500 serves HTML, JavaScript, CSS, and deep links matching the updated local files; the browser URL/cache state remains unconfirmed.
- Made the development command build before serving and disabled local HTTP caching, including modification-date conditional responses, to prevent stale bundles during development. Updated README and the design contract with the exact printed-port workflow.
- Validation: strict TypeScript/build passes; temporary-server checks confirm HTML, JS, CSS, and a deep link return HTTP 200 with `no-store` even with future modification-date validators. The focused browser check for loading, searchable filtering, dependent selections, and reset passes; `git diff --check` passes. Existing development processes need restarting to load the updated server handler.


## 11 November 2026 — Reference content in the current design

- Restored the six research questions and Tabs 2–6 analytical titles, subtitles, module headings, and planned-visualization descriptions from `c593c4d`, through the existing feature modules and shared unavailable-state component.
- Added a styled research-question container and a titled indicator container using the current surface, border, type, and responsive system. Preserved the title, logos, themes, motion, searchable filters, sidebar chevrons, routes, rankings, map, and station-table alternatives.
- Restored the four headline indicator subjects: PM2.5 mean, days above the 24-hour reference, most critical station, and hospital burden. Read national exceedance and reference values from the existing validated export; expose the selected-station denominator explicitly and retain global hospital scope.
- Restored composition/geospatial and methodology titles. Kept source limitations and documented exceptions to literal copying: unverified ticker claims, static QC/violation totals, non-anonymous hospital names, annual-compliance labels for period means, and unimplemented completeness/model guarantees.
- Updated `design.md` with the content mapping, component ownership, and deliberate corrections; updated `AGENTS.md` to preserve those decisions. Raw files, measurement exports, and analytical computations are unchanged.
- Validation: strict TypeScript/build, all eight data/model/route tests, and all 29 browser checks pass. Reviewed updated desktop light and mobile dark screenshots; six viewport sizes pass in both themes. Source comparison confirms research questions/module descriptions match the reference; `git diff --check` passes. Existing data limitations remain documented.


## 11 November 2026 — Correct reference sections, map modes, and sidebar

- Corrected the prior content restoration after user review: removed the added concentration rankings and standalone `Admisi pernapasan` panel. The reference indicator/distribution section now leads directly to the full-width map in the existing design.
- Restored `Acuan Harian (ISPU 24-Jam)` and `Acuan Tahunan (PP 22/2021)`. Daily markers use modal-category colors and exported exceedance-frequency radii; annual markers use the export’s annual-reference comparison and the reference commit’s fixed concentration radius scale. Restored descriptive legends, tooltips, and mode-specific popup details; counts come from selected existing rows rather than hardcoded reference numbers.
- Removed `Prana Emblem.png` from the sidebar. Expanded header shows the textual wordmark and chevron; collapsed header shows only a centered chevron. Opening assets and official competition logo remain.
- Updated AGENTS.md and design.md to remove conflicting active directions and require an explicit current-work request before any commit/push. The preceding push was not authorized for that editing task; this correction remains local and does not rewrite remote history.
- Raw datasets, measurement exports, and analytical pipelines are unchanged. Annual-reference comparison remains visibly qualified as a period-mean comparison rather than a validated calendar-year compliance audit.
- Validation: strict TypeScript/build, all 10 unit/data/route checks, and the full 29-test browser suite pass. Additional popup-content and collapsed-desktop-to-mobile-wordmark checks pass; the popup check waits for Leaflet’s outgoing fade. Reviewed fresh desktop/mobile, annual-map, and chevron-only sidebar screenshots. `git diff --check` passes. No commit or push performed.


## 11 November 2026 — Larger sidebar icons and wordmark

- Increased collapsed navigation icons and chevron from 18px to 28px, with a 44px minimum sidebar-toggle target.
- Enlarged the expanded PRANA wordmark from 110px (90px on constrained widths) to 168px (146px on constrained desktop widths), preserving proportions and centered header alignment. Mobile drawers use the larger wordmark.
- Updated the sizing contract in design.md. Changes remain local; no commit or push.
- Validation: strict TypeScript/build and nine focused browser checks pass, covering six viewport widths in both themes, sidebar transitions, desktop/mobile wordmark visibility, alignment, and reduced-motion reflow. Reviewed updated expanded/collapsed sidebar screenshots; `git diff --check` passes.


## 11 November 2026 — Map layout and compact controls

- Grouped map explanation text into two flex columns on desktop, stacking on phones. Enlarged the map to 480–760px on desktop and 440px on phones.
- Reduced collapsed sidebar icons/chevron to 22px and scaled the collapsed competition logo down to balance the rail; retained the expanded PRANA wordmark and sidebar hit areas.
- Replaced the labeled theme toggle with sun/moon/desktop icon choices for light/dark/system preferences, persistence, live OS-theme updates in system mode, accessible selection states, and listener cleanup. Made the methodology control compact while retaining its text and dialog.
- Updated design.md with sizing and behavior contracts. No commit or push performed.
- Validation: strict TypeScript/build, all 10 unit/data/route checks, and all 31 browser checks pass. Browser checks cover OS-theme changes, explicit overrides and reload persistence, legend geometry, map sizing, six widths in both themes, navigation, and filter behavior. Reviewed updated desktop/mobile screenshots; `git diff --check` passes.


## 11 November 2026 — Correct collapsed rail proportions

- Corrected the incomplete icon-sizing adjustment: reduced the whole collapsed rail from 104px to 72px and replaced wide active rows with centered 44px square targets.
- Set collapsed navigation/chevron SVGs to 20px and centered the smaller 44px Gelar Rasa container (28px image) on the same axis. Expanded branding and mobile navigation remain intact.
- Updated the design sizing contract and existing sidebar-width checks. No commit or push.
- Validation: strict TypeScript/build and all eight focused browser checks pass, including six widths in both themes, sidebar transitions, centered controls, and desktop/mobile visibility. Reviewed the fresh collapsed-sidebar screenshot; `git diff --check` passes.


## 11 November 2026 — Map wheel zoom

- Enabled Leaflet scroll-wheel zoom while the pointer is over the map; existing zoom buttons and touch interactions remain available.
- Updated design.md. Strict TypeScript/build passes; browser verification confirms wheel zoom in/out and unchanged page scroll while hovering the map. `git diff --check` passes. No commit or push.


## 11 November 2026 — Multi-dimensional daily cube and interactive filters

- Updated `notebooks/etl_tab1_ikhtisar.ipynb` to process all 6 criteria pollutants (PM2.5, PM10, SO2, CO, O3, NO2) from 27 AQMS stations, normalize logger ppm values (x1,000 for BJB-01, MDN-01, PSW-01), apply the >=75% (18h) daily completeness rule, and include both VALID and VALID+SUSPECT records.
- Exported a compact daily multi-dimensional cube (1,018 dates x 27 stations x 6 pollutants x 2 QC modes, 1.64 MB < 2 MB booklet limit) alongside default period pre-aggregations in `dataset/dashboard/tab1_ikhtisar.json` and `dashboard/tab1_ikhtisar.json`.
- Extended TypeScript types in `dashboard/src/data/types.ts` and runtime validation in `dashboard/src/data/validate.ts` to parse the daily cube while preserving 100% backward compatibility.
- Enabled all interactive filters in `dashboard/src/components/filters.ts`: pollutant choices (PM2.5, PM10, SO2, CO, O3, NO2), period presets (All, 2024, 2025, 2026, Custom), interactive start and end date pickers (`<input type="date">`), and SUSPECT toggle.
- Added custom date range inputs in `dashboard/styles.css` with responsive layout and auto-synchronization between preset dropdown and date pickers.
- Transformed the filter summary into individual visual badges (`.filter-badge`), explicitly including the site type dimension (`Semua tipe lokasi` or active site type) and highlighting actively customized filter dimensions (`.is-active`).
- Connected client-side dynamic recalculation in `dashboard/src/features/overview/model.ts` and `dashboard/src/features/overview/view.ts` for metrics, modal ISPU categories, exceedance rates, and hospital burden in sub-millisecond response times.
- Added unit test suite `tests/dynamic-filters.test.ts` verifying dynamic pollutant switching, period slicing, and SUSPECT coverage.
- Validation: strict TypeScript `tsc --noEmit` passed; esbuild bundle rebuilt cleanly (351.8 KB); all 14 unit and model tests in `tests/*.test.ts` passed. No commit or push performed.

## 11 November 2026 — Station popup card refinement

- Reworked the map popup into an identity header, prominent period concentration, text-labeled category/reference status, semantic detail rows, and a visible annual-compliance qualification. Added theme-aware surfaces, compact spacing, viewport-constrained width, scrollable content, and a 44px close target.
- Updated dashboard/src/components/station-map.ts, dashboard/styles.css, generated dashboard/app.js, and design.md. Preserve analytical values and existing mode-specific details; no dataset or pipeline changes in this task.
- Kept open popups in view and removed automatic bounds refitting on map resize after browser checks exposed clipped popup headers. Station/filter updates still fit bounds.
- Validation: strict TypeScript, esbuild, all 16 model/data/route tests, and git diff --check pass. Node/npm were unavailable in PATH, so checks/build ran using installed Bun 1.4.4. Focused Edge browser checks pass for daily/annual content, horizontal fit, and actual close-button clicks at 375px and 1440px in both themes; reviewed mobile screenshots.
- Limitations: the existing broader map browser test stops before popup assertions because its expected annual counts (3/24) differ from the current local export results (4/23); left this unrelated analytical expectation unchanged. Basemap requests were blocked in focused browser checks. No commit or push.

## 11 November 2026 — Compact station popup without scrolling

- Simplified the previous popup at user request: reduced card width from 300px to 240px, padding from 20px to 14px, and concentration numerals from 34px to 26px. Removed Leaflet maxHeight and internal scrolling.
- Kept station identity/location, period PM2.5 concentration, dominant daily category with daily exceedance share, or annual-reference status with deviation and a short period-comparison qualification. Removed characteristic rows and repeated regulatory explanations; broader context remains in the map legend and methodology.
- Updated dashboard/src/components/station-map.ts, dashboard/styles.css, generated dashboard/app.js, and the active popup contract in design.md. Analytical data/calculations were unchanged.
- Validation: strict TypeScript, esbuild, all 16 data/model/route tests, and git diff --check pass using installed Bun (Node/npm unavailable in PATH). Focused Edge checks pass at 320px, 375px, and 1440px in both themes for both map modes, viewport fit, absence of internal scrolling/clipping, and actual close-button interaction. Reviewed the compact mobile screenshot. Basemap requests were blocked during browser checks; the broader browser suite was not rerun (its existing export-count mismatch is recorded above). No commit or push.

## 11 November 2026 — Explicit overview coverage

- Added `Cakupan 27 stasiun pemantau · Dataset sintetis` below the Ikhtisar Nasional heading; other tabs do not show this line. Renamed the full-selection mean KPI to `Rata-rata [polutan] Seluruh Stasiun`, retaining `Pilihan` for filtered station subsets. These approved wording changes clarify the dataset coverage without changing the tab name or calculations.
- Updated dashboard/src/components/shell.ts, dashboard/src/features/overview/view.ts, the coverage contract in design.md, and rebuilt dashboard/app.js. No measurement, pipeline, map, or unrelated UI changes in this task.
- Validation: strict TypeScript/build pass with installed Bun using constrained Go compiler resources. Focused Edge checks at 375px and 1440px pass for the coverage line, full/subset KPI labels, and absence of page-wide horizontal overflow. `git diff --check` passes. The package test command cannot run under this Bun-only environment (`Cannot use test outside of the test runner`); running the same four test files with `bun test` passes all 16 tests. No Node/npm installation or script changes; no commit or push.

## 11 November 2026 — Remove overview coverage sentence

- Removed only the requested coverage sentence beneath the Ikhtisar Nasional heading and its unused visibility logic in dashboard/src/components/shell.ts; rebuilt dashboard/app.js. Kept the full/subset KPI wording and all other UI content unchanged.
- Updated the active design.md contract to record this reversal; prior change-log entries are preserved.
- Validation: strict TypeScript/build and focused git diff --check pass using installed Bun. Browser checks were not rerun for this text removal. No commit or push.

## 11 November 2026 — Restore overview fact ticker

- Rebuilt the former ticker as an overview-owned TypeScript component above the indicator section. Facts derive from the same filtered station rows: highest/lowest period concentration and dominant-category counts. Single-station selections omit the redundant lowest comparison; no-match selections show an explicit empty message.
- Added a continuous approximately 40px/s strip with Jeda/Lanjut, hover/focus pause, theme tokens, and an assistive-technology-hidden visual duplicate. Live reduced-motion preferences switch to a fully readable static list. Teardown removes observers/listeners and the ticker DOM.
- Did not restore unsupported static claims from c593c4d about fire area, health effects, population coverage, or compliance totals. Facts inherit the provisional analytical limitations of current overview calculations; data and pipelines were not changed.
- Affected: dashboard/src/features/overview/ticker.ts and view.ts, dashboard/styles.css, generated dashboard/app.js, tests/browser/ticker.spec.ts, design.md, and CASE_STUDY_CONTEXT.md.
- Validation: strict TypeScript/build and all 16 existing model/data/route tests pass using installed Bun. All three focused Edge browser checks pass their assertions for actual animation, explicit pause, selected-station content, removal/remount across routes, live reduced motion, and fit at 320/1440px in both themes. Basemap requests were blocked. No commit or push.
- Verification limit: the Bun-driven Playwright runner hung while shutting down its local server after all three checks reported success and was interrupted; a clean suite exit was not obtained. A separate browser process captured desktop moving and mobile reduced-motion ticker screenshots successfully; both were visually reviewed.

## 11 November 2026 — Attach ticker to the header

- Moved the existing overview ticker into a public shell mount point immediately below the title/actions row. Both rows share one sticky header, matching the user-supplied placement reference. Replaced the floating rounded card with an edge-to-edge strip and contrasting arrow-ended Fakta label.
- Preserved fact content, filter updates, pause controls, reduced-motion behavior, and overview-only ownership/teardown. No analytical or data changes.
- Updated shell.ts, main.ts, overview/view.ts, dashboard/styles.css, generated dashboard/app.js, design.md, and focused ticker browser checks.
- Validation: strict TypeScript/build pass. All three focused Edge checks report passing assertions, including flush header placement, sticky behavior, pause/filter/navigation behavior, and live reduced motion with 320/1440px layouts in both themes. Reviewed separate dark desktop/mobile header screenshots. The Bun-driven test runner again hung during local-server shutdown after tests passed and was interrupted; no clean suite exit obtained. Basemap requests were blocked. No commit or push.

## 11 November 2026 — General health facts across all tabs and slimmer ticker

- Replaced the overview/filter-dependent ticker with one shared shell-owned instance that persists with identical content across every tab, including direct links and unavailable measurement data. Removed the obsolete feature-owned ticker and its update/mount interface.
- Added four sourced educational facts in dashboard/src/data/air-pollution-facts.ts, based on the WHO ambient-air-pollution fact sheet (24 October 2024, checked 11 November 2026). The worldwide 4.2 million premature-death estimate explicitly states outdoor air pollution and 2019; other facts cover cardiovascular/cancer risks, children, and urban/rural scope. A persistent WHO link provides attribution. This user-requested editorial context is separate from synthetic analytical outputs; no datasets or calculations changed.
- Reduced normal strip height from approximately 45px to 29px with 11px text and 28px controls. Preserved animation/pause and live reduced motion; the latter exposes a focusable manual horizontal scroller, avoiding a tall static header.
- Affected: shared fact-ticker.ts, shell.ts, main.ts, overview/view.ts, dashboard/styles.css, generated dashboard/app.js, ticker browser checks, design.md, and CASE_STUDY_CONTEXT.md. No unrelated fixes, commit, or push.
- Validation: strict TypeScript/build, all 16 existing model/data/route tests, four focused Edge browser tests, and git diff --check pass. Browser checks cover all six tab URLs without measurement data, ticker identity/content/pause across navigation and committed filters, 29px geometry, animation, source link, and keyboard scrolling/live reduced motion at 320/1440px in both themes. The runner exits cleanly when a temporary ignored configuration uses a separately managed local server; tracked server configuration was unchanged. Reviewed dark desktop/mobile header screenshots. Basemap requests were blocked; the full unrelated browser suite was not rerun.

## 11 November 2026 — Remove ticker source link and hover pause

- Removed the visible WHO link from the ticker and its unused source-link styling; retained source provenance in the fact data/design documentation. Hover now leaves the animation running. Explicit Jeda/Lanjut, keyboard-focus pause, and reduced motion remain unchanged.
- Updated fact-ticker.ts, dashboard/styles.css, generated dashboard/app.js, focused ticker browser checks, design.md, and the corresponding CASE_STUDY_CONTEXT.md description. Fact text and analytical data are unchanged.
- Validation: strict TypeScript/build, all four focused Edge browser checks, and focused git diff --check pass. Checks confirm no ticker links, actual motion while hovered, explicit pause, unchanged content across filters/tabs, direct routes without measurements, and responsive/reduced-motion behavior. No commit or push.

## 11 November 2026 — Resume ticker immediately from its button

- Restricted automatic focus pause to the ticker text viewport instead of the entire strip, so pressing Lanjut resumes movement immediately while the button retains focus. Explicit pause and text-viewport focus behavior remain available.
- Updated dashboard/styles.css, rebuilt dashboard/app.js, clarified design.md, and added a browser regression assertion for actual movement after resuming without blurring the button.
- Validation: strict TypeScript/build and all four focused Edge browser checks pass, including resume while focused, hover playback, explicit pause, filters/navigation, direct routes, and reduced-motion/responsive checks. No analytical changes, commit, or push.
