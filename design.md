# PRANA design system

Updated 13 November 2026 (WIB). This is the active design contract for the dashboard. Implementation history and previous decisions remain in [CHANGELOG.md](CHANGELOG.md). Read it with [AGENTS.md](AGENTS.md).

### Committee dataset policy — 11 November 2026

User-directed correction: accept the committee-provided dataset as the analytical source without repeatedly qualifying it as synthetic or requiring synthetic-data badges. This supersedes synthetic-label requirements elsewhere in this document; historical descriptions remain as records. The dataset's origin does not block analysis. Accurate source attribution, anonymous hospital identities, actual data-quality checks, and evidence-based interpretation still apply. This policy update does not change frontend code, raw data, calculations, or exports.

## 1. Product direction

PRANA is a visual workspace for understanding monitored air quality and its health context. Lead with charts, maps, and readable indicators. Let a reader recognize composition, extremes, and location before reading an explanation.

The interface should feel clear, confident, and alive: considered typography, generous plot area, purposeful animation, and consistent controls. Keep the clean warm-light and ocean-dark identity. A clean design must not become a page of explanatory paragraphs or a static collection of numbers.

The current implementation scope is **Ikhtisar Nasional**, **Kepatuhan Regulasi**, **Pola Waktu**, **Faktor Pemicu**, **Dampak Kesehatan**, and **Rekomendasi Kebijakan**, with their shared shell. No analytical tab retains an unavailable placeholder state anymore; each tab documents its own data scope and limitations instead. Do not manufacture results to make the dashboard look complete.

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

Use Bahasa Indonesia for controls and analytical labels. Match the analytical headings and research questions of commit `c593c4d`. Preserve the current type and container styling. Do not add independent analytical sections absent from that reference.

## 3. Source material and implementation ownership

Reviewed references:

| Source | Role |
| --- | --- |
| [Local handbook](HANDBOOK%20PRELIMINARY%20ROUND%20DA%20GELAR%20RASA%202026.pdf) | Naming, logo, supplied-data restriction, information clarity, visual consistency, and interaction criteria. |
| [Local case study](Booklet%20Case%20Study%20DA%20Gelar%20Rasa%202026.pdf) | Synthetic observations, anonymous hospitals, analytical questions, units, and schema descriptions. |
| `dataset/raw/master/` and `dataset/raw/metadata/` | Authoritative station dimensions, observation metadata, and instrument/export units. |
| `dataset/raw/aqms/` and `dataset/raw/health/` | Measurement and outcome records for analytical reasoning. |
| [Tab 1 pipeline](notebooks/etl_tab1_ikhtisar.ipynb) | Current calculations and known analytical assumptions. |
| [Display export](dashboard/tab1_ikhtisar.json) | Station summaries and daily health data used to calculate indicators for the selected stations and period. |

`dashboard/src/` contains strict TypeScript. `components/` owns shell, filters, opening, methodology, and map. `features/overview/` owns overview selection and presentation. `shared/` owns chart components and lifecycle, palette, panels, icons, formatting, and the station table. `data/` owns interfaces, runtime validation, and loading.

Use `bun run dev` or `npm run dev` for the Vite development server with automatic source updates. Source HTML is `dashboard/entry.html`; styles use Tailwind through its official Vite plugin, with the established tokens and component rules in `dashboard/styles.css`. Build with `bun run build` or `npm run build`: Vite generates `dist/` and synchronizes `dashboard/index.html`, deep-link entries, `app.js`, `app.css`, compiled assets, and dependency licenses for the static HTTP workflow. Never edit generated outputs as source. Keep local fonts/licenses synchronized. Chart.js, Leaflet, and Tailwind are bundled locally; no CDN or legacy global-data wrapper is needed.

The development command serves source through Vite without a preliminary production build. CSS hot updates preserve the mounted application; unaccepted TypeScript modules, source HTML, and exported dashboard JSON reload the page automatically. Route-registry changes restart Vite automatically. Open the exact URL printed by the current process; the preferred port is 5500, and Vite may select another when it is occupied. `/` redirects to `/dashboard`. Preview serves the production build for verification. These are development/preview behaviors, not a production cache policy.

The current worktree entry must use these source modules. Do not leave a polished component disconnected from a legacy HTML entry. Preserve unrelated pulled changes and the user's stash; do not apply or discard a stash automatically.

## 4. Information hierarchy and text budget

Desktop reading order:

1. Exact application title and compact global actions.
2. Active tab name, one short orientation sentence, and a synthetic-data badge.
3. Collapsed filters with a readable summary of effective selections.
4. A titled indicator container with the reference commit’s four headline metrics beside category composition.
5. A full-width map with daily and annual reference controls, encoding legends, and station popups.
6. Expandable station data and unobtrusive source information.

Do not add the coverage sentence below the Ikhtisar Nasional heading; the user removed it on 11 November 2026 after reviewing the implementation. Keep the tab title unchanged. The mean-concentration KPI uses `Rata-rata [polutan] Seluruh Stasiun` for all stations and `Rata-rata [polutan] Pilihan` for a subset.

Default filter/content boundary: all six tabs show the same enabled global filter disclosure and a full-width 1px horizontal divider in var(--border), with 20px spacing before analytical content. Keep it visible with filters collapsed or expanded and responsive in both themes. Hide the filter host only on the not-found page. Keep the disclosure collapsed on entry/navigation and preserve selections. Global filters are the primary analytical controls on Tabs 1–5. Tab 6 accepts and retains selections but explains that its recommendation analysis is unavailable; do not imply nonexistent results were filtered. Apply this through the shared shell rather than individual feature modules. Do not add a duplicate top-level scope/coverage sentence above Tab 1 or Tab 2 content; coverage in map popups, tables, chart summaries and relevant analytical panels remains available.

The added high/low ranking panels and standalone admissions panel are removed. Hospital content remains only in the reference’s hospital-burden KPI and methodology.

Visuals should occupy most analytical panel area. Aim for roughly 70% or more plot/indicator area within the analytical grid, excluding the application shell and expanded filter controls. This is a design target, not a claim of an automatically measured accessibility or judging score.

| Copy location | Budget and intent |
| --- | --- |
| Page orientation | One short sentence. |
| Panel heading | Usually 3–6 words. |
| Panel subtitle | One line identifying metric, unit, or scope. |
| KPI context | One short line; identifiers may wrap. |
| Composition | Doughnut, total, category legend with count and percentage; one brief definition. |
| Rankings | Chart labels, values, axes, and a short scale/count caption. |
| Health | Large ratio, admissions/capacity context, selected facility scope, brief interpretation caveat. |
| Map | Visual control, concise encoding label, dynamic legend, compact provider/failure status. |
| Data quality | A visible short `Data sementara` control near the scope; detailed limitations in methodology. |
| Methodology | Detailed explanations are allowed here because the reader explicitly requests them. |

Do not hide a qualification needed to understand the result. The synthetic scope, provisional status, concentration units, and selected health scope remain visible. Shorten prose by improving visual encodings, not by removing important limitations.

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

### Indicators

The four reference subjects are PM2.5 mean, percentage of days exceeding the daily reference, most critical station, and hospital burden. Display large figures, units, reference context, and selected-scope qualifiers in the existing four-card grid. Do not add separate rankings or an admissions panel. The hospital KPI follows the selected stations and period and explains that the ratio is not occupancy.

### Accessible alternatives

Each canvas has an accessible name describing its actual current data. Keep category counts visible and an expandable station table containing the selected rows. The table is an accessible alternative to geographic markers, not an additional headline analytical section. Do not make pointer-only tooltips the only way to obtain a value.

## 6. Geographic visualization

Use the existing public Esri World Street Map raster endpoint with Leaflet, no key/token field, and the service's published attribution. Keep the basemap native in both themes. The basemap supplies geographic context only; no external Esri observations become analytical input.

Enable mouse-wheel zoom while the pointer is over the map. Retain zoom buttons, touch gestures, and reduced-motion behavior.

Use the two reference controls exactly:

| View | Color | Marker radius |
| --- | --- | --- |
| Acuan Harian (ISPU 24-Jam) | Exported dominant daily ISPU category | 7–22px, increasing linearly with the exported percentage of days above the daily reference. |
| Acuan Tahunan (PP 22/2021) | Green at or below the export’s annual reference, red above it | 7–22px on the reference commit’s fixed 9–105 µg/m³ scale, clamped at each end. |

Daily legends describe dominant category and violation-frequency sizing. Annual legends use the reference heading and show `Memenuhi`/`Melebihi`, counts, and percentages calculated from the selected export rows. Do not copy its hardcoded counts: the present export has three means ≤15 µg/m³ and 24 above. Both modes retain the same station population, map instance, and geographic bounds. Annual mode compares period means with the annual reference; keep the visible qualification that this is not a calendar-year compliance audit.

Restore station name/code, location, characteristics, concentration, daily category/exceedance details or annual-reference deviation/status in safe DOM popups and tooltips. Mode changes update both marker encodings and legends. Do not retain the replacement `Kategori` and `Konsentrasi` mode controls.

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

At roomy desktop widths, put four metric cards in a 2×2 block beside the composition card. Place the map at full content width directly after the indicator/distribution section. When width becomes constrained, stack analytical panels instead of shrinking their labels. On phones, keep two KPI columns when readable; use one below 375px if necessary. Composition can stack below 375px.

Use a 256px desktop sidebar, 224px at constrained desktop widths, and a 72px collapsed rail. Below 768px, use the accessible drawer so plots retain the available width. A change in sidebar width must not recreate charts or lose the selected state.

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

Filters remain collapsed by default at every width, with actual selected values visible. Opening/closing only changes visibility. Keep supported region, site-type, and station selections authoritative across metrics, composition, table, and map.

The source master contains mixed `region_group` labels such as Jakarta, Bogor, and provinces. Preserve those labels instead of inventing island groups. Constrain available station/type options and announce when an incompatible selection is cleared. Reset restores the supported baseline without changing disclosure visibility.

Date, alternative pollutant, and SUSPECT processing are not supported by the current display export; keep those controls disabled with a brief explanation until calculations exist. A moving chart or changing label is not evidence of working filtering.

The health indicator is dynamic: region, site type, and station filters determine the associated facilities; the selected dates determine the admissions period. Calculate mean daily under-5 plus over-60 respiratory admissions for those facilities divided by their summed bed capacity, multiplied by 100. Show the selected facility scope and admissions/capacity context; all stations means all reference facilities. Pollutant choice and AQMS SUSPECT inclusion do not filter hospital admissions. This ratio is not bed occupancy and does not establish a causal health effect.

No matches must produce a genuine empty state. Do not silently show all stations, zero-valued averages, or fabricated observations. A failed export must leave navigation and retry behavior usable.

## 13. Analytical integrity and limitations

The raw files remain the source of truth. This visual revision uses existing period-level station and health exports and does not change their measurements or add new modeled outcomes.

Keep these interpretation limits accessible:

- The selected PM2.5 mean gives equal weight to station means. It is not population-weighted or a single-calendar-year exposure estimate.
- VALID coverage compares valid recorded rows with recorded rows, not with all expected hours.
- The displayed category is the exported modal daily category, not a classification of the period mean.
- Three raw AQMS files have `ppm` logger headers. The user-approved PM2.5/PM10 mass-scale assumption multiplies their particulate values by 1000; the metadata itself does not establish this interpretation. Gas ppmv now uses the separate user-approved molecular-mass conversion at assumed 25 C/1 atm; never use the particulate factor for gases.
- The overview daily aggregation requires 18 eligible QC rows per station-day, then averages available finite pollutant values. It does not establish 18 distinct hours or 18 finite values for each pollutant; do not describe it as equivalent to the stricter Tab 2/5 pipeline.
- The health ratio uses daily under-5 plus over-60 respiratory admissions and reported capacity. Missing-value handling and capacity coverage remain analytical audit items.
- Hospital identities stay anonymous, and associations do not establish causation.

The visible `Data sementara` control identifies provisional results. Methodology supplies exact definitions and limitations. Visual polish must not turn an unverified result into an authoritative compliance or health claim.

## 14. Lifecycle and accessibility

