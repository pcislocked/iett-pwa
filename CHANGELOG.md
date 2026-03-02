# Changelog

All notable changes to iett-pwa are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.1] – 2026-03-02

### Added
- **MapPage** — tap a bus marker to show detail card with route polyline overlay
  (`GET /v1/fleet/{kapino}/detail`); polyline skipped for inactive buses
- **Home — Nearby stops** show live arrivals via `PinnedStopRow` with distance
  badge; `direction` prop added to `PinnedStopRow` to skip the redundant
  `stops.detail()` fetch when direction is already known (eliminates burst of
  up to 5 extra requests per page load)
- `api.fleet.detail(kapino)` client function for the new backend endpoint
- `api.fleet.detail` test coverage in `src/api/__tests__/client.test.ts`

### Fixed
- Service worker: `hasReloadedForSWUpdate` guard prevents multiple rapid
  reloads when `controllerchange` fires more than once during SW activation
- `route_stops.sort()` now spreads into a copy (`[...route_stops]`) before
  sorting to avoid mutating React state
- Coordinate filter uses `Number.isFinite()` instead of truthiness so that
  stops at coordinate `0` are not incorrectly filtered out
- Bus detail close button has `aria-label` + `title` for accessibility

### Chore
- `coverage/` added to `.gitignore`

---

## [0.3.0] – 2026-03-02

### Added
- Full AMOLED UI redesign (v0.3 design system)
- **MapPage** — fleet map with bus markers, trail polylines, stop clusters
- **`BusDetail`** model: `resolved_route_code`, `route_is_live`, `route_stops`,
  `direction_letter`, `stop_sequence`
- **Inactive bus badge** — `Son: X` dim badge when bus has not reported
  recently; route polyline suppressed for inactive buses

---

## [0.2.2] – 2026-03-01

### Fixed
- **BusDetailSheet**: speed unit label corrected from `km/s` to `km/h`

---

## [0.2.1] – 2026-03-02

### Added
- **`Amenities` interface** in `client.ts` — mirrors iett-middle v0.2.0 canonical model
- **`Arrival` interface** extended: `lat`, `lon`, `speed_kmh`, `last_seen_ts`, `amenities`
- **`AmenityIcons` component** — renders USB/WiFi/Klima/Engelli icons with present/absent (strikethrough) styling
- **`BusDetailSheet`** — 4-column info strip (ETA · Mesafe · Hız · Plaka); prefers live `arrival.lat/lon` from ntcapi ybs over fleet-store position

---

## [0.1.7] – 2026-03-01

### Added
- **StopPage** – split-tap arrival rows: tap route pill to expand, tap anywhere else for bus detail
- **BusDetailSheet** – bottom sheet popup showing bus position on mini-map, road distance, ETA to stop, kapino · plate label

---

## [0.1.4] – 2026-02-28

### Fixed
- **BUG-14** (backend) – Route stop list (`/v1/routes/{hat_kodu}/stops`) now
  returns data instead of 502. Coordinates surface in the stops overlay once
  the backend stop index has finished loading at startup.

### Changed
- Vitest config imports `defineConfig` from `vitest/config` instead of `vite`
  to fix the TypeScript error on the `test` field in `vite.config.ts`.

---

## [0.1.3]— 2026-02-28

### Fixed
- **BUG-12** — Search result badges now display real domain identifiers in a monospace badge: stop results show `dcode`, route results show `hat_kodu`, and numeric-code direct-jump results show `#dcode`. Previously the badge always showed a static type label ("Durak" / "Hat").
- **BUG-13** — Arrival row second line on StopPage now shows `kapino · plate` when available. The redundant `eta_raw` duplicate that appeared alongside the `<EtaChip>` has been removed. Backend enrichment switched from a route-code-based fleet scan to a direct `kapino → plate` lookup in the in-memory fleet store (`get_plate_by_kapino`).

---

## [0.1.2] — 2026-02-28

### Fixed
- **BUG-09** — Searching by numeric stop code (dcode) now works. `SearchBar` detects all-digit queries ≥ 4 characters, skips the API, and injects a direct "Durak #XXXXXX sayfasına git" result that navigates straight to `/stops/{dcode}`.
- **BUG-10** — Direction pill labels on the route timetable page are now short terminal names. `direction_name` is split on ` - ` and only the first terminal is shown. The opposite direction is derived from the same metadata variant (via `fullNameByDir` to avoid inconsistency). Hardcoded `Gidiş`/`Dönüş` fallback now only fires when there is no metadata at all.
- **BUG-11** — Fleet map fixes for mobile: `100vh` → `100dvh` (dynamic viewport height accounts for collapsible browser chrome), `overflow-hidden` added to wrapper to isolate scroll context, `touchAction: 'none'` on `MapContainer` prevents Leaflet touch events from leaking to the page scroll.

---

## [0.1.1] — 2026-02-28

### Added
- **BUG-02** — Live bus position markers on the StopPage map. Selecting a route pill fetches all buses on that route and displays them as green dots; markers refresh every 15 s. Tapping a marker shows route name, ETA, and plate/kapino. A hint overlay ("Otobüsleri görmek için bir hat seç") is shown when no route is selected.
- **BUG-03** — StopPage split-screen layout: map occupies the top ~40 % of the viewport, compact scrollable arrivals list below. No more toggle between map and arrivals.
- **BUG-04** — Fleet map (`/map`) is now reachable from the bottom navigation bar as a new **Harita** tab.

### Fixed
- **BUG-01** — Nearby stop map popup redesigned: direction badge, distance pill, route chips, and a "Varış Saatleri" link that uses React Router `<Link>` for client-side navigation (no more full reload).
- **BUG-05** — Stops / schedule / announcements tabs on RoutePage no longer get stuck in a skeleton/loading state when the API returns an error. An `ErrorRetry` component is shown instead with a "Tekrar Dene" button.
- **BUG-06** — Search dropdown on the home page was clipped by `overflow-hidden` on the hero container. Removed the clip so results are fully visible.
- **BUG-07** — Direction selector on the route schedule tab now shows real destination names instead of generic "Gidiş/Dönüş" labels. Replaced native `<select>` with a pill-style toggle consistent with the rest of the UI.
- **BUG-08** — Removed the unreliable `speed` field from fleet bus popups, which was always zero or stale.

---

## [0.1.0] — 2026-02-27

Initial public release.

- React PWA for Istanbul IETT bus tracking (official-app-quality screens)
- Test harness complete: 175 tests (108 middle + 37 hacs + 30 pwa)
