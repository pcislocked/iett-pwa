# Changelog

All notable changes to iett-pwa are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.21] - 2026-05-23

### Added
- Added display of secondary "İETT Kaynak" timestamp on StopPage.
- Added InfoModal detailing why two different timestamps are shown.
- Extracted all polling intervals to a global, environment-configurable config file (`src/config/polling.ts`).

### Fixed
- Fixed critical bug where navigating between stops/routes showed stale cached data (polling keys added to usePolling).
- Fixed potential UI crash by validating the format of `X-IETT-Updated-At` date strings in API client.
- Added backdrop-click dismissal for the secondary timestamp InfoModal.
- Updated location consent and privacy copy with KVKK link pointing to pcislocked.net/kvkk.
- Fixed React Hook rules-of-hooks violation in useFleet.

---

## [0.3.20] - 2026-05-23

### Fixed
- Fixed critical bug where the dropdown omitted the opposite direction for routes with asymmetric metadata (like `14M`).
- Fixed dropdown spam showing multiple duplicates of the same direction with zero stops. Dropdown variants are now strictly generated from actual route variants present in the live API stops list.
- Fixed fallback parsing logic to successfully derive missing opposite directions (e.g., automatically deriving "KADIKÖY > YENİ CAMİİ" from the primary "YENİ CAMİİ > KADIKÖY" metadata).
- Removed redundant direction chip on the StopPage arrivals list since the direction is already shown under the title.

---

## [0.3.19] - 2026-05-23

### Added
- Added robust sub-route variant dropdown selection to both Map and Stops tabs. Map and stops lists now correctly reflect the active route variant.

### Fixed
- Fixed direction label parsing bugs for variants missing strict 'G'/'D' suffix.
- Fixed performance issue with rendering schedule footnotes; lookup is now O(1) instead of `variants × metadata`.
- Increased map stop marker robustness using `sequence` identifiers and fixed potential screen-reader accessibility issues.

### Release Notes
- App version bumped to `0.3.19` to stay synchronized with `iett-middle`.

---

## [0.3.18] - 2026-05-22

### Added
- Implemented dynamic footnotes and descriptive direction tabs for yan seferler (route variants) on the Route Page.

### Fixed
- Stabilized direction pill labels by prioritizing base variants (`_D0` / `_G0`) and deducing destination names securely.
- Deduplicated bus tooltips for multiple vehicles waiting at the same stop sequence.
- Migrated legacy `URL.createObjectURL` mock overrides to a robust `try/finally` block to prevent test bleeding.

### Tests
- Added page-level test coverage for `RoutePage` footnote numbering, mock handling, and tab state.
- Enhanced test reliability by enforcing `refresh: vi.fn()` parity on hooks and explicitly narrowing unknown types.

### Changed
- App version bumped to `0.3.18` to stay synchronized with `iett-middle`.

### Release Notes
- Released as `v0.3.18`.

---

## [0.3.17] - 2026-04-20

### Fixed
- ARAC overlay now uses manual captcha/session flow only; auto-solve action paths were removed.
- Mission time fields are rendered as localized date-time strings instead of raw Unix millisecond values.

### Tests
- Added manual-flow edge-case coverage for ARAC overlay (reconnect, refresh captcha, missing captcha ID).
- Expanded API client tests for ARAC session-header propagation and updated manual-only behavior.

### Changed
- App version bumped to `0.3.17` to stay synchronized with `iett-middle`.

### Release Notes
- Released as `v0.3.17`.

---

## [0.3.16] - 2026-04-20

### Fixed
- Map freshness parsing now treats timezone-less ISO timestamps as UTC before relative age calculation, preventing false "hours ago" drift on fresh data.
- ARAC overlay auto-solve now runs a single attempt with fewer OCR candidates to reduce backend CPU pressure.

### Tests
- Updated ARAC overlay auto-solve expectations to match the new single-attempt behavior.

### Changed
- App version bumped to `0.3.16` to stay synchronized with `iett-middle`.

### Release Notes
- Released as `v0.3.16`.

---

## [0.3.15] - 2026-04-20

