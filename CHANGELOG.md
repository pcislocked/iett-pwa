# Changelog

All notable changes to iett-pwa are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
