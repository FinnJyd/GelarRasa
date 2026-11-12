# PRANA design system

Updated 11 November 2026 (WIB). This is the active design contract for the dashboard. Implementation history and previous decisions remain in [CHANGELOG.md](CHANGELOG.md). Read it with [AGENTS.md](AGENTS.md).

### Committee dataset policy — 11 November 2026

User-directed correction: accept the committee-provided dataset as the analytical source without repeatedly qualifying it as synthetic or requiring synthetic-data badges. This supersedes synthetic-label requirements elsewhere in this document; historical descriptions remain as records. The dataset's origin does not block analysis. Accurate source attribution, anonymous hospital identities, actual data-quality checks, and evidence-based interpretation still apply. This policy update does not change frontend code, raw data, calculations, or exports.

## 1. Product direction

PRANA is a visual workspace for understanding monitored air quality and its health context. Lead with charts, maps, and readable indicators. Let a reader recognize composition, extremes, and location before reading an explanation.

The interface should feel clear, confident, and alive: considered typography, generous plot area, purposeful animation, and consistent controls. Keep the clean warm-light and ocean-dark identity. A clean design must not become a page of explanatory paragraphs or a static collection of numbers.

The current implementation scope is **Ikhtisar Nasional**, **Dampak Kesehatan**, and their shared shell. Other analytical tabs retain honest unavailable states until their calculations exist. Do not manufacture results to make the dashboard look complete.

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
- Exposure aggregation accepts finite nonnegative `*_ug_m3` readings with selected QC, excludes every occurrence of duplicated start timestamps, averages readings inside each recorded calendar-hour bin, then averages at least 18 distinct eligible hourly bins per day. Round exported concentrations to two decimals. Do not impute missing dates or translate clock offsets by assumption. Three logger-ppm stations remain unavailable for paired analysis until conversion is established; their health summaries remain selectable. This health-specific export does not change or validate the overview notebook's different aggregation/conversion behavior.
- Lag k pairs exposure on date t−k with outcome on t at each mapped facility, including available exposure before the selected outcome window. Pearson requires at least 30 pairs and nonzero variance in both series. Display the equal-weight mean of eligible facility correlations at each lag, on a fixed −1 to 1 axis; tooltips/tables expose eligible facilities and pairs. Missing dates are never compressed. The exposure–outcome chart uses five equal-width intervals spanning the available same-day concentrations, omits empty bins, and displays mean cases per paired facility-day against actual mean concentration in each interval. It is descriptive, with facility-size/seasonal confounding acknowledged; it is not a fitted risk or causal model. No adjusted model, confidence interval, or event-study result is claimed.
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

<<<<<<< HEAD
=======
### Pola Waktu dan Faktor Pemicu — 12 November 2026

User-requested implementation replaces the Tab 3 (Pola Waktu) and Tab 4 (Faktor Pemicu) placeholders with dedicated strict TypeScript feature modules, full Chart.js visualizations, and reproducible Python data pipelines.

- **Tab 3: Pola Waktu (`/dashboard/pola-waktu`)**:
  - `scripts/export-temporal.py` generates `tab3_temporal.json` in both `dataset/dashboard/` and `dashboard/data/`.
  - Four core analytical sections: (1) Profil Diurnal 24 Jam dengan rentang interkuartil P25–P75 dan mode overlay komparasi musim karhutla (Agu–Okt) vs bulan lainnya; (2) Heatmap matriks Hari × Jam (Senin–Minggu × 00–23 WIB) berbasis kanvas 2D dengan stasiun default `AQMS-KTG-01`; (3) Deret waktu PM2.5 harian stasiun hotspot karhutla (`KTG-01`, `KTG-02`, `JMB-01`, `JMB-02`, `PKN-01`, `PKU-01`, `STG-01`) dengan garis batas baku mutu PP 22/2021 (55 µg/m³ harian dan 15 µg/m³ tahunan); (4) Analisis episode ekstrem dengan algoritma penggabungan jeda 1 hari (kriteria: ≥18 jam valid/hari, konsentrasi >55 µg/m³).
  - Filter mandiri per tab dalam accordion terlipat secara default sesuai kontrak desain.

- **Tab 4: Faktor Pemicu (`/dashboard/faktor-pemicu`)**:
  - `scripts/export-drivers.py` generates `tab4_drivers.json` in both `dataset/dashboard/` and `dashboard/data/`.
  - Lima komponen visual: (1) Mawar Polusi (Pollution Rose) 16 sektor arah angin berbasis Chart.js `polarArea` dalam layout fixed small-multiples (`AQMS-KTG-01` hotspot karhutla, `AQMS-JKT-01` koridor perkotaan/trafik, `AQMS-KTB-01` latar bersih); (2) Matriks korelasi peringkat Spearman 6 polutan × 3 parameter cuaca (suhu, kelembapan, kecepatan angin) pada kanvas 2D dengan selektor stasiun dan toggle musim; (3) Binned plot dispersi kecepatan angin vs median PM2.5 per zonasi; (4) Scatter plot intensitas lalu lintas per jam vs gas NO2 & CO untuk 27 stasiun; (5) Komparasi jam ekstrem (>P95 = 109.8 µg/m³) vs jam normal yang membuktikan 96.4% jam ekstrem terkonsentrasi pada musim karhutla dan disertai stagnasi angin.

>>>>>>> f6471f0 (Added Tab 2 & 3 + Fixed Project Directory)
Implementation references: [Vite server options](https://vite.dev/config/server-options), [Vite build options](https://vite.dev/config/build-options), [Tailwind's Vite integration](https://tailwindcss.com/docs/installation/using-vite), and [opting out of Preflight](https://tailwindcss.com/docs/preflight).