Reuse Chart.js instances during filtering, theme changes, and resizing. On feature teardown call `stop()`/`destroy()` and release owned observers and event listeners. Remove Leaflet layers/maps, disconnect resize observers, abort requests, and clear timers. Shared components must not leave global references to detached canvases or DOM nodes.

Use semantic landmarks, logical headings, a skip link, named controls, accessible chart summaries, a data table, and polite result announcements. Methodology and the mobile drawer contain keyboard focus, close on Escape, and restore focus. The opening is skippable and does not keep the page inert after it disappears.

## 15. Verification and change logging

Before calling the visual revision complete, verify:

- Exact title and supplied official logo remain present; phase/scoring/submission commentary is absent from the interface.
- The live HTML entry loads the TypeScript build and the overview uses a real animated Chart.js doughnut canvas.
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

Use a chevron rather than a hamburger for sidebar expansion and collapse. The expanded chevron points left; the collapsed chevron points right. Show `Prana Textual.png` to the left of the chevron when expanded. The sidebar contains no `Prana Emblem.png`. When collapsed, hide the entire wordmark container and show only the centered chevron in the header. Retain the 72px rail; mobile drawers show the wordmark and close chevron. The opening emblem is unaffected. The mobile drawer uses the same chevron language and preserves its existing focus containment and Escape behavior.

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


## 18. Reference-content restoration — 11 November 2026

The user selected commit `c593c4da5e815fbd0bc85283f1bf07860271051f` as the content reference while explicitly retaining the current design. Treat content and presentation as separate responsibilities: restore its research questions, analytical headings, indicator subjects, and planned-module descriptions through the existing strict TypeScript components. Do not restore its Tailwind page, monolithic script, old navigation, or hardcoded fallback records.

### Presentation contract

- Preserve warm-light/ocean-dark tokens, local fonts, spacing, responsive grids, animated Chart.js plots, map behavior, PRANA opening, and complete required title.
- Place the active tab heading and original research question in a surface container, with a short `Pertanyaan Riset` label. Longer original questions may wrap naturally.
- Put `Indikator Kunci & Distribusi Kualitas Udara Nasional` above the four-card/composition grid in a shared panel. Preserve the current card treatments and graphical composition. Original long analytical titles are an intentional exception to the earlier short-heading target.
- Keep searchable/collapsed filters, chevrons beside the logo, canonical paths, browser history, accessible controls, and resource cleanup.
- Corrected by Section 19: remove the additional rankings and health-detail panels. Retain the expandable station table only as a data alternative.

### Content mapping and deliberate corrections

| Reference content | Current implementation |
| --- | --- |
| Six research questions | Restored in the corresponding feature and shared research-question container. |
| National PM2.5 mean | Same subject and supplied value; labeled as a period mean instead of claiming a multi-year aggregate is annual compliance. |
| Days above the 24-hour reference | Full scope reads the existing export’s national 17.7% indicator. A selected subset shows the equal-weight mean of its exported station percentages, explicitly labeled with that different denominator. |
| Most critical station | Existing selected station with the highest mean; code, location, concentration, and exported exceedance percentage, without inventing an intervention priority. |
| Hospital burden index | Recalculate from the daily health export for facilities associated with the selected stations and selected dates. Display the corresponding admissions and bed-capacity denominator; do not hardcode the initial full-scope figures. This ratio is not occupancy. |
| Dominant ISPU and geospatial headings | Restored through existing composition/map panels. Keep modal-category and period-mean qualifications. |
| Tabs 2–6 | Original analytical titles, subtitles, module headings, and planned visualization descriptions. Clearly marked unavailable and described as plans, without fake charts or model outputs. |
| Methodology | Restore the integrity-oriented title, retaining the accurate current definitions, source trail, and limitations. Add the two exceedance-denominator definitions. |

The old ticker’s unverified health effects, fire area, national population comparisons, invented hospital names, static QC totals, 4,660 violation days, unsupported 18-hour completeness guarantee, and fitted-model claims are not copied as measured results. The supplied raw master contains anonymous hospital labels, and the existing notebook does not implement several old claims. Keep this distinction explicit in the documentation rather than presenting an exact transcription as validated analysis.

The user-requested ticker is a full-width `Fakta` strip directly attached below the topbar, inside the same sticky header. Use a contrasting arrow-ended label and no floating-card radius or content gutters, matching the supplied reference placement. The normal-motion strip is approximately 29px high (previously 45px), including a compact 28px pause target. Keep text at 11px and controls at least 24px high. This user-requested compact strip is an exception to the general 44px control target.

The ticker shows identical general air-pollution health facts on every tab and does not depend on filters, selected stations, measurement loading, or unavailable analytical modules. Its public-health reference is the [WHO ambient air pollution fact sheet](https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health), published 24 October 2024 and checked 11 November 2026. The user removed the visible WHO link; preserve the source reference in the fact data and this design document. The 4.2 million premature-death estimate explicitly identifies worldwide outdoor air pollution and the year 2019. Other messages describe serious cardiovascular/respiratory risks, child health, and urban/rural scope without inventing local impacts or individual risk percentages.

At the user's request, this editorial health context uses an external reference; it is separate from the synthetic competition dataset and is not an analytical input or a result derived from the supplied stations. All analytical indicators/charts/maps continue to use project data. This decision supersedes the earlier filter-dependent, overview-only ticker; unsupported legacy claims remain excluded.

Normal motion uses a continuous approximately 40px/s loop, continues on hover, pauses when the text viewport receives focus, and provides a persistent Jeda/Lanjut control. Focus on the toggle itself must not pause playback: pressing Lanjut resumes immediately while the button retains focus. Duplicate visual content is hidden from assistive technology. Reduced motion removes animation and the redundant pause control, exposing the full original list in a focusable horizontal scroller to keep the header slim; JavaScript responds to live preference changes. The shared shell owns one ticker instance across navigation and removes its resize observer and preference/button listeners on application teardown.

Regulatory numbers are read from metadata as reference values stored in the existing export, not an assertion that this presentation audited current law or demonstrated compliance. For the restored annual map mode, compare existing period means to the export’s annual reference with an explicit visible period-versus-year qualification; do not present that comparison as a completed annual compliance audit. No measurement files, raw records, exports, or notebook calculations are changed by this content restoration.


## 19. Reference fidelity and sidebar correction — 11 November 2026

This section supersedes conflicting historical descriptions in Sections 16–18. The previous content restoration retained sections and map modes the user did not ask to retain. The current user direction is to preserve the visual system while matching the reference commit’s analytical section inventory and interactions.

- Overview: indicator/distribution container followed directly by the full-width geospatial container. Remove the extra rankings and `Admisi pernapasan` section.
- Map: restore daily/annual reference buttons, category/frequency daily encoding, threshold/concentration annual encoding, descriptive legends, and mode-specific popup details. Keep existing data, truthful dynamic counts, accessible alternatives, Esri attribution, filter synchronization, and lifecycle cleanup.
- Sidebar: expanded header shows only the supplied textual PRANA logo and chevron; collapsed header shows only the chevron. No sidebar emblem. Preserve supplied official competition branding elsewhere and the PRANA opening assets.
- Git: no commit or push without an explicit request for the current work. An earlier request does not authorize future editing tasks to be pushed automatically.

Verify the actual absence of removed sections and sidebar emblem, both map modes’ labels/encodings/counts, filtering across modes, the restored expanded wordmark after a mobile breakpoint, and full-width/mobile map layout. Record results in CHANGELOG.md.


## 20. Sidebar sizing — 11 November 2026

Enlarge the expanded PRANA wordmark to 168 × 56px, with 146 × 49px at constrained desktop widths and 168 × 56px inside mobile drawers. Preserve the supplied image proportions with `object-fit: contain`. Keep a 56px minimum header row so the larger brand and toggle align.

Collapsed desktop navigation icons and the chevron are 20px, centered in 44px square targets inside a 72px rail. The expanded chevron is 24px with a minimum 44 × 44px hit area. Keep the collapsed header chevron centered and the wordmark hidden; do not restore the sidebar emblem. Verify that the larger wordmark fits beside the toggle at the 224px and 256px sidebar widths.


## 21. Map space and minimal global actions — 11 November 2026

Group the map category/reference explanation and marker-size explanation in separate flex children. On desktop they share one row with equal flexible width and a 24px gap; below 768px they stack with a 16px gap. Do not remove the explanatory text or alter its analytical meaning. The map height is `clamp(480px, 62vh, 760px)` on desktop and 440px on mobile.

Use 20px collapsed navigation/chevron icons and a centered 44px competition-logo container with a 28px-high logo in the rail. Preserve the expanded PRANA wordmark sizing and 44px sidebar-toggle target.

The theme selector is an icon-only group: sun for light, moon for dark, desktop for system. Name each button accessibly, expose the selected preference, store it, and react to OS color-scheme changes only in system mode. Remove its media listener when the shell is destroyed. Desktop controls are 32px; phone touch targets are 44px. The methodology control keeps its `Metodologi` text with a smaller info icon, restrained border, and compact spacing. The existing dialog content and focus behavior remain intact.


## 22. Compact collapsed rail — 11 November 2026

The collapsed sidebar must be compact as a whole: 72px rail, 44 × 44px navigation targets, 20px SVGs, and a centered 44px competition-logo box with a 28px-high image. Center navigation, chevron, and logo on the same vertical axis. Avoid full-rail active backgrounds: the active background stays square. Preserve the full expanded sidebar, large textual PRANA logo, and mobile drawer layout.


### Station popup card — 11 November 2026

Map popups use a compact 240px card with 14px padding and no internal scrolling. Show only station identity/location, period concentration, labeled category/reference status, and one mode-specific figure (daily exceedance share or annual-reference deviation). Annual mode retains a brief period-comparison qualification. Remove characteristic rows and repeated regulation/status explanations; keep detailed context in the surrounding map legend and methodology. Pair severity dots with text and retain a 44px close target. Analytical values and map encodings are unchanged. This compact design supersedes the earlier scrollable card at the user's request on 11 November 2026.

Open popups stay in view. Resizing invalidates Leaflet geometry without refitting station bounds; fit bounds when the selected station population or reference mode is rendered, preserving the popup position during layout changes.

### Dynamic hospital indicator — 11 November 2026

User-confirmed decision: the hospital KPI follows station-selection filters (region, site type, station) and the selected date range. This supersedes the earlier fixed/global health-scope decision. Pollutant and AQMS quality selections do not alter hospital records. Updated only the health-scope contract and descriptions; inspected overview/view.ts and overview/model.ts to confirm the current filter arguments and ratio calculation. This documentation update is not browser verification or validation of station-to-hospital mappings. No application, data, or pipeline changes were made.

### Tab 2 and Tab 3 analytical scope — 11 November 2026

User-approved planning change: Tab 2 owns regulatory comparisons, exceedance frequency, station rankings, and changes in compliance between comparable annual periods. Tab 3 owns historical concentration trends, monthly/seasonal patterns, peak hours, and extreme pollution episodes. A partial-year comparison is not a full calendar-year compliance evaluation. The station-by-month heatmap remains listed under Tab 2 pending a separate placement decision. CASE_STUDY_CONTEXT.md and its planned export descriptions reflect this boundary; these remain plans, not implemented features.

### Dampak Kesehatan — 12 November 2026

User-authorized implementation replaces the Tab 5 placeholder. This section supersedes the placeholder descriptions and overview-only filter scope above; the overview's protected section inventory is unchanged.

