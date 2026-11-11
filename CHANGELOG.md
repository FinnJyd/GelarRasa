# Change log

Record completed changes chronologically with dates in WIB. Each entry states the scope, reason, validation, and remaining limitations. Planned work belongs in the design audit or feature plan, not among completed changes.

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
