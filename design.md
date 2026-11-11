# PRANA design system

Updated 11 November 2026 (WIB). This is the active design contract for the dashboard. Implementation history and previous decisions remain in [CHANGELOG.md](CHANGELOG.md). Read it with [AGENTS.md](AGENTS.md).

## 1. Product direction

PRANA is a visual workspace for understanding monitored air quality and its health context. Lead with charts, maps, and readable indicators. Let a reader recognize composition, extremes, and location before reading an explanation.

The interface should feel clear, confident, and alive: considered typography, generous plot area, purposeful animation, and consistent controls. Keep the clean warm-light and ocean-dark identity. A clean design must not become a page of explanatory paragraphs or a static collection of numbers.

The current implementation scope is **Ikhtisar Nasional** and the shared shell it needs. Other analytical tabs retain honest unavailable states until their calculations exist. Do not manufacture results to make the dashboard look complete.

### What matters most

1. Data fidelity: every visible result comes from supplied data or a reproducible calculation of its existing export.
2. Visual understanding: use the chart type that communicates the question directly.
3. Useful interaction: selections update the same population everywhere; tooltips and map controls reveal real detail.
4. Finish: readable typography, aligned icons, smooth state changes, responsive layout, and an intentional opening.
5. Explanation on demand: keep essential qualifications visible and detailed methodology accessible without occupying the primary plotting area.

These priorities reflect the local handbook's emphasis on relevant information, clarity, consistency, navigation, and usable interaction. They do not justify unsupported claims, invented data, or a promise of a particular judging result.

## 2. Protected identity and product copy

Keep this exact string as the visible application heading and HTML document title:

```text
DA2026_Dashboard_NasiBakarCumiHitamPakKris_AlfinJayadi
```

It is a protected user requirement based on the submission naming convention. Keep PRANA as the product identity and retain the supplied official logo with its original proportions. The full title may wrap naturally; do not replace it with a short brand name or hide it behind ellipsis.

Do not put phase names, scoring commentary, submission instructions, `Preliminary Round`, `Executive Cockpit`, or explanations about participating in a competition into the product interface. The exact title and official logo are the required exceptions to this restrained product presentation. Internal source documentation may identify the originating documents.

Use Bahasa Indonesia for controls and analytical labels. Prefer short, concrete headings: `Komposisi kualitas udara`, `Konsentrasi tertinggi`, `Sebaran stasiun pemantau`, and `Admisi pernapasan`. Avoid turning every heading into a long research question.

## 3. Source material and implementation ownership

Reviewed references:

| Source | Role |
| --- | --- |
| [Local handbook](HANDBOOK%20PRELIMINARY%20ROUND%20DA%20GELAR%20RASA%202026.pdf) | Naming, logo, supplied-data restriction, information clarity, visual consistency, and interaction criteria. |
| [Local case study](Booklet%20Case%20Study%20DA%20Gelar%20Rasa%202026.pdf) | Synthetic observations, anonymous hospitals, analytical questions, units, and schema descriptions. |
| `dataset/raw/master/` and `dataset/raw/metadata/` | Authoritative station dimensions, observation metadata, and instrument/export units. |
| `dataset/raw/aqms/` and `dataset/raw/health/` | Measurement and outcome records for analytical reasoning. |
| [Tab 1 pipeline](notebooks/etl_tab1_ikhtisar.ipynb) | Current calculations and known analytical assumptions. |
| [Display export](dashboard/tab1_ikhtisar.json) | Existing per-station summaries and fixed-scope health indicators used by this UI. |

`dashboard/src/` contains strict TypeScript. `components/` owns shell, filters, opening, methodology, and map. `features/overview/` owns overview selection and presentation. `shared/` owns chart components and lifecycle, palette, panels, icons, formatting, and the station table. `data/` owns interfaces, runtime validation, and loading.

