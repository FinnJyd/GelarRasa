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
- Identify the competition dataset as synthetic and preserve anonymous hospital identities. Do not imply live observations, nationwide population representation, or causal health effects without supporting evidence.
- Validate logger units, completeness rules, averaging periods, classification definitions, and source relationships before presenting derived metrics. Do not assume a universal conversion for columns named `ppm`.
- Ensure displayed filters describe the effective data scope. Disable or clearly scope unsupported controls; changing a selection summary alone does not implement filtering.
- Keep methodology text synchronized with actual pipeline behavior and generated outputs. Do not hardcode unverified quality counts, hospital names, or explanatory statistics.

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

- Edit `dashboard/src/` for application logic and `dashboard/styles.css` for design tokens and layout. `dashboard/app.js` and `dashboard/app.css` are generated outputs; rebuild them instead of editing them directly.
- Use Node.js 24+ and the lockfile. Run `npm run build`, `npm test`, and the browser checks relevant to the change. Keep generated bundles, local fonts/licenses, and source changes synchronized so the existing static HTTP workflow continues to work.
- Keep measurement JSON generated by the analysis pipeline. Do not restore `window.TAB1_DATA`, legacy fallback records, or CDN runtime dependencies removed by the refactor.
- Regenerate station dimensions with `npm run data:catalog` when the raw station master changes. Preserve source `region_group` values; do not assume every group is an island or normalize it by guessing.
- Maintain explicit unavailable states for analyses without validated exports. Never fill those tabs with decorative or fabricated analytical results.
- Preserve the distinction between globally scoped health indicators and station-filtered observations. Keep unsupported date, pollutant, and QC controls disabled until the pipeline and UI support their real effects.


## Overview visualization and motion

- Bundle Chart.js locally and reuse chart instances for filter/theme updates. Destroy charts and owned observers/listeners on feature teardown; do not replace animated graphs with CSS-only imitations.
- Keep the PRANA haze/logo opening skippable, brief, and tied to actual loading. Ensure the first chart entrance is visible after the opening and reduced-motion users receive an immediate final state.
- Respect reduced-motion changes in JavaScript as well as CSS. Keep sidebar, drawer, and disclosure transitions smooth for normal motion.
- Preserve concise on-screen indications of synthetic/provisional data and fixed health scope; shorten prose without hiding material analytical limitations.


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