- Reuse one shared collapsed filter panel for overview and health. Entering a tab collapses the disclosure and closes option menus while retaining selections. Region, site type, and station select mapped facilities; dates select outcome dates; pollutant and QC select exposure only. Do not duplicate those controls inside the health tab.
- Add one shared searchable-select instance for the seven recorded health outcomes. Search does not commit a choice; Escape/blur preserve the prior indicator. Indicator selection starts with general respiratory admissions on each mount. General respiratory counts, under-5 counts, and over-60 counts remain separate; do not reconcile the 92 inconsistent total/subgroup records by inventing values.
- Reading order: indicator selector and effective facility/date/pollutant/QC scope; four cards (chosen outcome/day, under-5 respiratory admissions/day, over-60 respiratory admissions/day, general respiratory admissions/day per 100 beds); actual paired hospital-day coverage and logger-unit qualification; full-width exposure and outcome trend plots with independent vertical scales; two analytical panels for lag correlation and cases grouped by concentration; expandable definitions and accessible data tables. Bed burden always uses general respiratory admissions, independent of the selected outcome, and is explicitly not occupancy.
- Use the established warm-light/ocean-dark typography, color, panel, and spacing system. Four card columns fit roomy desktops, two columns fit constrained widths, and one fits below 375px. Two analytical columns become one below 900px. Keep long metric labels and context fully readable. Trend axes include years; lag axes show 0–7. Tables scroll only inside named, keyboard-focusable regions and daily rows are paginated in groups of 31.
- `scripts/export-health.py` owns the reproducible Tab 5 pipeline (`npm run data:health`), reading all raw AQMS and health files and checking unique hospital matches by province and normalized district. It exports separate outcome and exposure payloads plus source-file SHA-256 provenance to `dataset/dashboard/` and matching `dashboard/data/` files. Payloads use schema version 1 and a consecutive 1 January 2024–14 October 2026 calendar. Outcomes retain nulls and zero counts separately; observed health coverage is complete in this window. Source files remain unchanged.
- Exposure aggregation accepts finite nonnegative readings after the shared unit-normalization policy, excludes every occurrence of duplicated start timestamps, averages readings inside each recorded calendar-hour bin, then averages at least 18 distinct eligible hourly bins per day. Round exported concentrations to two decimals. Do not impute missing dates or translate clock offsets by assumption. The three approved loggers now have particulate exposure data; their gas ppmv uses the approved 25 C/1 atm conversion, and their health summaries stay selectable. The shared unit policy does not make the overview notebook's different aggregation rules identical to the health pipeline.
- Lag k pairs exposure on date t−k with outcome on t at each mapped facility, including available exposure before the selected outcome window. Pearson requires at least 30 pairs and nonzero variance in both series. Display the equal-weight mean of eligible facility correlations at each lag, on a fixed −1 to 1 axis; tooltips/tables expose eligible facilities and pairs. Missing dates are never compressed. The exposure–outcome chart splits the selected paired facility-days into five equal-count exposure quintiles and shows each contributing facility's mean cases inside the quintile as percent change against that facility's own mean over the same selection, equally averaged across facilities; tooltips keep the raw quintile mean, exposure range, facility count and pair count. It is descriptive, with facility-size/seasonal confounding acknowledged; it is not a fitted risk or causal model. No adjusted model or confidence interval is claimed. The episode chart plots mean percent change against each episode's own days −3:−1 baseline on a zero-inclusive range; raw cases per facility-episode move to tooltips.
- `features/health/` owns runtime export validation, a bounded single validated-data cache, selection/calculation, presentation, charts, and asynchronous mount cleanup. Fetch exports only when health is opened; cancel pending requests and sibling requests on failure; expose loading/error/retry and insufficient-data states. Reuse all four Chart.js instances for indicator/filter/theme changes. The shared chart lifecycle handles live reduced-motion changes, theme observation, stopping animation, and instance destruction. Chart mounts occur after the opening has released the application.
- Verification: strict build, 23 data/model tests, and 8 focused health browser checks passed. Reviewed light/dark desktop and phone captures and intermediate widths (320, 375, 768, 1024, 1440px); browser assertions checked horizontal fit, route refresh/history, retained shared selections/canvases, outcome search cancellation, actual counts, missing exposure, short-period insufficient data, pagination, retry, pending-request navigation, live reduced motion, and repeated chart teardown without detached canvas painting. The broader browser-suite outcome is recorded in CHANGELOG.md. Tests do not establish adjusted epidemiological effects or an exhaustive assistive-technology/heap audit.

### Health bottom-section removal — 12 November 2026

User-requested correction: remove the pictured `Data & Cara Membaca` disclosure and the health source footer. This supersedes the health reading-order/table requirements above. Remove its definitions/tables/pagination presentation and owned listeners/styles rather than hiding a retained implementation. Keep methodology available through the existing global `Metodologi` dialog and maintain chart text summaries without references to removed tables. Keep the analytical panels, effective scope, data, and motion behavior unchanged.


### Vite and Tailwind workflow — 12 November 2026

User-requested tooling migration: use Vite 8 and Tailwind 4 for live development and production compilation, and record this workflow in AGENTS.md. This supersedes the Python development-server and standalone esbuild instructions elsewhere in historical sections.

- `vite.config.ts` uses the official `@tailwindcss/vite` plugin, a validated `dashboard/routes.json` registry, canonical redirects, explicit unknown-route 404s, and source/build entry rewriting. Development starts with `bun run dev`/`npm run dev`; `bun run preview`/`npm run preview` serves `dist/`. `scripts/dev.py` and the direct esbuild dependency are removed.
- Source HTML is `dashboard/entry.html`. The build runs strict type checks, emits stable `/dashboard/app.js` and `/dashboard/app.css` URLs, fingerprints imported images/fonts under `/dashboard/assets/`, generates every canonical static route entry, copies dashboard JSON and branding assets, emits bundled dependency licenses, and synchronizes the repository's static export. Vite development serves the same canonical paths and `/dashboard/` HTML base without exposing raw datasets.
- `dashboard/styles.css` imports Leaflet CSS before the application rules and imports only Tailwind's theme/utilities layers. Preflight is intentionally omitted because the existing reset and vendor styles are part of the protected design. Shared layout, alignment, sizing, wrapping, and controls now use compiled Tailwind `@apply`; precise tokens, colors, font sizes, responsive breakpoints, transitions, and animation rules retain their prior values. Tailwind scanning is scoped to source HTML and TypeScript modules.
- Native Vite module invalidation reloads unaccepted application modules, allowing page teardown to clean up charts/maps and pending requests. CSS hot updates preserve current state and notify the shared chart lifecycle to refresh computed palette tokens; each chart removes its Vite event listener on teardown. The route plugin sends full reloads for source HTML and generated JSON so deep links and the bounded health-data cache do not display stale exports; registry edits restart the server automatically. Type checks remain a build/check command rather than a promise made by the dev transpiler.
- Both package-manager lockfiles are synchronized, and development tooling is documented in README.md and AGENTS.md. Browser checks now target Vite; `PRANA_TEST_MODE=production` selects the built preview. Live-update checks make temporary TypeScript, CSS, HTML, and whitespace-only JSON edits and restore their exact original contents, refusing to overwrite concurrent changes.
- Verification evidence and any limits are recorded in CHANGELOG.md. Before/after health screenshots at 320, 375, 768, 1024, and 1440px (including phone/desktop dark mode) were pixel-identical under the checked reduced-motion conditions. This comparison does not establish equality under every browser, animation frame, or input state.

### Pola Waktu dan Faktor Pemicu — 12 November 2026

User-requested implementation replaces the Tab 3 (Pola Waktu) and Tab 4 (Faktor Pemicu) placeholders with dedicated strict TypeScript feature modules, full Chart.js visualizations, and reproducible Python data pipelines.

- **Tab 3: Pola Waktu (`/dashboard/pola-waktu`)**:
  - `scripts/export-temporal.py` generates `tab3_temporal.json` in both `dataset/dashboard/` and `dashboard/data/`.
  - Four core analytical sections: (1) Profil Diurnal 24 Jam dengan rentang interkuartil P25–P75 dan mode overlay komparasi musim karhutla (Agu–Okt) vs bulan lainnya; (2) Heatmap matriks Hari × Jam (Senin–Minggu × 00–23 WIB) berbasis kanvas 2D dengan stasiun default `AQMS-KTG-01`; (3) Deret waktu PM2.5 harian stasiun hotspot karhutla (`KTG-01`, `KTG-02`, `JMB-01`, `JMB-02`, `PKN-01`, `PKU-01`, `STG-01`) dengan garis batas baku mutu PP 22/2021 (55 µg/m³ harian dan 15 µg/m³ tahunan); (4) Analisis episode ekstrem dengan algoritma penggabungan jeda 1 hari (kriteria: ≥18 jam valid/hari, konsentrasi >55 µg/m³).
  - Filter mandiri per tab dalam accordion terlipat secara default sesuai kontrak desain.

- **Tab 4: Faktor Pemicu (`/dashboard/faktor-pemicu`)**:
  - `scripts/export-drivers.py` generates `tab4_drivers.json` in both `dataset/dashboard/` and `dashboard/data/`.
  - Lima komponen visual: (1) Mawar Polusi (Pollution Rose) 16 sektor arah angin berbasis Chart.js `polarArea` dalam layout fixed small-multiples (`AQMS-KTG-01` hotspot karhutla, `AQMS-JKT-01` koridor perkotaan/trafik, `AQMS-KTB-01` latar bersih); (2) Matriks korelasi peringkat Spearman 6 polutan × 3 parameter cuaca (suhu, kelembapan, kecepatan angin) pada kanvas 2D dengan selektor stasiun dan toggle musim; (3) Binned plot dispersi kecepatan angin vs median PM2.5 per zonasi; (4) Scatter plot intensitas lalu lintas per jam vs gas NO2 & CO untuk 27 stasiun; (5) Komparasi jam ekstrem (>P95 = 109.8 µg/m³) vs jam normal yang membuktikan 96.4% jam ekstrem terkonsentrasi pada musim karhutla dan disertai stagnasi angin.