Build with `bun run build` or `npm run build`. The generated `dashboard/app.js` and `app.css` are served by `dashboard/index.html`; do not edit them as source. Keep local fonts and licenses synchronized. Chart.js and Leaflet are bundled locally. No chart CDN or legacy global-data wrapper is needed.

The development command builds the current source before serving it. Local responses use `Cache-Control: no-store` and ignore modification-date cache validators so a refresh retrieves current files. Open the exact URL printed by the current process; an occupied preferred port may cause the server to choose another port. This is development behavior, not a production cache policy.

The current worktree entry must use these source modules. Do not leave a polished component disconnected from a legacy HTML entry. Preserve unrelated pulled changes and the user's stash; do not apply or discard a stash automatically.

## 4. Information hierarchy and text budget

Desktop reading order:

1. Exact application title and compact global actions.
2. Active tab name, one short orientation sentence, and a synthetic-data badge.
3. Collapsed filters with a readable summary of effective selections.
4. Four station indicators beside category composition.
5. Animated high/low concentration rankings.
6. A larger interactive station map beside a compact health context panel.
7. Expandable station data and unobtrusive source information.

Visuals should occupy most analytical panel area. Aim for roughly 70% or more plot/indicator area within the analytical grid, excluding the application shell and expanded filter controls. This is a design target, not a claim of an automatically measured accessibility or judging score.

| Copy location | Budget and intent |
| --- | --- |
| Page orientation | One short sentence. |
| Panel heading | Usually 3–6 words. |
| Panel subtitle | One line identifying metric, unit, or scope. |
| KPI context | One short line; identifiers may wrap. |
| Composition | Doughnut, total, category legend with count and percentage; one brief definition. |
| Rankings | Chart labels, values, axes, and a short scale/count caption. |
| Health | Large ratio, two denominator facts, fixed-scope label, brief interpretation caveat. |
| Map | Visual control, concise encoding label, dynamic legend, compact provider/failure status. |
| Data quality | A visible short `Data sementara` control near the scope; detailed limitations in methodology. |
| Methodology | Detailed explanations are allowed here because the reader explicitly requests them. |

Do not hide a qualification needed to understand the result. The synthetic scope, provisional status, concentration units, and fixed health scope remain visible. Shorten prose by improving visual encodings, not by removing important limitations.

## 5. Chart selection and behavior

Use **Chart.js** for animated analytical charts. Use native semantic HTML for labels, compact facts, and accessible data alternatives. Do not replace real plots with paragraphs, static CSS imitations, or decorative sparklines made from invented time series.

### Composition: doughnut

A doughnut is the default for mutually exclusive category composition. The overview counts stations by the most frequent daily category already recorded in the export.

- Use a 74–78% cutout with the number of selected stations centered in the opening.
- Keep category order from lower to higher severity; omit zero-count categories without changing the established color mapping.
- Pair the visual with category names, counts, and short percentages. Tooltips repeat the category/count detail.
- Update the doughnut and total whenever the station population changes.
- Do not imply that this is a share of days, measurements, people, or population exposure.
- The modal category can differ from the category of a station's mean concentration; the short caption and methodology explain this distinction.
- When no observations match, show an empty state rather than inventing a segment or falling back to all stations.

### Comparison: horizontal bar charts

Use horizontal Chart.js bars for ranked stations. Put readable location and station identifiers on the category axis. Show actual values at the ends of bars and full details in tooltips.

- Highest and lowest groups share a zero baseline and the same maximum for the current selection.
- Sort deterministically and display at most ten stations per group.
- For small selections, avoid duplicating a station between the two groups. An exhausted second group may show an explicit short empty state.
- Keep one consistent teal comparison color. Relatively low concentration does not establish safety or regulatory compliance.
- Do not invent annual trends or hourly series from a single period-level mean.
- Use a sensible plot height for the row count; ten rows should remain legible rather than squeezed into a tiny card.

### Indicators and health context

Show values as large numerals with adjacent units. The station indicators are selected mean PM2.5, selected station count, highest station concentration, and average proportion of recorded rows marked VALID.