### Changed
- Docker publish workflow now runs only for version tags (`v*`) instead of every `master` push.
- GHCR publish pipeline now uses split native builds (`linux/amd64` and `linux/arm64`) and merges them into a multi-arch manifest, reducing emulation overhead.
- App version bumped to `0.3.15` to stay synchronized with `iett-middle`.

### Release Notes
- Released as `v0.3.15`.

---

## [0.3.11] - 2026-04-19

### Changed
- Route-level page lazy loading added in `App.tsx` so non-home screens load on demand.
- Vite build now uses explicit manual vendor chunking for React/router, Leaflet, and motion dependencies to improve browser cache reuse.
- Docker build installs with `npm ci --omit=optional --no-audit --no-fund` to reduce build overhead.

### Fixed
- README Docker section now reflects the existing multi-stage Dockerfile workflow.

### Release Notes
- Released as `v0.3.11`.

---

## [0.3.10] - 2026-04-19

### Added
- On-demand ARAC bus detail flow from map and stop contexts (`Daha Fazla Detay (ARAC)`).
- New full-screen ARAC overlay route (`/arac/bus/:kapino`) with captcha/session bootstrap and mission rendering.
- ARAC client/session helper coverage expansions.

### Fixed
- Auto-solve flow now stops immediately after unmount between captcha fetch and solve request.
- Captcha manual input now includes an accessibility label for assistive technologies.

### Changed
- App version bumped to `0.3.10`.
- README version badge/link updated to `v0.3.10`.

---

## [0.3.9] - 2026-04-16

### Added
- Shared route ticker data/clock hooks to dedupe route-level polling and keep card timers aligned.
- Regression tests for shared ticker clock alignment, route ticker data caching, and route direction label normalization.

### Fixed
- Favorites/home pinned-stop refresh behavior now avoids duplicate background fetches and stale row updates.
- Route and stop pages now share stabilized ticker behavior and tighter refresh ownership rules.

### Changed
- App version bumped to `0.3.9`.
- README version badge/link updated to `v0.3.9`.

---

## [0.3.8] – 2026-04-07

### Fixed
- Home title bar text sanitized to `İETT Canlı`
- App update checker now applies progressive cooldown/backoff when version
  manifest fetch fails, preventing repeated hammering during outages

### Changed
- PWA manifest metadata normalized with Turkish strings (`name`, `short_name`,
  `description`)
- App version bumped to `0.3.8`
- README version badge/link updated to `v0.3.8`

---

## [0.3.7] – 2026-03-15

### Fixed
- Home startup geolocation flow hardened for installed/mobile PWA behavior:
  permissions-state check, two-stage position attempt (fresh then cached
  fallback), and watchdog timeout to avoid stuck "Konum alınıyor" state
- ETA color reliability tightened so imminent arrivals (e.g. `1 dk`) are
  consistently red across views; explicit class mapping added with regression
  coverage
- PWA update detection and cache invalidation hardened:
  explicit SW registration with `updateViaCache: 'none'`, SW update check
  before version compare, and forced reload when deployed version changes
- `version.json` update path hardened against cache staleness:
  fetched via `BASE_URL` with cache-busting query; Workbox route now matches
  by `url.pathname` and serves `version.json` as `NetworkOnly`

### Changed
- App version bumped to `0.3.7`

---

## [0.3.6] – 2026-03-15

### Added
- New hook test suites for `usePolling`, `useFavorites`, and `useUserPrefs`
  (+39 tests overall; suite total now 109)

### Fixed
- `usePolling` hardened against stale/out-of-order response writes and
  setState-after-unmount via mount guard + monotonic fetch-id logic
- API request timeout support now includes browser-safe fallback:
  `AbortSignal.timeout()` when available, otherwise
  `AbortController + setTimeout`
- `api.fleet.refresh()` now uses the same timeout and non-2xx error handling
  wrapper as other API methods
- Corrupted/mojibake comments cleaned in `App.tsx` for readability

### Changed
- App version bumped to `0.3.6`; About section version badge follows this via
  `__APP_VERSION__` injected from `package.json`

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