Implementation references: [Vite server options](https://vite.dev/config/server-options), [Vite build options](https://vite.dev/config/build-options), [Tailwind's Vite integration](https://tailwindcss.com/docs/installation/using-vite), and [opting out of Preflight](https://tailwindcss.com/docs/preflight).

### Tab 2 implementation — 12 November 2026

The approved container hierarchy is implemented as: Ringkasan Kepatuhan {polutan} (four compact metrics); Perbandingan Konsentrasi Antarstasiun (two side-by-side horizontal rankings); Distribusi Kategori Harian {polutan} (full-width 100% stacked bars); a pair containing Perbandingan Kepatuhan Antar-Tahun and Estimasi IKU Stasiun; and Evaluasi Acuan Tahunan (full-width dot plot with an expandable completeness table). Each container has one heading/subtitle, with subordinate chart titles inside. Rankings share a zero-based maximum, show direct values, and remain disjoint for small selections. Category bars sort by the share of days Tidak Sehat or worse and default to the ten highest shares; a Prioritas / Semua stasiun toggle exposes the full measured selection. A visible caption states the displayed and total eligible station counts. Responsive pairs stack below 1000px. Keep the existing tokens, Chart.js animation, theme/reduced-motion/HMR lifecycle, and accessible chart alternatives.

Tab 2 supports all six shared pollutant choices, preserving the choice across tabs. Station/region/site-type/date/pollutant/QC filters affect period summaries, rankings, and category distributions. Annual evaluation selects its own year (default 2025), while the inter-year panel always compares 1 January–14 October in 2024/2025/2026; both state their separate temporal scopes and follow the selected dimensions, pollutant and QC. IKU follows the selected dimensions, global dates and QC, but always uses NO2 + SO2 regardless of pollutant selection. Do not silently label fixed-year panels as following the global date range.

The dedicated reproducible exporter is scripts/export-compliance.py (bun run data:compliance), writing identical dataset/dashboard/compliance_daily.json and dashboard/data/compliance_daily.json copies. Schema version 2 contains six pollutants' daily means and CO/O3 eight-hour maxima. It joins sensor IDs through sensors.csv to sites.csv, preserves the recorded WIB calendar, rejects duplicate timestamp records and nonfinite/negative readings, averages within each hour, and requires at least 18 distinct eligible hours per daily mean. VALID and VALID+SUSPECT series are separate; no imputation is performed. Direct ug/m3 columns and the user-approved particulate mass-scale assumption for BJB-01, MDN-01, and PSW-01 are used; their gas ppmv series use molecular mass/24.45 * 1000 at assumed 25 C/1 atm. JMB-02 has no daily means meeting the 18-hour rule. Default coverage is 26/27 stations for both particulates and gases. Source hashes are recorded; raw files remain unchanged. See the shared logger policy below for cross-tab scope.

Daily exceedance uses the selected pollutant's PP 22/2021 averaging period: PM2.5 55, PM10 75, SO2 75, NO2 65 µg/m³ over 24 hours; CO 4000 and O3 100 µg/m³ over eight hours. Its denominator is eligible station-days for that averaging period, not an equal-weight mean of station percentages. Station concentrations and category distributions use measured 24-hour means; categories follow the selected pollutant's Permen LHK 14/2020 concentration breakpoints, not the maximum ISPU across six pollutants. Annual PP lines are PM2.5 15, PM10 40, SO2 45, NO2 50, O3 35 µg/m³; CO has no annual PP reference and shows an explicit unavailable evaluation with its observed means retained in the table. WHO annual lines are PM2.5 5, PM10 15 and NO2 10 only. Reference-based red/green labels require a completed calendar year and at least 75% measured days, an analytical coverage rule rather than legal certification. Incomplete years/coverage use neutral dots, including 2026. Missing series stay null.

IKU is an implemented per-station period estimate from paired NO2/SO2 days, with the adaptation and coverage specified below. The heatmap remains pending placement and is not drawn. Methodology and expandable data tables describe sources, denominators, QC/units, references, temporal scope, and missingness. These completed and pending states supersede earlier Tab 2 placeholder descriptions without changing Tab 3's planned historical trends.

### Approved particulate logger scaling — 12 November 2026

User-approved analytical assumption: only PM2.5/PM10 *_ppm columns at BJB-01, MDN-01, and PSW-01 are interpreted as logger mass concentrations in mg/m³ and multiplied by 1000 into µg/m³. This is not a verified ppm conversion or an organizer rule. The basis is the mass-concentration unit options in the [Met One BAM-1020 manual](https://metone.com/wp-content/uploads/2019/04/bam-1020-9803_touch_screen_manual_rev_k.pdf) and [Thermo 5014i specifications](https://documents.thermofisher.com/TFS-Assets/CAD/Specification-Sheets/D00882.pdf), together with the accepted dataset's station/instrument metadata. No new measurement or baseline-derived value is introduced.

scripts/unit_normalization.py is the shared policy used by the overview notebook, compliance exporter, and health exposure exporter. Each generated export/provenance record retains the assumption and references. Raw files and health outcome counts remain unchanged. The particulate factor must not be used for gases. A separate user-approved gas decision below uses molecular mass at assumed 25 C/1 atm for these same three stations. Selected hospital coverage continues to follow station/date filters independently of pollutant availability.

After regeneration, the compliance default view has 26/27 measured stations; JMB-02 still has no days meeting its 18-hour eligibility rule. This supersedes the earlier 23-station/unit-unavailable description for the three approved particulate loggers. Sharing a unit policy does not make the older overview's aggregation/completeness rules identical to the health/compliance pipelines; their existing differences and concentration rounding remain unchanged by this task.

### Compact compliance comparisons — 12 November 2026

User-approved change: the daily distribution defaults to at most ten priority stations, ordered by their share of measured days in Tidak Sehat, Sangat Tidak Sehat, or Berbahaya. Prioritas / Semua stasiun is a local presentation choice; it does not change analytical filters, overview metrics, denominators, or the complete source tables. The caption always shows the displayed coverage and criterion. Mode changes reuse the distribution chart and update only that chart; filter changes recalculate the eligible selection while retaining the chosen presentation mode.

The two concentration ranking plots use 22px row spacing, a 40px axis allowance, and bars up to 12px thick, reducing a ten-station plot from 385px to 260px without shrinking its labels. They retain all ten entries, their common zero-based maximum, and direct values. Distribution rows use 28px spacing plus a 45px axis allowance: ten priorities occupy a 325px plot, while the optional all-station view expands to show its full eligible population. The annual and inter-year plot sizing is unchanged.

### Inter-year comparison restored — 12 November 2026

The user undid the regional dot plot. Restore the three aggregate horizontal bars for 2024/2025/2026, pooling measured station-days within the selected station/region/site-type and QC scope over the fixed 1 January–14 October window. The priority category view, compact rankings, and separate annual concentration dot plot remain unchanged.

### Compliance filters and period IKU estimates — 12 November 2026

User-authorized implementation supersedes the initial PM2.5-only lock and unavailable IKU panel. All six pollutant buttons now affect actual exported series, concentration rankings, pollutant-specific 24-hour category counts, PP exceedance metrics, comparative years and annual references. Labels, units, scope, accessibility text and table headers update with the effective pollutant. Filter selections persist across tabs. CO has no PP annual reference, so its annual chart is hidden with an explicit explanation and observed means remain in the table. The overview pipeline and its existing reference definitions were not changed in this task.

For CO/O3 exceedance, export the maximum within-day eight-hour mean from hourly bins, with windows starting at 00 through 16 WIB. Each window requires all eight consecutive hours; a day requires at least 13 of its 17 windows (a conservative analysis completeness rule, not a statutory certification). No cross-midnight window or invented hour is used. Twenty-four-hour means still require 18 distinct hours; their coverage is separate from eight-hour exceedance coverage. The period table shows both day-count columns only when any selected row has different denominators; otherwise it retains Hari terukur alone. Invalid/missing values and unsupported gas units stay null. Schema version 1 and the former PM2.5-only frontend interface are removed.

The IKU panel retains its placement beside the inter-year comparison and now shows Estimasi IKU Stasiun. Apply Permen LHK 27/2021 Lampiran II's transformation to each station's paired NO2/SO2 daily means over the selected period; do not aggregate stations or region_group values. It remains an adaptation for one monitoring location, not official administrative IKU. Global date, region, site-type, station and QC filters apply; the pollutant control does not replace either gas. Show up to five lowest available station estimates and give every selected station in an expandable table with original region as context, gas means, category and paired days. Keep the disclosure open on updates. Default coverage is 26/27 paired stations after gas conversion. Preserve null scores for missing data and the empty state. Values outside 0-100 are not clamped or assigned a regular category. Shared chart lifecycle and the gas assumptions remain in force. This station view supersedes the former regional aggregation.

Verified reference sources: [PP 22/2021 Lampiran VII](https://ppkl.menlhk.go.id/website/filebox/999/2107071506548.%20Lampiran%20VII%20Salinan%20PP%20Nomor%2022%20Tahun%202021.pdf), [Permen LHK 14/2020 Lampiran I](https://peraturan.bpk.go.id/Download/156214/Permen%20LHK%20Nomor%2014%20Tahun%202020.pdf), [Permen LHK 27/2021 Lampiran II](https://dlh.ponorogo.go.id/wp-content/uploads/2022/01/Permen-LHK-27-tahun-2021-tentang-IKLH.pdf), and [WHO 2021 guidelines](https://www.who.int/publications/i/item/9789240034228). Regulatory documents supply methods and reference values only; all observations remain from the supplied raw datasets.

### Approved gas ppmv conversion - 12 November 2026

The user approved temporary use of current scientific knowledge while awaiting committee confirmation. For BJB-01, MDN-01 and PSW-01 only, assume gas columns labelled ppm represent ppmv and convert to ug/m3 with ppm * molar_mass_g_mol / 24.45 * 1000 at fixed 25 C and 1 atmosphere. Use molar masses SO2=64.066, CO=28.010, O3=48.000 and NO2=46.006; retain full computed factors rather than rounded display factors. The 24.45 L/mol value is the adopted conventional approximation from the CCOHS conversion reference, not a measured station condition. Do not substitute row weather temperature, infer unrecorded pressure, or apply the particulate mass-scale factor to gases. Metadata does not confirm ppmv or instrument reference settings; retain these qualifications in methodology and generated provenance. References: https://www.ccohs.ca/oshanswers/chemicals/convert.html and the Serinus manual linked in scripts/unit_normalization.py.

The shared policy applies before existing quality filtering/aggregation in the overview notebook, compliance exporter and health-exposure exporter. Keep raw observations, original columns, existing averaging/completeness rules, particulate outputs and hospital case counts intact. Regenerate actual notebook outputs and both copies of each affected dashboard export/provenance. Gas filters, daily categories, exceedance counts, annual evaluation, health exposure/pairing and station IKU then consume the converted observations automatically. This supersedes earlier gas-unavailable decisions only for the three approved stations. Compliance now has 26/27 measured stations for every pollutant and IKU now provides 26/27 individual station estimates in the default VALID window; JMB-02 still has no eligible daily means. Keep unavailable states for genuinely absent or unsupported data and retain the earlier documented cross-pipeline aggregation differences.


### Station comparisons and station IKU - 12 November 2026

User selected two changes: grouped bars comparing individual stations across years and IKU estimates per station. Preserve the panel pair, other charts, existing filters and all measurement exports. The older aggregate inter-year bars and regional IKU calculations are replaced rather than retained as hidden alternatives.

For the inter-year panel, compute each station's pollutant-specific exceedance percentage and measured-day denominator separately in 2024, 2025 and 2026 over fixed Jan 1-Oct 14 windows. Region/site-type/station/pollutant/QC apply; global dates do not alter these windows. The user chooses up to four distinct stations using the local searchable controls described below. Initial full-scope choices are SM2-01, KTG-01, PLB-01 and BJB-01. This replaces automatic consistent-change example selection and the Palembang substitution rule. Tables still classify strict decreases/increases in both adjacent-year changes as consistent, unchanged rates as Tetap, other complete patterns as Berfluktuasi and missing years as Data tidak lengkap. Every pattern can be selected for the chart; missing year values remain null. The table covers all globally selected stations, independently of chart selection. Results are descriptive rather than statistical significance or evidence of policy effects; uneven observation coverage remains material.

Use vertical grouped bars on desktop and mobile, as requested by the user. Each group represents one station and the three years sit beside each other. Year colors remain blue 2024, amber 2025 and teal 2026, with a text legend and table alternative. The percent axis starts at zero; round its common upper bound up to ten percentage points, minimum 10 and maximum 100, to use the compact chart area without truncating bars. Draw direct values above bars when the plot is at least 480px wide; on narrower plots use tooltips, the screen-reader list and full table to avoid overlapping labels. Retain chart instances and the existing theme/motion/teardown behavior. Do not show the example-count/pattern summary above the chart; retain the selection rules in methodology and actual patterns in the table. When no examples qualify, hide the plotted frame and retain the complete table.

The comparison and IKU panels share equal-height grid rows while their tables are collapsed, including when stacked on mobile. Their bodies and chart hosts use flex layouts so the plots occupy the available space instead of leaving a blank footer area. Chart frames have a 160px minimum and canvases are positioned within them; remove the former per-station horizontal plot height. When either table opens, panels grow independently with their actual table content instead of stretching the other plot to match a long table. Scope these rules to the comparison/IKU pair; rankings and daily distribution retain their geometry.

The new inter-year table includes all selected stations, each year's percentage only (without the exceedance/eligible-day subline), signed changes 2024-25/2025-26/2024-26 in percentage points, descriptive pattern. The user removed the chart-inclusion column. Keep genuine zeros distinct from unavailable years, preserve the disclosure state through updates, and provide a named focusable horizontal-scroll region. The IKU table likewise keeps all selected stations (27 initially), including unavailable JMB-02. No regional estimate remains in the frontend model.


### Vertical comparison and matched panel heights - 12 November 2026

User requested vertical inter-year bars and matching IKU container height without unused space. Replaced only the grouped chart orientation and paired-panel sizing; station selection, percentages, IKU calculation, filter scope and datasets remain unchanged. The visible common percent scale adapts to the displayed maximum while retaining zero. Verification includes rendered-bar pixel geometry, matching panel/footer bounds at desktop/mobile widths, and existing filter/lifecycle/responsive checks. See CHANGELOG.md for completed validation.


### Simplified comparison table cells - 12 November 2026

User requested removal of the extra counts such as 44 / 288 hari. Annual cells in the inter-year comparison table now show only the percentage or Tidak tersedia. Keep all stations, delta columns and patterns. Counts still determine the percentages in the model; the formulas, data and other tables are unchanged. Synchronize the caption and supporting copy so they do not promise counts in this table.


### User-selected Palembang comparison example - 12 November 2026

The user replaced the visualized AQMS-KTG-02 with AQMS-PLB-01 and removed the Pada grafik table column. Retain every selected station in the table, including KTG-02; remove only the table's inclusion header and cells. The default chart now shows SM2-01, KTG-01 and PLB-01. PLB-01 is an explicit illustrative choice and has a fluctuating default PM2.5 pattern (32.14%, 34.01%, 32.47%), so do not label it consistently worsening or improving. The table retains actual patterns and methodology records this exception to automatic consistent-change selection.

Apply the replacement only when KTG-02 is in the automatic example set and PLB-01 is inside the effective filtered station set with data in all three comparison periods. Do not insert stations outside the selected region/site-type/station scope or fabricate missing years. If PLB-01 is already an example, remove KTG-02 without duplicating PLB-01. Other filters and the automatic policy remain unchanged when the replacement cannot apply. Preserve all actual percentages, deltas, coverage rules, chart geometry and IKU behavior.


### Remove comparison summary line - 12 November 2026

User requested a slimmer panel by removing the entire example-count and pattern summary above the inter-year chart. Remove its DOM node, update logic and dangling aria-describedby reference. Keep the year legend, chart, compact threshold footnote, table and methodology. Existing flex/grid sizing preserves equal closed-panel heights and fills available chart space.


### User-selected comparison stations - 12 November 2026

User approved a searchable local station picker and requested four initial choices. Add a collapsed Pilih stasiun pembanding disclosure inside the existing inter-year panel. Use four instances of the shared searchable-select, labelled Pembanding 1-4, with a Tidak dipilih option for each slot. Initial full-scope values: SM2-01, KTG-01, PLB-01, BJB-01 (the fourth replaces JKT-01 at the user's request). Do not restore the removed count/pattern summary line. Keep the vertical chart, year colors, adaptive zero-based percent scale, complete table and compact closed-panel geometry.

Each slot lists only stations inside the effective global region/site-type/station scope and excludes the other occupied slots. Typing/search does not change analytical state; valid option selection commits, Escape/blur restores the previous choice. Clearing slots is allowed and never silently refills while scope is unchanged. Local changes update only this chart and picker options, preserving the summary, IKU, other charts and complete table. Polutant/QC/date changes preserve local station choices; global dates remain separate from the fixed comparative window. On a station-dimension scope change, preserve compatible slots and clear incompatible ones. If no occupied slot survives, initialize up to four scoped defaults (prefer the four named initial stations, then station-code order, prioritizing any available year data). Narrow scopes may contain fewer than four; an entirely empty scope stays empty. Announce scope reconciliation without adding a permanent count line.

Fixed/missing/fluctuating profiles are eligible user choices, with actual missing year values retained rather than invented zeros. An entirely empty selection prompts the user to choose stations; selected stations with no observations show a data-unavailable state. The picker is two columns on roomy panels and one on phones, closes its option menus with its disclosure, and destroys all four shared control observers/listeners/popup nodes on feature teardown. Expanding the picker lets the panel grow naturally via the existing disclosure layout exception. Do not aggregate IKU differently or modify measurements for this change. The previous automatic comparison-example function and its special replacement path are removed.


### Fourth default comparison station - 12 November 2026

User replaced the fourth initial choice JKT-01 with BJB-01. The other three defaults, four-slot control behavior, filter constraints and calculations remain unchanged. JKT-01 stays available for manual selection and scoped defaults.


### Overview missing observations and station coverage - 12 November 2026

User authorized correcting Tab 1 after investigating JMB-02. Retain every station in the effective region/site-type/station selection, including unmeasured or unsupported pollutant series, rather than fabricating zeros or treating missing data as Baik. Separate station dimensions (filterStations) from daily observations (selectObservations) and represent concentration, exceedance and dominant category as nullable, with measuredDays, periodDays and an explicit unavailableReason. A shared type guard identifies genuinely measured observations. Do not use legacy aggregate fields or alternative pollutant series when the requested daily cube, threshold, series or dates are unavailable. Empty/inverted date scopes have no measured observations. A recorded numeric zero remains a valid observation.

Air concentration means and exceedance percentages give equal weight only to stations with at least one measured day. Category composition and its center count also use only measured stations; no invented category slice is created for missing observations. The default VALID view now has 26/27 measured stations; JMB-02 has none in either QC mode. Show an effective coverage line above the existing indicator/distribution panel. Keep the four headline subjects and the visual-first layout; do not add separate ranking, admissions, quality-dashboard or imputation sections. Health burden continues to follow selected station/date hospital relationships independently of air-data availability.

Peta and the existing table retain all selected locations (27 initially). Missing observations use a fixed-radius gray marker (#7b8794) with a dashed outline, neutral category/status text Data tidak mencukupi, concentration Tidak tersedia and an explicit reason. Both daily and annual map modes keep this neutral treatment; do not count missing stations among annual below/above-reference classes. Add an unavailable legend entry; map percentages use all selected locations including unavailable ones. Measured marker rules otherwise stay unchanged. Popups and the concentration table cell show measured/selected-calendar days and the corresponding percentage, without reintroducing a separate Valid column. Sparse measured series keep their actual calculations and display their limited coverage rather than claiming complete annual representation. Popup remains compact and non-scrollable.

The no-measurement selection displays dashes in the three air indicators, no most-critical station and an explicit unavailable-category state, while hospital indicators and station coordinates remain available. The overview grid and table host must permit the table's own horizontal scroll at narrow widths rather than widening the page. Preserve chart/map teardown, theme, motion and filter behavior.

This change consumes the existing daily export and does not regenerate measurements, alter raw QC flags, impute values or harmonize the older overview aggregation with Tab 2/5. Its row-count rule and per-pollutant completeness limitation remain documented in methodology. Current PM2.5 VALID examples: MDN-01 has 371/1018 observed days and MER-01 has 2/1018; these are actual export coverage counts, not a newly imposed minimum-coverage classification. Earlier descriptions that all 27 stations contribute categories/air means are superseded by this measured-observation contract.


### Top-ten annual evaluation with full view - 12 November 2026

User requested a compact default annual evaluation and a way to inspect all stations. Default the annual dot plot to Top 10, defined as the ten highest measured annual mean concentrations for the selected evaluation year, pollutant, region/site-type/station and QC scope. This is a concentration ranking, not a claim that partial-year or incomplete-coverage points are formal annual violations. Preserve the existing annual reference lines, neutral partial-data classification, separate year selector and missing CO annual-reference state.

Add a Top 10 / Seluruh stasiun segmented control with pressed states and a visible plotted/measured count. Rank descending by measured mean with station-code ties, include all measured stations when requested, and show fewer than ten when the scope contains fewer. Missing means stay absent from the plot; the expandable annual table retains every globally selected station and its actual completeness/status in both display modes. Keep the display mode through filter/year updates for the mounted feature. For CO, disable display controls while preserving the mode and showing its explicit unavailable-reference explanation.

Mode changes update only the existing annual chart, its count and button states; do not update summary metrics, comparison picks, distribution, IKU or the full table. Maintain the shared chart/theme/motion/CSS-HMR lifecycle and feature teardown. Reuse the established toolbar/segmented styling without new dependencies. The plot uses the existing 30px row sizing, so ten entries occupy a 365px frame instead of the full-selection height. This supersedes earlier descriptions of an initially full-population annual plot without changing analysis or measurement exports.


### Hide duplicate period day counts - 12 November 2026

User requested removing a redundant day-count column when every displayed row has matching numbers. In the bottom period table, Hari terukur counts available 24-hour means used by concentration averages/categories; Hari pembanding counts available regulatory-period measurements used as the exceedance denominator (24-hour means for PM2.5/PM10/SO2/NO2, daily eight-hour maxima for CO/O3). Compute whether any selected row has days != comparisonDays. Show Hari pembanding only in that case, keeping header and body cells aligned; otherwise show just Hari terukur. The current full-window data have equal counts for every station/QC mode in the four 24-hour pollutants, while CO/O3 have genuine differences. The condition follows effective filters rather than hardcoding a pollutant: CO at BJB-01 can also omit the duplicate count. Do not alter denominators, percentages, categories, annual tables or chart selection.

### Compact period table with comparison days - 12 November 2026

When Hari pembanding is visible, use a fixed column layout, narrower 10px vertical/6px horizontal cell padding and wrapping headers/station descriptions. Retain the existing 12px text and every value. Apply this compact styling only to the period table with the additional day-count column; other tables retain their existing cell layout. Constrain the compliance grid to minmax(0, 1fr) so the table cannot widen the whole page. The compact table fits without horizontal scrolling at verified desktop viewport widths of 1280 and 1440px. Preserve an 880px minimum table width and internal horizontal scrolling on narrower screens to keep eleven columns readable; never hide overflowing data.

### Pelampauan wording and annual partial-data selection - 12 November 2026

Rename the inter-year panel to Perbandingan Pelampauan Antar-Tahun: bars represent the percentage of measured comparison days above the reference, so lower is better. Preserve station choices, denominator, fixed comparison window, chart geometry and table.

Add an initially unchecked Sertakan data parsial checkbox to the annual evaluation toolbar. Follow the existing annualAssessment classification: a year not yet ended in the export or measured days below 75% of its full calendar makes a measured series partial. This is an analysis completeness rule, not an organizer/legal compliance requirement. Exclude partial rows before ranking Top 10 or selecting all; checking the option includes them with the existing neutral color. Never invent missing values. Explain explicitly when all measured rows are partial and the option must be enabled to see them. Keep the complete annual table unchanged, including missing/partial stations, and keep this local option independent of other charts/metrics/global filters. Preserve the checkbox through mounted-feature year/filter/mode updates; disable it for CO along with annual display controls. Use the existing chart instance and abortable event lifecycle.

Annual point tooltips now show measured days / full-year calendar days and percentage coverage (365 or 366, including missing days in the denominator). Provide the same mean/status/coverage in the screen-reader chart alternative and retain the table equivalent. The displayed scope reflects the eligible plotted population and announces excluded partial stations. This supersedes the previous default of including all measured partial annual points; no export, completeness threshold or annual classification changes.

### Executed Tab 2 filtering walkthrough - 12 November 2026

The explanatory notebook `notebooks/simulasi_penyaringan_tab2.ipynb` documents and executes the existing Tab 2 filtering contract on raw JKT-01, MDN-01, PLB-01 and JMB-02 records. It demonstrates PM2.5 and CO in VALID and VALID + SUSPECT modes, sequential non-overlapping rejection counts, original accepted/rejected samples, actual QC flags, existing unit assumptions, hourly aggregation, daily completeness, within-day eight-hour windows and full-calendar annual coverage. Store executed tables and two explanatory figures in the notebook. It reads raw/master/metadata and exports without rewriting any of them; no UI or analytic policy changes are introduced. Check explicit daily/window calculations against the production aggregator, all selected date-series against dashboard exports, export-copy equality and recorded source hashes. The notebook's annual example is PM2.5; CO window logic also explains O3 but does not claim an O3 series was checked.

### Shared filtering policy for AQMS work - 12 November 2026

At the user's request, AGENTS.md now makes the verified Tab 2 filtering flow the required contract for new or changed AQMS work across notebooks, analysis exports and dashboard features. Preserve QC selection, per-pollutant normalization/eligibility, duplicate rejection, distinct-hour aggregation, daily/eight-hour completeness, actual comparison denominators, full-calendar annual coverage and explicit missing/partial states. Reuse production functions and verify independent explanations against exports rather than letting cleaning rules drift. The full normative rules and source links are in AGENTS.md under Shared AQMS filtering contract.

This documentation change does not migrate existing pipelines or claim all tabs already conform. Previously documented Tab 1 differences remain; migration of an unrelated feature requires the user's approval. Hospital outcomes retain their own data rules. No measurements, thresholds, exports, notebook outputs or interface behavior changed in this policy-only task.

### In-product filtering methodology - 12 November 2026

Expose the verified AQMS filtering flow as one shared, semantic seven-step ordered explanation in the global Metodologi dialog and Tab 2's Metodologi & cakupan data disclosure. Cover source/unit mapping and approved conversion assumptions, QC selection, duplicate/timestamp/value eligibility, distinct-hour daily means, CO/O3 complete eight-hour windows, actual exceedance denominators, and full-calendar annual completeness. Explain null versus zero, no imputation, and the limited effect of Sertakan data parsial. Keep the scope explicitly Tab 2 and retain the existing Tab 1 aggregation limitation and separate hospital rules; do not imply a completed cross-tab pipeline migration.

Reuse the same presentation component for both surfaces to keep instructions consistent. Use existing methodology typography, numbered steps and spacing; preserve dialog keyboard focus, Escape dismissal, internal scrolling and responsive containment. Extend calculation provenance to the Tab 2 exporter/normalizer, export paths and executed notebook. This changes explanatory content only; calculations, filters, datasets and charts remain unchanged.

### Finishing discussion: optional imputed data - 12 November 2026

Record the proposed Sertakan data hasil imputasi filter in [TODO_FINISHING.md](TODO_FINISHING.md) for the finishing session. It is a discussion item, not an implemented feature or approval to change the no-imputation pipeline. Discuss method validation, eligible gaps/stations, independent QC/partial controls, unchanged observed coverage, explicit estimated-value provenance and effects on each analysis before implementation. The current observation-only behavior remains the active contract.

### Remove redundant scope lines and standardize the filter divider - 12 November 2026

User removed the Tab 1 station-coverage sentence and Tab 2 pollutant/period/measured-station/QC scope sentence above their analytical content. Remove those DOM nodes and update paths rather than hiding retained copy. This supersedes the earlier instruction to show a coverage line above the overview panel. Preserve measured-only calculations, missing-data states, doughnut counts, per-station popup/table coverage, Tab 2 summary metrics and all filters. The Tab 5 scope and analytical coverage text remain unchanged.

Use the shared filter host's bottom border to distinguish filters from content on all supported tabs, including Tab 5, and make it the default for future tabs using global filters. Reuse the existing border token and spacing in both themes/screens without extra separators or chart changes. Existing filter disclosure behavior and selected-summary badges remain intact.

### Period-baseline comparison of under-5 and over-60 admissions - 12 November 2026

User authorized adding the previously identified age-comparison gap to Tab 5 and explicitly selected the average of the selected period as baseline. Add one full-width Perubahan Admisi Balita & Lansia panel after the existing analytical pair. Preserve existing indicators/trends/lag/grouped-case calculations, outcome selector, shared filters and filter/content divider. The new panel always uses the separate respiratory under-5 and over-60 fields; changing the selected health outcome does not change this panel. It follows global station dimensions, dates, pollutant and QC. This scope adds the age comparison, not the pending event-study or adjusted models.

For each mapped facility, calculate each age's baseline mean from all selected calendar dates with both age counts available, even when AQMS exposure is missing. Build same-day exposure/age pairs only where all three observations exist. Require at least 30 paired days, positive baseline for both ages and five nonempty relative-exposure groups. These are descriptive-analysis eligibility conditions, not changes to AQMS filtering or a validated significance threshold. Sort paired concentrations per facility; use nearest-rank cumulative 20/40/60/80 percent cutoffs and assign ties to the same lower group. Ties can create uneven groups; if a group is empty, exclude that facility from all five groups. Keep the same eligible facilities in every plotted group. No imputation, artificial tie splitting, baseline-zero replacement or exposure substitution.

At each facility/age/group compute (group mean admissions / that age's period baseline - 1) * 100. Average these percentage changes equally across eligible facilities; do not divide pooled counts from facilities of different sizes. P1 is the lowest relative exposure group and P5 the highest within each facility, not shared absolute concentration bands or regulatory classes. Baseline counts span all paired-age health dates in the chosen period, while plotted group counts require exposure too. Display eligible/selected facility counts, baseline facility-days and equal-facility-weight mean baseline rates. Tooltip and screen-reader alternatives expose signed changes, actual paired facility-days and pooled actual mean concentration in each relative group.

Use a vertical grouped Chart.js bar chart with named under-5 and over-60 legend entries and a shared signed percentage axis including zero. 0% denotes the period baseline; negative changes remain visible. Preserve theme/reduced-motion/CSS-HMR lifecycle, reuse the chart under filters and destroy it with the owning feature. Add a specific insufficient-data state for short, constant-exposure, zero-baseline, missing or unsupported scopes. Keep explanatory copy explicit: same-day descriptive changes, no adjustment for weather/season/population or lag, no confidence interval or relative-risk estimate, and no claim that larger raw/relative counts prove greater vulnerability. No pipeline or dataset changes are required; the validated health exports already carry the observations. The health feature now owns five charts.

### Remove the health top-level scope line - 12 November 2026

User also removed the Tab 5 facility/date/pollutant/QC summary sentence below its toolbar. Remove its DOM/update path and unused styling; do not replace it with another scope sentence. Selected values remain in the shared filter-summary badges and the filter/content divider remains the default boundary. Preserve paired-day coverage, age-panel baseline/cohort counts, per-analysis qualifications, all five charts and calculations. This supersedes earlier instructions retaining the Tab 5 top-level scope line; analytical coverage text remains unchanged.

### Recover unresolved merge artifacts - 13 November 2026

The integrated repository contained committed conflict markers in Tab 3/4 feature entries, the overview export, two notebooks and project documentation. Resolve the feature entries to the already implemented temporal/drivers modules, preserving their loaders, views, retry and teardown; do not restore their old unavailable placeholders. Keep both existing documentation histories. Resolve the download notebook without changing its code or running downloads.

Restore the overview notebook's previously user-approved shared normalization from local commit 3cf0f97 and retain the incoming notebook/root path detection. Execute that notebook to regenerate both overview JSON copies; do not hand-select or edit numerical observations. This recovery preserves the earlier overview aggregation behavior and limitations rather than introducing the separate distinct-hour migration. Rebuild generated bundles from the integrated TypeScript sources and verify notebook/JSON validity, matching exports and absence of conflict markers. Older health-navigation tests must check removal of health-owned canvases while allowing the now-functional temporal page to render its own charts.

### Align Tab 3 and Tab 4 presentation - 13 November 2026

User authorized aligning Pola Waktu and Faktor Pemicu with the established appearance of Tabs 1, 2 and 5. Reuse shared panels, metrics, searchable selects, segmented controls, theme tokens and chart lifecycle. Scope this change to presentation and interaction: preserve existing exports, calculations, thresholds, analytical populations, default selections and unsupported global-filter states. This alignment does not certify or migrate the older analytical pipelines.

Use a single-column analytical grid with 20px between panels. Show four KPI cards above 1200px, two through tablet/phone widths, and one below 375px. Allow labels and context to wrap rather than truncate; align card headings and values. Keep concise panel headings and units visible, with the existing longer explanations in initially collapsed Cara membaca or methodology disclosures. Preserve essential distinctions in labels and explanations.

Use grouped mode buttons with aria-pressed, consistent selected styling and equal heights. On phones, fit each mode group to its container, provide at least 44px height for mode/station/scale controls, and give searchable station fields a full row. Keep station multiselection and its minimum-one rule. Wind roses retain their three selected stations but use responsive small multiples; paired extreme-condition plots stack below 900px. Episode plot height follows the displayed row count to keep all labels readable. Traffic site-type legends live in a collapsed Legenda tipe lokasi disclosure below the plot, with accessible buttons retaining series visibility toggles.

Use readable 12px chart labels and theme-aware axes, titles, legends and tooltips. Custom matrices render at device pixel ratio without shrinking their logical text size. The 24-hour matrix uses a keyboard-focusable internal horizontal viewport on narrow screens; retain all 24 columns and reveal actual values on hover/tap after scrolling. The six-by-three correlation matrix fits all weather columns on phones, wraps headers with units, and chooses black/white cell text by relative luminance. Both matrices include legends and full textual value alternatives. Keep page width contained at 320px and above.

Reuse Chart.js instances for mode, station, theme, motion and CSS hot updates. Custom canvases redraw on theme, resize, font readiness and CSS hot updates; remove their observers/listeners when the feature is destroyed. Abort feature and legend event listeners on teardown. These visual and interaction conventions are implemented and browser-checked in development and production; statistical validity of existing Tab 3/4 exports is outside this visual change.

### Shared filter visibility and grouped KPI containers - 13 November 2026

User clarified that the global filter and divider must be present on every tab, and that Tab 3/4 KPI cards must match other tabs inside one shared container per tab. This supersedes the earlier hidden filter host on unsupported tabs and separate top-level KPI grids. It does not authorize analytical filtering migrations or new calculations.

Keep one Ringkasan Pola Waktu panel and one Ringkasan Faktor Pemicu panel, each with a normal shared panel header/body enclosing its four existing KPI cards. Use the base metric card padding, radius, minimum height and value typography used by Tab 2, with wrapped labels/context and the existing responsive four/two/one-column layout. Do not apply separate Tab 3/4 card font-size or header-height overrides.

Render the same collapsed filter disclosure and divider on all six routes. Preserve selections while navigating, including before the common export finishes loading. For unsupported Tabs 3/4/6, retain saved badges, label the scope as not applied, and disable the native fieldset containing all global filter inputs and reset. Leave the disclosure and local chart controls operable. Re-enable inputs and restore the supported-tab explanation on Tabs 1/2/5; keep their actual filter behavior and selections unchanged. This is consistent visual availability with explicit functional scope, not an implemented filter pipeline for aggregated exports or the unavailable recommendations tab.

### Global filters are primary and live - 13 November 2026

User rejected disabled filters and explicitly required the global filter to be the main working control. Supersede the preceding disabled-scope decision. Enable all global controls on every tab; connect Tab 3/4 to their real date/pollutant/QC/station/region/site-type scope rather than editing summaries alone. Preserve existing Tab 1/2/5 behavior. Tab 6 retains its unavailable analytical state while accepting shared selections; this task does not implement recommendation models.

Replace the fixed all-period Tab 3/4 JSON exports/loaders and their divergent exporters with `scripts/export-hourly.py`. It reuses the production `eligible_values` function in `export-compliance.py` and approved `unit_normalization.py` policy. Both daily compliance and the hourly exporter now call the same record/value eligibility function. Preserve the original raw data and existing Tab 2 numerical exports. Generate `dataset/dashboard/hourly/` and its exact `dashboard/data/hourly/` copy: a manifest with calendar, columns, station traffic, source/shard SHA-256 hashes and non-overlapping rejection-stage counts, plus one compressed Float64 hourly shard per station/QC mode. Rejection stages describe the combined VALID+SUSPECT pool before separate mode aggregation; missing nominal raw hours are counted separately from rejected records. NaN represents missing cells, never a concentration. The `.bin` payload contains gzip-compressed little-endian Float64 data; the suffix avoids automatic HTTP gzip decoding before the explicit checksum/decompression steps. Normalized hourly means retain full numerical precision.

Load only stations and QC mode selected globally, with four concurrent shard requests maximum. Validate manifest/schema/calendar, checksum, buffer length and numeric values before aggregation; slice dates and aggregate in a worker. New filter requests terminate the previous worker; navigation tears it down. While updating, mark the feature busy and temporarily make old chart controls inert. Reuse mounted chart instances for completed updates. Bundle the worker under `/dashboard/assets/` so Vite preview and the synchronized static dashboard both resolve it. Keep compressed buffers and processing temporary; no unbounded cache or raw CSV browser loading.

Tab 3: pool eligible hourly concentrations from selected stations for diurnal median/P25/P75 (minimum 10 observations per hour) and day-of-week/hour medians (minimum 5). Compare Agu–Okt with Nov–Jul only within selected dates. Use a relative continuous concentration color scale for the hourly matrix, not daily ISPU labels. Display all selected station daily series with the shared ≥18 distinct-hour requirement. Daily mean series remain separate from CO/O3 comparison periods; do not draw an eight-hour daily threshold against their 24-hour means. Annual reference lines, where available, are context only. Episodes compare the correct 24-hour or eight-hour regulatory observation, require CO/O3's 13 complete windows, and never bridge missing days. At most one measured non-exceeding day may bridge an episode. Truncating the selected period can truncate episodes; preserve unavailable summaries when none are observed. Keep display-only profile/episode mode controls, removing local station/zone selections that competed with global filters.

Tab 4: the selected pollutant drives roses, the weather matrix, wind bins, traffic concentrations, P95 and extreme-condition KPIs. Roses show up to three stations within the global selection, preferring the original KTG-01/JKT-01/KTB-01 examples when eligible; a globally selected single station shows that station. Require three hourly pairs per directional sector and wind ≥0.5 m/s, preserving the original calm-wind convention. Wind bins show all eligible site types with minimum five paired hours per bin. Spearman pools hourly pairs across selected stations, uses tied ranks and minimum 30 pairs, and returns unavailable for constant/insufficient inputs. Explicitly explain pooled-station confounding and the single-station alternative; no causal claim. The weather matrix shows the chosen pollutant, and seasonal display controls remain subordinate to the global date selection. Finite weather values follow the same record QC/time/duplicate gates; add no new weather outlier thresholds. Hourly direction uses a circular mean. P95 is recomputed over selected hourly concentrations; weather summaries use available paired values. Traffic intensity remains the master location attribute, with a mean selected-pollutant concentration per station. Missing values remain unavailable rather than zeros.

Keep the four KPI cards in each existing summary container and retain shared sizing/responsive behavior. Use collapsed, keyboard-operable series legends below daily-trend and wind-bin plots so all selected stations/site types fit without a clipped Chart.js legend. Refresh units, labels, summary numbers and chart text with the actual pollutant and effective scope. Put detailed definitions and migration limitations in methodology. These changes migrate Tab 3/4 to the shared filtering contract and can change their old default results (including normalized loggers and duplicate/value handling); they do not migrate other tabs or adjust hospital records.

### Rekomendasi Kebijakan — 12 November 2026

The user approved POLICY_IMPLEMENTATION_PLAN.md and explicitly requested a truthful working simulation. Replace the Tab 6 placeholder and its unsupported cost-benefit/DLM/mortality promises with the approved evidence/readiness question. This supersedes that feature's reference-question/placeholder descriptions while preserving the exact application title, tab name, existing overview/health contracts, Vite workflow, and Tailwind design system.

- Reuse the collapsed shared region/site/station/date/pollutant/QC controls. Effective exposure scope is shown alongside the selected facilities/period. Health baseline statistics and recorded capacity depend on facilities/dates only. Pollutant/QC changes preserve scenario assumptions and do not rewrite hospital counts. Scenario assumptions start at zero and reset on an explicit reset or a new tab mount.
- Reading order: four scoped indicators (share of comparable days above the station-specific 2024 P90, P90 aggregate daily respiratory admissions, recorded beds, eligible exposure coverage); Tangga Kesiapsiagaan with paginated stacked horizontal bars and short evidence/action cards; Simulator Beban Admisi with real numeric/range controls and historical-versus-scenario charts; full-width network map and paginated/sortable evidence list. Use the global methodology dialog for definitions; do not add a Data & Cara Membaca disclosure or source footer.
- Readiness uses fixed calendar-2024 P75/P90 per station, pollutant, and QC mode; linear interpolation at (n−1)×p. Bins are <P75, P75 through P90 inclusive, and >P90. Require ≥30 eligible baseline dates, ≥30 eligible selected dates, and distinct P75/P90 cutoffs. This convention is not a confidence guarantee, official ISPU classification, live warning, or safe/unsafe judgment. Compare each station to its own history, not a universal absolute-risk scale. Missing units or sparse data are visibly uncomparable, never zero-risk values.
- The simulator's baseline is the mean or P90 of **same-day sums** of general respiratory admissions across all selected facilities, requiring complete facility coverage for each included date. Never sum facility percentiles or substitute under-5 plus over-60 counts for the general respiratory field. The baseline defaults to the mean. Use full precision for calculations and round display values only.
- Scenario admissions = baseline × (1 + assumed increase/100); scenario beds = recorded selected beds + additional beds; relative load = scenario admissions/scenario beds ×100. Controls accept finite 0–200% increases and integer 0–100,000 additional beds; these are UI bounds, not measured intervention effects. No automatic clamping or invented baseline. Blank, negative, out-of-range, nonfinite or fractional-bed inputs clear scenario output/charts with an explicit correction message. Missing/zero baseline capacity or unavailable health data has an unavailable state. Zero health admissions remain a valid zero. With zero adjustments, both scenario quantities equal their historical counterparts exactly.
- Label outputs as planning assumptions, admissions/day, and admissions/100 recorded beds/day. Do not imply occupancy, actual beds required, proven effects from pollution changes, deaths prevented, monetary cost-effectiveness, or fitted prediction. Additional beds change relative load, never the scenario admission numerator. The equation, denominator, baseline statistic, facility count, and included health-day count remain visible.
- The network preserves all 27 installed source points as spatial context; selected sites are emphasized, other sites are muted reference points outside the analytical totals. Nearest-neighbor Haversine separation is calculated against the full installed network and validated against coordinates at load, independent of filters. Source master status and selected-period QC/daily coverage are distinct. Sort separately by exposure coverage or physical separation; no hidden weighted score, invented new location, radius-based population coverage, or causal source attribution. Instrument review and additional-placement study remain different actions. Point popups and the list expose the same source facts; point inspection does not change filters.
- `scripts/export-policy.py` validates existing health-export source hashes against all raw inputs before reuse, joins master site/sensor context, retains general respiratory series/capacity, derives fixed references and nearest neighbors, and counts selected-date recorded/excluded-QC rows. It emits mirrored versioned `policy_context.json` files under dataset/dashboard and dashboard/data. Raw CSVs remain untouched; no raw analytical file is fetched by the browser. QA row counts are not hourly completeness: only parseable timestamps in the observation window enter their date counts. Rerun data:health before data:policy when upstream raw sources change.
- `features/recommendations/` owns its data contract/validation/cache, domain model, scenario component, charts, map, view, and public feature lifecycle. It consumes the public daily export format without importing another feature's private implementation. Theme/filter changes reuse chart/map instances; live reduced motion, CSS palette updates, aborted loads, sibling fetch cancellation, error/retry, observers, keyboard handlers, and instance destruction follow the shared contracts. Network markers are keyboard-operable and basemap failure retains the source points/list.
- Reproduction: `npm run data:policy`, strict build, model tests, and focused development/production browser checks. Verification results, screenshots, baseline failures, and limits are recorded in CHANGELOG.md. The original source audit and explicit planning assumptions remain in POLICY_IMPLEMENTATION_PLAN.md.

### Policy table disclosure and simulator controls — 12 November 2026

User-requested correction: make the station evidence table collapsible and simplify the awkward simulator controls. Keep the network map outside the disclosure. `Data stasiun` starts collapsed at every width and shows the selected station count; sort controls, table rows, and pagination live inside it. Opening/closing preserves sort/page state and selections, and filter updates preserve whether the table is open. Use native details/summary keyboard behavior, an aligned SVG chevron, and a 260ms size transition where supported, disabled for reduced motion.

The simulator uses one numeric input per assumption. Remove the redundant percentage slider and its listeners/styles; keep all existing domain limits and calculations. Align both baseline buttons, numeric inputs, and reset to 44px controls. Use container-based layout so actual panel width determines wrapping: four controls on roomy panels, three fields with reset below on constrained panels, a full-width baseline above two fields below 560px, and one column below 360px. The segmented baseline has no padded outer frame that changes its height. This supersedes the previous numeric/range-control presentation, not the scenario formulas or reset semantics.

### Policy pagination boundaries — 12 November 2026

At the user's request, hide each previous/next control when there is no page in that direction, for both the readiness chart and station table. A single-page selection shows neither button. Retain the page/count text and the existing sort/page behavior. If a clicked pager button disappears at a boundary, move keyboard focus to the remaining direction. These controls navigate station evidence only; they are not simulation steps.

### Remove policy pagination — 12 November 2026

User clarification: pagination is unnecessary for the small station set and inconsistent with the other tabs. This supersedes the pagination-boundary decision above. Show all comparable selected stations in the readiness chart and all matching rows inside the collapsed station-table disclosure, preserving sorting and disclosure state. Remove page slicing, counters, previous/next controls, handlers, page state, and unused pager styling. Keep row labels readable with chart height based on the actual station count; global filters narrow the selection. Scenario controls and calculations remain independent of station browsing.

### Plain-language copy and policy-page review — 12 November 2026

User direction: avoid decorative arrow separators in interface copy. Reworded health orientation, lag/comparison captions, and policy evidence text using words; analytical calculations are unchanged. AGENTS.md records this preference while preserving actual SVG chevrons/navigation icons. The broader question of whether the policy tab should lead with recommendations rather than filters/percentile charts is reconsidered in POLICY_TAB_REVIEW.md. That structural revision is a proposal for review, not a description of implemented behavior.


### Action-first policy revision — 12 November 2026

The user approved POLICY_TAB_REVIEW.md by asking to continue. This supersedes the policy/readiness structure and shared-filter scope above. Explicit organizer context: the case-study booklet asks for interpretable decision support and a review of monitoring-network adequacy; it does not require a percentile readiness ladder, simulator, weighted score, or this particular layout. The user requested removal of the awkward analytical emphasis and approved this action-first structure. The precise card grouping and two-column desktop layout are implementation/design choices.

- Lead with `Prioritas Tindakan`: proposed instrument/telemetry review, monitoring continuity, logger-unit verification, respiratory-service readiness review, and additional-monitoring siting study. Every card includes source locations, evidence, an initial step, and a follow-up measure. Generate locations/counts/ratios from the validated export; do not hardcode station counts or present a proposed action as a measured benefit. Source master status selects instrument/continuity review; unavailable-unit flags select normalization review. Show the highest relative general respiratory admission volume within the selected region as a service-review candidate, and up to two largest full-network nearest-neighbor separations as siting-study candidates. These are transparent candidate-selection conventions, not clinical or regulatory thresholds.
- Hide the global analytical filter panel on this tab. Use one independent searchable region lookup in a native disclosure that starts closed and displays its committed value in the summary. Typing/Escape/blur do not commit; closing preserves the value. Start each feature mount at all regions. Preserve analytical filter selections for overview/health; do not silently inherit dates, pollutant, QC, station, or site type here. Policy uses the full exported calendar explicitly, currently 1 January 2024–14 October 2026. Its coverage count is days on which **all six** pollutants have valid daily observations under the verified ≥18-hour VALID rule and established units. Missing units are unavailable, not zero concentration or inferred sensor downtime.
- Remove the historical percentile chart/KPIs and their tier calculations/references from the policy model, chart module and export. Schema version 2 rejects old policy-context payloads. Keep source QC counts, statuses, coordinates, admissions and capacities for factual evidence; preserve source hashes and raw files. Do not load overview measurement data as a prerequisite for policy content.
- `Lokasi dan Bukti` follows the actions, retaining the full-network map, keyboard-operable markers, explicit unavailable-basemap status, and collapsed sortable station table without pagination. A region narrows cards/table and emphasizes selected map points; nearest-neighbor calculations retain all installed locations. Instrument status and complete-day counts remain distinct. Do not imply population coverage or invent procurement coordinates, budgets, deadlines, or predicted health benefits.
- Place `Simulator Beban Admisi` in a separate native disclosure below the health analyses, labelled `Perencanaan opsional` and closed on mount. Instantiate shared charts/controls on first opening, preserve inputs across close/reopen, refresh the baseline with facility/date changes, and destroy owned instances/listeners on health teardown. The shared typed admissions interface contains mean/P90, capacity, facility count and complete-day count. Health computes same-day summed **general respiratory** admissions from its validated public export before mean/P90; the chosen health outcome, pollutant and QC do not rewrite that baseline. Preserve the previously documented exact arithmetic, constraints and unavailable states. No private cross-feature imports or duplicate legacy simulator remain.
- Retain Tailwind-backed shared structure/tokens, responsive controls and SVG disclosure chevrons; use native keyboard states and reduced-motion transitions. Keep plain-language copy without decorative arrow separators. Methodology and README describe the revised scopes and formulas. Validation evidence is recorded in CHANGELOG.md.


### Retain simulation in Rekomendasi Kebijakan — 12 November 2026

User correction: retain the simulator in the policy tab while removing the awkward full filters and readiness ladder. This supersedes the simulator relocation to Dampak Kesehatan in the preceding revision. The policy reading order is `Prioritas Tindakan`, visibly expanded `Simulasi Kapasitas Layanan`, then `Lokasi dan Bukti`. Keep the one collapsed independent region lookup, fixed observation period, action evidence, and collapsed station table. Do not restore the percentile ladder, full analytical filters, or pagination.

The simulator uses recorded general respiratory admissions and capacities for facilities in the selected policy region over the full exported calendar. Sum same-day admissions only on dates with complete facility coverage, then calculate mean/P90; unavailable capacity remains unavailable. Changing the region updates the baseline/capacity and preserves numeric assumptions. Other tabs' dates, pollutants, QC and facility selections do not affect this tab. Keep existing bounded inputs, exact zero identity and arithmetic, accessible comparison charts, explicit assumptions, reduced motion, and theme responsiveness. Initialize charts after the PRANA opening has released the application, reuse on updates, and destroy on feature teardown. Remove the health-only planning disclosure/aggregation module and its styles rather than retaining duplicate controls. Update methodology and README to name the actual location and scope. No source data or simulated policy-effect model changes are part of this correction.


### Tab 5/6 case-study alignment — 13 November 2026

The user explicitly requested CASE_STUDY_CONTEXT.md alignment and then chose to follow its global filters and evidence-based response matrix. This supersedes the previous independent policy-region lookup and fixed policy observation scope. The local organizer booklet asks for vulnerable-group/lag analysis and monitoring-network review; CASE_STUDY_CONTEXT.md is the user's more detailed implementation brief, not proof that its statistical methods or chart choices are organizer-mandated. Keep all protected identity, overview inventory, Vite/Tailwind, routing, plain-language and lifecycle requirements.

Tab 5 retains its outcome selector and existing analytical charts, adding age/diagnosis baseline comparisons, an episode-centered descriptive chart, and respiratory+CVD admission-pressure time series. Use fixed per-station/pollutant/QC 2024 P25/P75/P90 references generated in health_lag.json and validated against daily exposure. Baseline comparisons require ≥10 paired cases per side; PPOK/CVD are all-age outcomes. Episode windows are complete, non-overlapping −3:+7 observations, with at least three episodes. Plot observed mean cases per facility-episode; tooltip changes use each episode’s own −3:−1 mean. Do not interpret these comparisons as population vulnerability, fitted causal effects, or controlled event-study estimates. Show the maximum Pearson lag as exploratory, not a response deadline. Combined diagnosis counts are not deduplicated patients and capacity ratios are not occupancy.

Tab 6 reuses the one collapsed global filter panel, retaining selections across routes without duplicating controls. Supported pollutant/QC/date/site selections change factual evidence and descriptive health matrix; the response matrix and fitted model explicitly remain PM2.5-specific. Matrix percentile bands are local historical context, not clinical danger thresholds. Keep recommended actions, a visible PM2.5/model simulator, separate manual capacity assumptions, quantitative expansion-weight controls, the full-width network map, and collapsed source table. No pagination or decorative arrows.
Fit two offline Poisson distributed-lag models with hospital-clustered covariance, temperature/RH, weekday, hospital fixed effects, annual cycle and linear time. Train only 2024–2025, evaluate all eligible 2026 rows against the same-control no-PM2.5 model. Report full held-out MAE/RMSE and failure to generalize extreme 2026 exposures; in-range evaluation is supplementary. The slider shifts all eight lag exposures of each training-reference profile by the same amount, restricted to every selected modeled facility's training support. Export full covariance and use the gradient of summed expected admissions for conditional mean confidence intervals. Never present those bands as patient-count intervals, causal policy benefits, or validated emergency thresholds. Show modeled-facility/bed denominators and unavailable states explicitly. Changing dates changes observational evidence/manual planning, not training-profile model predictions; say so visibly.

Expansion scores normalize raw master baseline_pm25, traffic_intensity_per_h and full-network nearest-neighbor distance against the full catalog. User weights are planning assumptions; zero total weight is unavailable. Show top 10 transparently and expose every matching value in the chart text alternative. Coordinates remain existing sites as areas for siting studies. Optional radius rings are geometric assumptions, not instrument sensing ranges, population coverage or proven blind spots. Do not invent candidate coordinates or layer external analytical datasets.

Separate feature calculations, validated data loaders, model simulation, network ranking and presentation. Load model/matrix/network exports with isolated retry so unavailable modeling does not remove factual policy content. Use shared Chart.js lifecycle for covariance bands and rankings; reuse chart/map instances on filters/themes and clean partial failures and teardown. Check 320–1440px layouts, keyboard controls, actual animation/reduced motion, cross-tab filters, invalid inputs, missing resources, and independent NumPy agreement. Completed verification and limitations are recorded in CHANGELOG.md.

On narrow Tab 5 time-series canvases, shorten date ticks to month/two-digit year while retaining full calendar dates in tooltips and scope labels. This avoids overlapping labels without dropping observations.


### Reorder policy actions after the evidence — 13 November 2026

User direction: `Prioritas Tindakan` is text-only synthesis and read oddly when leading a visual-first dashboard. Its content stays; the reading order becomes evidence-first: `Matriks Respons Kesehatan`, `Simulasi PM2.5 dan Admisi`, `Asumsi Kapasitas Manual`, `Prioritas Studi Ekspansi AQMS`, `Lokasi dan Bukti`, then `Prioritas Tindakan` as the closing recommendations. This supersedes the action-first ordering decisions above; card content, data-derived candidate selection, and the no-measured-benefit wording are unchanged.

### Remove Tab 6 PM2.5 lag simulator — 13 November 2026

User review: the `Simulasi PM2.5 dan Admisi` panel was judged unnecessary and useless. At full-network selection its scenario domain is the intersection of every modeled facility's training exposure support, which collapses to a ~2 µg/m³ window (several stations have almost no PM2.5 variation), so the curve is flat and the slider conveys nothing. The panel is removed and reading order becomes `Matriks Respons Kesehatan`, `Asumsi Kapasitas Manual`, `Prioritas Studi Ekspansi AQMS`, `Lokasi dan Bukti`, `Prioritas Tindakan`. The whole fitted-model chain is deleted with it: scripts/export-case-model.py, scripts/requirements-analysis.txt, model_coef.json, dataset/processed/model_validation.json, and the client-side lag-model/confidence-chart modules; shared validators moved to shared/parse.ts. `network_rank.json` generation moved to scripts/export-policy.py and reproduces byte-identical output. The manual capacity calculator is unchanged and model-independent. This supersedes the simulator parts of the Tab 5/6 case-study alignment entry above; Tab 5 analysis is unchanged. Note: CASE_STUDY_CONTEXT.md listed a client-side distributed-lag simulator for Tab 6; this removal is an explicit user override of that brief item.

### Tab 5 dose and episode charts made readable — 13 November 2026

User review: the outcome selector and the two charts in the second Tab 5 row were judged unclear. Data audit of the default selection (27 faskes, 1 Jan 2024–14 Okt 2026, PM2.5 VALID): the old equal-width dose bins held 23,924 / 281 / 3 / 26 / 2 facility-days — 98.7% in the first bin, with bins 3 and 5 resting on 1–2 facilities — so the bars were mostly facility-composition noise behind raw-mean x-axis labels, and raw-count bins of n=2 should not be charted (chart-judgment practice: pick the form from the comparison you intend to show, Financial Times visual vocabulary, github.com/Financial-Times/chart-doctor). The episode chart plotted raw counts (~31–33 per facility-episode), which visually hid the pattern the data actually has: mean +10.0% on day 0 versus each episode's own −3:−1 baseline (n=361 episodes), easing to +5.2% by day +7. Superseding decisions: (1) the dose chart now splits selected pairs into five equal-count exposure quintiles and plots per-facility percent change against that facility's own mean over the same selection, equally averaged; raw quintile means, exposure ranges, facility and pair counts stay in tooltips; (2) the episode chart plots the percent-change series on a zero-inclusive range with raw cases moved to tooltips; (3) both captions shrink to single lines, with full definitions kept in methodology — the superseded "Plot observed mean cases per facility-episode" instruction in the case-study alignment entry no longer applies. The outcome selector itself is retained; its responding panels (daily outcome series, lag, dose quintiles, episodes) now carry readable units so switching the indicator visibly changes the story. Affected: health model/types/charts/view, methodology, audit table; test structure preserved (bin pair partition and episode fixtures unchanged).

### Tooltip completeness pass — 13 November 2026

User asked for tooltips on every visualization so readers can decode any chart on hover without adding persistent on-chart clutter. Audit across all six tabs: Chart.js tooltips with units/context were already present on the overview doughnut and rankings, all Tab 2 bars/dot plot, Tab 3 diurnal/timeseries/episodes plus both custom canvas matrices, Tab 4 rose/correlation/wind/traffic/extreme, all seven Tab 5 plots, and the Tab 6 admissions charts; maps already combine hover tooltips with click popups. Three gaps fixed: (1) the expansion-rank bar had only the default tooltip — it now shows score/100 plus baseline PM2.5, traffic and nearest-station distance; (2) the policy map hover showed only code+status — it now adds city and nearest-station distance; (3) Tab 2 bar tooltips rendered embedded unit labels awkwardly ("Tidak Sehat (%): 12") — they now read "Tidak Sehat: 12%", "PM2.5: 102,1 µg/m³". The doughnut tooltip now also repeats the share percentage. Tooltips stay hover/tap-only; every value remains available in tables, legends, aria-labels and sr-only alternatives so pointer tooltips are never the only access path.

### Health indicator control inside a container — 13 November 2026

User direction: any added filter or selection control must sit inside a visible container, not float on the page background. The Tab 5 `Indikator kesehatan` selector now shares a card container with its orientation copy: `.health-toolbar` adopts the panel tokens (`--surface` background, `--border`, 14px radius, `--shadow`) with 14px/20px padding, keeping the flex row on desktop and the stacked layout on phones. This is the visual convention for future tab-level controls; controls already inside panels or the shared filter host are unchanged.

### Age comparison follows the selected period again — 13 November 2026

User rejection: a fixed calendar-2024 age baseline "does not make sense" because every other Tab 5 panel responds to the selected dates in the global filter; they explicitly asked to restore their teammate's method from commit 734acd1. Restored `features/health/age-comparison.ts`, `age-comparison-chart.ts` and `tests/health-age-comparison.test.ts` from that commit: each age's baseline is its mean over all selected dates (≥30 paired days per facility, positive baselines, dates without exposure kept in the baseline), selected pairs are split into five within-facility relative exposure quintiles P1–P5, and the chart shows the equal-facility average percent change for under-5 and over-60 respiratory admissions only, independent of the indicator selector. Panel title returns to `Perubahan Admisi Balita & Lansia`. The fixed-2024 AgeContrast computation is removed from insights/types/view with its case-study assertions; the 12 November "Period-baseline comparison of under-5 and over-60 admissions" entry again describes live behavior, and the case-study alignment entry's fixed-2024 age instruction is superseded. Lag, dose quintiles, episode and strain panels are unchanged.

### Loading consolidated into the opening screen — 13 November 2026

User feedback: per-tab "Memuat…" states duplicated the opening loading screen. Applying the collaborator's loader-cache pattern from commit 5eef89b (`let cached` in the health loader) across the app: compliance gains the same module cache; network_rank has an exported `preloadNetwork`; and `main.ts` now warms `loadDashboard`, `loadCompliance`, `loadHealthEvidence`, `loadPolicy` and `preloadNetwork` together under the opening screen (`Promise.allSettled`, dashboard export remains critical, the others best-effort so one missing file cannot block the overview). Warm caches resolve within a microtask on mount, so no tab paints its own loader on first or repeat visits. Tab 3/4 hourly shards (24 MB total) stay on demand by design — only selected stations/QC load, max four concurrent — but `filtered-analysis` now keeps a bounded LRU (6 entries) of worker results keyed by request, so revisits with unchanged filters render synchronously without a worker round-trip. The doughnut animation test now proves visible motion by requiring distinct pixel counts across `running` frames (the rotation settles alpha coverage downward, so a direction-agnostic check is the robust one under the shifted boot timing).