The health context uses the existing admissions-to-capacity ratio and the actual numerator/denominator facts. Use a compact visual arrangement of these values rather than a paragraph. Do not draw an occupancy gauge or pie that falsely implies the ratio measures beds occupied, attributable illness, or the probability of disease. Label the global hospital scope clearly because it does not follow station filters.

### Accessible alternatives

Each canvas has an accessible name describing its actual current data. Keep category counts visible, ranking values available in a screen-reader list, and an expandable station table containing the selected rows. Do not make pointer-only tooltips the only way to obtain a value.

## 6. Geographic visualization

Use the existing public Esri World Street Map raster endpoint with Leaflet, no key/token field, and the service's published attribution. Keep the basemap native in both themes. The basemap supplies geographic context only; no external Esri observations become analytical input.

Provide two concise views:

| View | Encoding |
| --- | --- |
| Kategori | Equal-sized markers colored by the exported modal category; dynamic counts in the legend. |
| Konsentrasi | A consistent marker color and relative size increasing with period mean PM2.5; an explicit size explanation. |

Do not call a multi-year mean annual compliance or introduce unverified regulatory classes when switching views. Preserve the selected station list across mode changes and filters. Resize handling fits the selected bounds. Popups show identifier, location, concentration, unit, and category.

If basemap tiles fail, retain station points and the table and show one concise failure message. Do not repeatedly announce each failed tile. Keep full provider attribution readable. Avoid turning a station map into a continuous exposure surface without a supported model.

Provider references: [Esri service metadata](https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer?f=pjson) and [lifecycle notice](https://www.esri.com/arcgis-blog/products/arcgis-living-atlas/announcements/sunsetting-legacy-basemaps). The notice lists the legacy street service for retirement in December 2029; review it before future long-term hosting changes.

## 7. Motion system

Motion helps establish hierarchy and makes interaction feel responsive. Do not remove all animation in pursuit of cleanliness. Avoid perpetual chart motion, bouncing figures, or animated decorations competing with data.

| Interaction | Normal-motion target |
| --- | --- |
| Desktop sidebar | Smooth 300–360ms width transition; labels fade/translate with the rail. Charts and map resize continuously without rebuilding their instances. |
| Mobile drawer | Approximately 300ms entrance/exit, with contained focus and an inert background. |
| Filter disclosure | Approximately 240–280ms content expansion when supported, plus a centered chevron rotation. |
| Chart entrance | Roughly 650–1000ms easing out; doughnut sweeps in and ranking bars grow from the baseline. |
| Filter update | A brief smooth Chart.js data transition using the existing instance. |
| Theme change | Update chart colors without replacing the canvas or map; keep legibility throughout. |
| Panel/dialog entrance | Small 6–12px translation and short fade; no large spatial jumps. |
| Button interaction | Restrained hover feedback and a 1px press response. |

Every JavaScript animation must also honor `prefers-reduced-motion`, including changes made while the page is open. CSS media queries alone do not disable Chart.js animations. Stop chart animation and render the final state immediately for reduced motion.

## 8. PRANA opening: haze clearing

Before the first overview load, show a short air-themed opening using the existing PRANA emblem and wordmark. Render drifting haze with lightweight CSS gradients and transforms. The atmosphere clears to reveal the dashboard; do not use new bitmap imagery or imply that a decorative animation is a measured air-quality reading.

- Place the emblem and wordmark in the center with one short line of product copy and a subtle breathing light strip.
- Offer `Lihat dashboard` as a keyboard-operable skip action from the start.
- A normal fast load may show the opening for roughly one second, followed by a short fade.
- Never delay access indefinitely for an animation or a network request. Start revealing by 2.2 seconds, then show the actual loading/error state if data remains unavailable.
- Mount the initial charts after the reveal so their entrance does not finish unseen behind the opening.
- Keep the background application inert while the opening covers it; release it on dismissal and restore focus when the skip action had focus.
- For reduced motion, skip the decorative delay and haze/transition effects.
- Clear all opening timers and listeners on removal, errors, or page teardown. Retries do not replay the opening.

The opening adds personality, but it must not conceal errors, loop forever, or prevent navigation.

## 9. Layout and responsive sizing

Use a 4px spacing base, 16–20px gaps between panels, 20–24px panel padding, and 14px panel corners. Keep roughly 28px desktop and 16px phone gutters. Avoid excessive nested containers.

At roomy desktop widths, put four metric cards in a 2×2 block beside the composition card. Keep the rankings side by side and give the map more width than the health panel. When width becomes constrained, stack analytical panels instead of shrinking their labels. On phones, keep two KPI columns when readable; use one below 375px if necessary. Composition can stack below 375px.

Use a 256px desktop sidebar, 224px at constrained desktop widths, and a 104px collapsed rail. Below 768px, use the accessible drawer so plots retain the available width. A change in sidebar width must not recreate charts or lose the selected state.

The full exact application title wraps within its flex area. On narrow screens, global actions may move to another row. Never use `overflow: hidden` on the page to disguise a layout bug. Tables may scroll inside a labeled region; the page itself must not scroll horizontally.

## 10. Control alignment and spacing

Text and icons must look centered together, not merely have similar margins.

- Use `display: inline-flex` or `flex` with `align-items: center` on actions, disclosure labels, segmented controls, and icon/text rows.
- Give standalone icon controls a square hit area and center both axes with `justify-content: center`.
- SVG icons use a consistent view box and explicit width/height, `display: block`, and `flex-shrink: 0`.
- Use one consistent SVG chevron instead of a font glyph whose baseline varies across platforms.
- Supported selection filters use editable combobox inputs with an explicitly centered chevron button. The disabled period selector retains a native select with a centered SVG. Reserve space so labels never overlap either arrow.
- Controls target at least 44px touch height, especially on mobile. Preserve visible keyboard focus and associated labels.
- Verify alignment geometrically in browser checks and visually in screenshots; applying a CSS property alone is not proof of a correct layout.

## 11. Type, palette, and density

Inter is the interface and chart font. Space Grotesk is used selectively for headings and prominent numbers. Use tabular numerals for values. Local variable fonts keep the rendering independent of a Google Fonts request.

| Role | Target |
| --- | --- |
| Application title | 16–21px, complete and selectable. |
| Section heading | 24–32px. |
| Panel heading | 15–16px. |
| KPI numeral | 28–38px; health ratio may reach 56px. |
| Axis label, legend, control, caption | 12–13px where space permits; never shrink a plot to decorative size. |
| Supporting product eyebrow | 10–11px, nonessential and restrained. |

Retain the warm mist/light canvas and oceanic dark palette. Use teal as the interactive/comparison accent, neutral borders for structure, and stable severity colors for category identity. Category colors are application mappings, not a claim of verified official color swatches. The shared palette is Baik `#059669`, Sedang `#0284c7`, Tidak Sehat `#bf7b0a`, Sangat Tidak Sehat `#ef4444`, and Berbahaya `#8875ad`; the solid fills each exceed 3:1 against both analytical panel surfaces. This check does not establish contrast against every geographic tile or replace text labels. Do not recolor every heading for decoration.

Normal text should meet 4.5:1 contrast; large text and essential control/graphical indicators should meet 3:1. Check rendered combinations in both themes. Do not rely on color alone: category labels, counts, and table rows convey the same information.

## 12. Effective filters and data scope

Filters remain collapsed by default at every width, with actual selected values visible. Opening/closing only changes visibility. Keep supported region, site-type, and station selections authoritative across metrics, composition, rankings, table, and map.

The source master contains mixed `region_group` labels such as Jakarta, Bogor, and provinces. Preserve those labels instead of inventing island groups. Constrain available station/type options and announce when an incompatible selection is cleared. Reset restores the supported baseline without changing disclosure visibility.

Date, alternative pollutant, and SUSPECT processing are not supported by the current display export; keep those controls disabled with a brief explanation until calculations exist. A moving chart or changing label is not evidence of working filtering. The health indicator remains visibly global and unchanged by station selection.

No matches must produce a genuine empty state. Do not silently show all stations, zero-valued averages, or fabricated observations. A failed export must leave navigation and retry behavior usable.

## 13. Analytical integrity and limitations

The raw files remain the source of truth. This visual revision uses existing period-level station and health exports and does not change their measurements or add new modeled outcomes.

Keep these interpretation limits accessible:

- The selected PM2.5 mean gives equal weight to station means. It is not population-weighted or a single-calendar-year exposure estimate.
- VALID coverage compares valid recorded rows with recorded rows, not with all expected hours.
- The displayed category is the exported modal daily category, not a classification of the period mean.
- Three raw AQMS files have `ppm` logger headers. The old pipeline's multiplication factor is not established by metadata and remains an assumption requiring validation.
- The old daily aggregation averages valid rows without enforcing the methodology's earlier minimum-18-hour claim; do not repeat that unsupported guarantee.
- The health ratio uses daily under-5 plus over-60 respiratory admissions and reported capacity. Missing-value handling and capacity coverage remain analytical audit items.
- Hospital identities stay anonymous, and associations do not establish causation.

The visible `Data sementara` control identifies provisional results. Methodology supplies exact definitions and limitations. Visual polish must not turn an unverified result into an authoritative compliance or health claim.

## 14. Lifecycle and accessibility

Reuse Chart.js instances during filtering, theme changes, and resizing. On feature teardown call `stop()`/`destroy()` and release owned observers and event listeners. Remove Leaflet layers/maps, disconnect resize observers, abort requests, and clear timers. Shared components must not leave global references to detached canvases or DOM nodes.

Use semantic landmarks, logical headings, a skip link, named controls, accessible chart summaries, a data table, and polite result announcements. Methodology and the mobile drawer contain keyboard focus, close on Escape, and restore focus. The opening is skippable and does not keep the page inert after it disappears.

## 15. Verification and change logging

Before calling the visual revision complete, verify:

- Exact title and supplied official logo remain present; phase/scoring/submission commentary is absent from the interface.
- The live HTML entry loads the TypeScript build and the overview uses real animated Chart.js doughnut/bar canvases.
- Chart values, center totals, accessible descriptions, map counts, and table rows reflect the same station selection.
- Initial chart animation is visible after the opening; updates and theme changes preserve the canvases; remounts clean up old charts/maps.
- The PRANA haze/logo opening appears, dismisses within its limit, can be skipped, releases focus/inert state, handles delayed/error data, and respects reduced motion.
- Sidebar collapse/expand is visibly smooth; no selected state is lost.
- Disclosure/select icons align with their labels and remain usable when filters are expanded.
- Both themes fit 320, 375, 768, 1024, 1440, and 1920px viewports; chart labels remain readable and there is no page-wide horizontal overflow.
- Keyboard navigation, dialog/drawer focus, empty/error recovery, map modes, and table access work.
- Type checking, build, focused model tests, and browser checks pass; inspect actual rendered screenshots rather than relying on test counts alone.
- Data/analytical limitations remain documented; tests of rendering are not a statistical audit or proof of zero leaks under every possible workload.

Record each completed change in [CHANGELOG.md](CHANGELOG.md), with a WIB date, affected components, validation evidence, and remaining limitations. Revise this contract when the behavior changes. Keep one commit per feature when committing; do not combine unrelated work or modify the user's stash.


## 16. Implementation record — 11 November 2026

The live overview now follows this contract: Chart.js doughnut and horizontal rankings, short panel copy, compact health figures, category/concentration map views, SVG-centered controls, an animated desktop sidebar, an accessible animated mobile drawer, and the PRANA haze/logo opening. Charts are created only after their panels are attached and the opening has released the application. Theme/filter updates reuse canvases; teardown destroys charts and map resources.

The current page entry uses the TypeScript build rather than the pulled legacy script. The required title and supplied logo remain. The user's Git stash is preserved. No measurement export or analytical computation was changed.

Implementation references: [Chart.js doughnuts](https://www.chartjs.org/docs/latest/charts/doughnut.html), [animations](https://www.chartjs.org/docs/latest/configuration/animations.html), and [update/destroy lifecycle](https://www.chartjs.org/docs/latest/developers/api.html). Validation results and remaining limitations are recorded in [CHANGELOG.md](CHANGELOG.md).

Verification completed: strict build, five model/data tests, and all 18 browser checks pass. Rendered desktop light/dark, mobile, and haze-opening screenshots were inspected. Control centering and intermediate sidebar widths were measured; actual canvas painting during chart entrance was verified. Basemap failure is intentionally simulated in browser tests. No claim of statistical validation, guaranteed judging outcome, or exhaustive heap/assistive-technology audit is made.


## 17. Searchable selection and URL navigation — 11 November 2026

### Searchable filters

`Wilayah`, `Tipe lokasi`, and `Stasiun` use one reusable searchable-select component. Typing filters the available option labels, including station codes and locations, without changing analytical results until an option is explicitly chosen. Match without case or accent sensitivity. Display a clear empty-result message and preserve the last committed selection when search is canceled, abandoned, or produces no matches.

Use combobox/listbox semantics with associated labels, expanded state, and active-descendant tracking. Arrow keys browse, Enter applies, Escape cancels, and Tab closes without committing an arbitrary search string. Keep focus in the input while browsing options. Display the option popup outside clipping filter containers, position it within the available viewport, and update or dismiss it as scrolling/resize changes the anchor. Close all menus when filters collapse or navigation changes. Remove popup nodes, listeners, and observers at teardown. Reference: [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).

### Sidebar control

Use a chevron rather than a hamburger for sidebar expansion and collapse. The expanded chevron points left; the collapsed chevron points right. Keep it on the same row, to the right of the PRANA emblem in both states. The collapsed rail is now 104px to provide space for both controls. Do not wrap the toggle beneath the emblem. The mobile drawer uses the same chevron language and preserves its existing focus containment and Escape behavior.

### Canonical routes

`dashboard/routes.json` is the shared route registry for browser navigation, generated static entries, and the development server.

| Section | Canonical path |
| --- | --- |
| Ikhtisar Nasional | `/dashboard` |
| Kepatuhan Regulasi | `/dashboard/kepatuhan-regulasi` |
| Pola Waktu | `/dashboard/pola-waktu` |
| Faktor Pemicu | `/dashboard/faktor-pemicu` |
| Dampak Kesehatan | `/dashboard/dampak-kesehatan` |
| Rekomendasi Kebijakan | `/dashboard/rekomendasi-kebijakan` |

Navigation uses real links and browser history. Normal clicks switch sections without reloading the application; modifier-clicks can open a new tab. Back/Forward selects the corresponding section and retains committed filters in the existing session. Refreshing or directly opening a URL restores that section; filter persistence across a full reload is not promised.

The development server serves known tab routes directly and canonicalizes `/`, trailing slashes, and known `index.html` entries. Unknown paths receive 404 rather than silently displaying an unrelated analytical section. The HTML base is `/dashboard/` so assets, fonts, and data work on every path. The build generates physical entry files for the five non-root tabs, allowing static directory servers to open deep links; static hosting should prefer clean-URL routing. The dev server prints `/dashboard` as its entry URL and supports a strict test port.

Verify text search, code/city search, keyboard selection/cancellation, no-match behavior, dependent selection reconciliation, popup viewport fit, chevron/branding geometry, every direct URL and refresh, browser history, and data loading after deep links. Preserve the title, animation system, synthetic/provisional scope, and all existing analytical behavior.
