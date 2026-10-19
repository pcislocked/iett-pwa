# Changelog

All notable changes to iett-pwa are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.9.4] - 2026-10-19
### Fixed
- **Satellite Map Styling**: Fixed dark theme tile darkening inadvertently affecting the satellite view; scoped base map tile filters to `.leaflet-tiles-base`, removed container-level pane filter, and applied `contrast(1.05)` strictly to the satellite layer with no brightness reduction.
- **TileLayer Dynamic Re-mounting**: Added `key={currentUrl}` across all map-rendering pages (`StopPage`, `RoutePage`, `AracBusOverlayPage`, `NearbyPage`, `SettingsPage`) to ensure Leaflet properly cleans up and updates tile layer CSS classes on layer switches.

---

## [0.4.9.3] - 2026-10-18
### CI/CD, Quality & Test Guardrails
- **CI/CD Hardening**: Added `npm run build` verification to `.github/workflows/ci.yml` and scoped concurrency with `cancel-in-progress: true`.
- **Docker Multi-Arch Optimization**: Scoped Docker cancellation to `!startsWith(github.ref, 'refs/tags/')` so production tag releases are never aborted in flight; upgraded build caching from `mode=min` to `mode=max` across `amd64` and `arm64`.
- **i18n & Locales**: Protected `i18n.init` against duplicate initialization during HMR; added browser runtime safety against undeclared Node `process` globals; achieved 100% key parity between English and Turkish locale catalogs (11 missing keys added).
- **Test Infrastructure & Coverage**: Expanded test suite to 50 test files and 277 passing tests (+30 new tests) with leak-free test suites for `AnnouncementsPage`, `AracQueryPage`, `ShareTargetPage` (100% covered), and `useLocationManager` (95.7% covered).

---

## [0.4.9.2] - 2026-10-18
### Fixed & Accessibility Polish
- **Offline Esri Satellite Tile Caching:** Configured Workbox caching in `vite.config.ts` for Esri ArcGIS satellite tiles (`/ArcGIS/rest/services/World_Imagery/MapServer/tile/`) with opaque response caching support (`cacheableResponse: { statuses: [0, 200] }`), enabling offline map viewing.
- **Backup & Settings Satellite Sync:** Synced satellite map preference across localStorage (`map-satellite` and `iett_satellite`) and included it in the `BackupDataV2` export/import schema.
- **Dialog Accessibility (WCAG 2.1 AA):** Upgraded `RouteInfoModal` and `StopInfoModal` with focus traps, escape key listeners, `aria-modal="true"`, accessible close buttons with localized `aria-label`s, and contrast-compliant borders.
- **Unmounted Lifecycle Safety Guards:** Added `AbortController` and component mount guards across `useLocationManager`, `NearbyPage`, `AracQueryPage`, and `StopPage` to prevent memory leaks and unmounted `setState` warnings.

---

## [0.4.9.1] - 2026-10-18
### Added
- **Today's Announcement Banner on Home (`Home.tsx`):** Automatically checks official IETT announcements for today's date using `isTodayAnnouncement` (`dateUtils.ts`, supporting Turkish textual dates like `18 Ekim 2026`, numeric dates, and ISO dates) and presents them directly in the Home page announcement banner with a one-click external link to the full announcement details.
- **Toplu Ulaşım Ücret Tarifesi Menu Tab:** Relocated the Fare Tariff from the small footer link into a full, first-class quick-access tab row positioned directly above Settings in `Home.tsx` and `MenuSheet.tsx`, displaying an external link indicator (`↗`).

### Changed
- **Uniform Cyan/Blue Quick-Access Icons:** Replaced the red/pink megaphone emoji on "Duyurular & Uyarılar" with an SVG speaker/horn icon that inherits the uniform cyan/blue Metro theme accent (`var(--wp-accent)`), restoring visual consistency with all other quick-access rows.
- **Direct External Announcements Navigation:** "Duyurular & Uyarılar" in the quick-access list and global menu now opens `https://iett.istanbul/announcement/Index` directly in a new tab with an external link indicator.

### Fixed & Dependencies
- **CI & Dependabot Compatibility:** Added `@testing-library/dom` (`^10.4.1`) to `devDependencies` and synchronized `vitest`, `@vitest/coverage-v8`, and `@vitest/ui` at `4.1.11` to resolve Dependabot Arborist peer-dependency failures.
- **Test Suite Expansion:** Added comprehensive unit tests for `isTodayAnnouncement` (`src/utils/__tests__/dateUtils.test.ts`), bringing the test suite to 247 passing tests across 41 test files (100% green).

---

## [0.4.9] - 2026-10-18
### Added
- **[BUG-01] 1-Character Route Search & Adaptive Debounce:** Enabled 1-character route searching (e.g., `1`, `2`, `E`, `B`) while preserving `>= 2` characters for stop searches to avoid backend HTTP `422` errors. Added adaptive debounce (`700ms` for 1 char, `300ms` for 2–3 chars, `150ms` for 4+ chars) and instant `Enter`/submit search execution across `SearchPage`, `SearchBar`, and `MapSearchPanel`.
- **[BUG-02] ARAC Live Timebar & Timestamp Info Modal:** Fixed `parseGpsTimestamp` to support `DD-MM-YYYY HH:mm:ss` timestamps returned by `arac.iett.gov.tr`, integrated `<StopTimebar>` into `AracBusOverlayPage`, and extracted a shared `<TimestampInfoModal>` component used across both `StopPage` and `AracBusOverlayPage`.
- **[BUG-03] Ring Route Apex Detection & Naming:** Added `getVariantDisplayName` (`src/utils/variantUtils.ts`) to automatically detect circular/ring routes where start and end stops match and format their display labels as `🔄 FirstStop > ApexStop Ring` across `RoutePage` and `VariantSelect`.
- **[BUG-04] PWA Web Share Target & Smart URL Paste:** Registered OS-level `share_target` (`/share-target`) in `manifest.webmanifest` and `vite.config.ts`, added `ShareTargetPage` with `{ replace: true }` history navigation, and added `parseIettShare` paste-to-navigate support in `SearchPage` and `SearchBar` for `iett.istanbul` route/stop links.
- **[BUG-05] Official IETT Announcements & Fare Tariff Hub (`AnnouncementsPage`):** Added `/announcements` page with tabs for official `iett.istanbul` corporate announcements (with pagination and instant filter) and system-wide service alerts, plus direct links to the official IETT Fare Tariff in `AnnouncementsPage`, `MenuSheet`, and `Home`.
- **[BUG-06] Backup & Restore Schema v2:** Upgraded settings export/import to `BackupDataV2` (`iett-backup-YYYY-MM-DD.json`) capturing preferences, pinned stops, favorites, recent searches, theme/language/satellite UI state, and sanitized settings with full backward compatibility for v1 backup files.
- **[BUG-07] Turkish License Plate Formatting (`plateUtils.ts`):** Added `formatPlate`, `isPlate`, and `cleanPlate` utilities to display standardized spaced Turkish plates (`34 HO 1900`) and enable space/dash-agnostic plate searching across `StopPage`, `MapPage`, `MapBusPicker`, `MapSearchPanel`, `AracBusOverlayPage`, and `AracQueryPage`.
- **[BUG-08] Screen Wake Lock on Stop Page (`useWakeLock.ts`):** Added optional Screen Wake Lock support on `StopPage` with automatic visibility re-acquisition and a strict 30-minute safety timeout to prevent battery drain.
- **[BUG-09] Haptic Feedback (`haptics.ts`):** Added subtle vibration feedback (`triggerHaptic`) on key interactive controls with a user-configurable toggle in `SettingsPage`.

### Security & Dependencies
- Hardened `importAllData` in `useUserPrefs.ts` to validate `apiBase` URL schemes (`http:`/`https:` or same-origin relative path) and clamp `refreshInterval` to `[10, 120]` seconds.
- Validated external announcement URLs in `AnnouncementsPage.tsx` before rendering `href`.
- Bumped `i18next-http-backend` (`4.0.2`), `undici` (`7.30.0`), `source-map-js` (`1.2.2`), `postcss-selector-parser`, and `brace-expansion`.

---

## [0.4.8.1] - 2026-10-11
### Fixed
- **StopTimebar Component & Performance Isolation:** Extracted the 1-second live ticker into an isolated, memoized `<StopTimebar>` component, preventing the entire StopPage, map, and list elements from re-rendering every second.
- **Tab Inactivity Optimization:** Added `document.hidden` visibility change listening to pause the live ticker interval while the browser tab is backgrounded, conserving device battery and CPU cycles.
- **Search Dropdown & Page Localization:** Replaced hardcoded `Durak #` string with localized `t('search.stopNumber')` in `SearchBar` and `SearchPage`, and polished route layout badges to avoid duplicate hat code displays.
- **Input Normalization & Kapino RegEx:** Upper-cased user input strings before whitespace and punctuation stripping in `MapSearchPanel` and `AracQueryPage`, and tightened `isKapinoLike` regex (`^[A-Z]{1,2}-?\\d{3,5}$`) to eliminate false positive matches on road abbreviations like "E5".

### Tests
- Added dedicated test suite for `<StopTimebar>` (`StopTimebar.test.tsx`), reaching 189 passing tests across 36 test files (100% green).

---

## [0.4.8] - 2026-10-11
### Added
- **Recent Searches Click-Promotion & 25-Item Capacity:** Clicking any recent search item promotes it directly to the top (index 0) rather than only promoting on form submission. Expanded local storage history capacity to 25 items, displaying up to 15 items on SearchPage with a touch-friendly clear action.
- **Search Results Ordering & Presentation:** Enforced routes/lines first, followed by stops across both `SearchPage` and `SearchBar` dropdown.
- **Two-Liner Search Results:** Enhanced stop search results with two-liner layout displaying destination direction (`🧭 KADIKÖY`) and district fallback badges.
- **Stop Page Live Ticker & 3 Timebar Display Formats:**
  - Added dynamic 1-second live ticker keeping relative timestamps fresh without frozen lags.
  - Added 3 timebar formats in Settings: Standard / Long (`güncelleme: 4 sn önce`), Compact (`-4s`), and Emoji (`🔄 -4s / 📡 -12s`).
  - Added optional live clock displaying current time in `hh:mm:ss` format on the bottom timebar (default off).

### Fixed
- **Vehicle Autocomplete & Fuzzy Matching:** Fixed the backspace trap in `AracQueryPage` where deleting hyphens was blocked by greedy regex. Added dash- and space-agnostic fuzzy matching across local fleet and plates in `AracQueryPage` and `MapSearchPanel`.
- **Search Request Cancellation:** Added `AbortController` and cleanup in `SearchBar` to cancel in-flight requests on rapid typing and unmount, eliminating race conditions.
- **Accessibility & Touch Target Polish:** Connected `<label htmlFor>` and `<select id>` in Settings, added touch padding to clear button, and added `aria-hidden="true"` to route code badges to avoid screen reader stutter.

### Tests
- Added dedicated unit test suite for `SearchBar` and expanded coverage for `dateUtils` and `useRecentSearches`, reaching 183 passing tests across 35 test files (100% green).

---

## [0.4.6] - 2026-09-12
### Added
- Inserted visual warning boxes for stale GPS and math mismatches into the BusDetailSheet to surface upstream API anomalies clearly.
- Extended relative time thresholds: seconds are shown up to 99s, minutes up to 99m.
- (Dev) Injected 676767 stop and 31AMK route mock data to test edge-cases with GPS anomalies.

### Fixed
- Fixed Math Mismatch threshold being too aggressive for buses coming from highways (ETAs rounded down to 1 minute) and buses stuck in traffic (GPS staleness).
- Restored missing translation keys and long explanations for 	r and en locales, and cleaned up React hardcoded fallback strings.
- Restored the teleportation / Ekrem İmamoğlu helicopter joke in the Math Mismatch Warning translation.
- Repaired corrupted Kurdish (ku.json) mojibake (Ä a / â €) by encoding the invisible Braille blanks as pure ASCII escape sequences (⠀).
- Fixed UI version string not displaying the patch version by updating package.json.
- Fixed raw timestamp rendering bug in InfoModal by applying user-preferred formatting.
- Fixed route info layout to adapt to IETT's new un-parsed HTML string format.

## [0.4.5] - 2026-09-12
### Added
- Completely revamped StopPage architecture and re-implemented Map logic.
- **[BUG-04]** Added Stop and Route metadata modals (`RouteInfoModal`, `StopInfoModal`) and Google Maps directions button.
- **[BUG-05]** Added Timestamp Display Mode settings (Absolute, Relative, Both) via `useUserPrefs`.
- **[BUG-08]** Implemented Drag-to-Reorder functionality for Favorites and Pinned Stops.
- **[BUG-09]** Increased limits and enabled mixed-type ordering for Home page favorites.
- **[BUG-10]** Added 404/Not Found Empty State UI for invalid or non-existent route/stop searches.
- **[BUG-11]** Integrated Stadia Maps and ArcGIS Satellite toggle, synced map theme with app theme, and fixed GPS button icon.
- **[BUG-12]** Added Physical Math Mismatch warnings for impossible ETAs on StopPage.

### Fixed
- **[BUG-01]** Filtered internal/hidden stops from search results globally.
- **[BUG-02]** Replaced CartoDB tiles with Stadia Maps to resolve API key enforcement errors.
- **[BUG-03]** Fixed `InstallBanner` layout overlapping the AppBar and updated misleading offline text.
- **[BUG-06]** Fixed extreme zoom GUI distortion by applying a maximum font-size cap.
- **[BUG-07]** Added relative time sanity checks (capped values like 4920 hours ago).

## [0.4.4] - 2026-09-07

### Security & Dependencies
- **Security Advisory Fixes:**
  - Resolved Dependabot high-severity advisories on `fast-uri` (GHSA-5jgf-p345-68v8 / CVE-2026-75931, GHSA-c48c-v3hp-r2p2 / CVE-2026-75932) by upgrading to `3.1.7`.
  - Resolved `postcss-selector-parser` vulnerability by updating to `6.1.4`.
- **Dependency Maintenance:**
  - Updated `@humanfs/node` to `0.16.8`.
  - Updated `browserslist` to `4.28.9`.
- **Quality & Verification:**
  - Maintained 100% green test suite (171/171 Vitest tests passing).
  - 0 TypeScript errors, 0 ESLint warnings.

## [0.4.3] - 2026-08-27

### Added & Improved
- **Comprehensive Unit Testing Suite:**
  - Expanded unit test coverage using strict API schemas from `client.ts` (`BusPosition`, `Arrival`, `RouteSearchResult`, `StopSearchResult`, `RouteMetadata`, `StopDetail`).
  - Added dedicated test suites for `VariantSelect`, `MapBusPicker`, `MapSearchPanel`, `PinnedStopRow`, `PullToRefresh`, `MapTileToggle`, `InstallBanner`, `useTheme`, `useBottomBar`, `FavoritesPage`, and `PinnedManagePage`.
  - Reached 100% passing test suite (171/171 tests green across 33 test files).
- **Tooling & Dependency Updates:**
  - Updated browserslist database.
  - Resolved Dependabot dependency alerts cleanly.

## [0.4.2] - 2026-08-27

### Added & Improved
- **Route-Based Announcement Filtering on Stop Page:**
  - Synchronized stop announcement lists with active route chip filters, displaying notices for selected routes alongside system-wide notices (`GENEL`).
  - Added dynamic count badge `Duyurular (x/y)` to announcement header when route filtering is active.
  - Added single-button clickable reset banner (`💡 Diğer hatlardan Z duyuru filtreleniyor. [Filtreyi Kaldır]`) to clear active route filters on tap.
- **Vehicle Fleet Detail Overlay Refresh:**
  - Added dedicated Refresh button (`🔄`) with animated spinning state in top header bar of `AracBusOverlayPage`.
  - Enclosed scroll container with `<PullToRefresh>` for pull-down refresh capability.
- **PWA External Link Interceptor:**
  - Added global click interceptor in `App.tsx` guarding PWA standalone mode to force external links (`http://`, `https://`) to launch in native system browser (Safari/Chrome) without replacing PWA webview UI.
- **Dynamic Theme Map Tiles & Attribution:**
  - Replaced hardcoded map tile URLs with dynamic CartoDB `light_all` / `dark_all` theme selection across `StopPage`, `RoutePage`, `NearbyPage`, `SettingsPage`, and `AracBusOverlayPage`.
  - Added complete OpenStreetMap & CARTO attribution credit across all map layers.
  - Scoped touch misclick protection for attribution links to `@media (pointer: coarse)` while keeping desktop mouse links clickable.
- **Header Layout Improvement:**
  - Moved stop code (`#dcode`) badge to line 2 in StopPage header to prevent title squishing on narrow mobile screens.

### Fixed
- **Bus Detail Sheet Gesture Dismissal:**
  - Stopped pointer/touch event propagation on `BusDetailSheet` map wrapper container to prevent pinch-to-zoom or map panning gestures from accidentally triggering modal dismissal.
- **About Description Text:**
  - Removed outdated tramway references from Turkish and English locale descriptions.

---

### Added & Improved
- **Stop Page Announcements Bar:**
  - Implemented 4 distinct UI states for the announcements header: Loading (`⌛`), Error (`⚠️`), Empty (`ℹ️`), and Active (`⚠️ Duyurular (X)`).
  - Ensured empty and error states occupy a uniform non-expandable card height.
- **Max GPS Timestamp Calculation (`maxGpsTime`):**
  - Displays the newest valid bus GPS timestamp as the primary İETT timestamp on StopPage.
  - Added stale data warning (`⚠️`) for GPS updates older than 5 minutes.
  - Added explanatory note when no live buses are approaching the stop.
- **Architecture Diagram & InfoModal Animation:**
  - Added Framer Motion backdrop/scale transition animations to InfoModal.
  - Created 3-layer architecture diagram (📱 PWA -> ☁️ Middle -> 🚌 IETT) with reversed data flow arrows.
  - Included "Zorla Yenile" (Force Refresh) button.
- **Route Line/Name Layout Swap:**
  - Reordered route ticker rows on Home page / Recent Searches to display the bold route code (`14M`, `15ŞN`) on top and route description (`KAVACIK YENİ CAMİ - KADIKÖY`) below.

### Fixed
- **Vehicle Mission Notice:** Updated `futureMissionsNotice` text to accurately reflect that future mission details may occasionally be missing or incomplete due to upstream API changes.
- **KVKK & Privacy Policy:** Updated `LocationConsentModal` text and added Privacy Policy link.
- **i18n & Locales:** Synchronized Kurdish (`ku.json`), English (`en.json`), and Turkish (`tr.json`) locale files.

---

## [0.4.0] - 2026-07-26

### Added
- **ARAC Session & Auto-Captcha Integration:**
  - Re-architected `AracBusOverlayPage` to support per-vehicle isolated session storage (`arac-session-${kapino}`).
  - Added auto-submit flow using backend OCR `suggestedAnswer`, with automatic fallback to manual captcha modal.
  - Redesigned vehicle detail overlay with modern `MissionCard` layout and status indicators.
- **Strict Map Boundary Constraints:**
  - Configured `ISTANBUL_BOUNDS` (`[40.70, 28.20]` to `[41.60, 29.90]`), `maxBoundsViscosity={1.0}`, min zoom 9, max zoom 18 across all Leaflet map pages (`MapPage`, `AracBusOverlayPage`, `StopPage`, `RoutePage`, `NearbyPage`, `SettingsPage`).
  - Restricted map navigation strictly to the Istanbul metropolitan region.
- **Multi-Theming Support:** Added AMOLED Black, Dark, and Light themes configured via CSS custom variables. Added theme selection controls to SettingsPage.
- **Variant Routing & Selection:** Introduced `<VariantSelect>` dropdown component to filter live bus lists, stops, and polyline coordinates on RoutePage and live MapPage.
- **Full i18n Translation Coverage & HTML Sync:**
  - Replaced all hardcoded Turkish UI strings across components with dynamic react-i18next keys (`tr.json`/`en.json`).
  - Dynamically synchronized `<html lang="tr">` / `<html lang="en">` attribute to prevent Turkish uppercase CSS rendering bugs (`text-transform: uppercase`).

### Fixed
- **React Portal Modal Z-Index Stacking:** Rendered all modal overlays (`InfoModal`, `MenuSheet`, `LocationConsentModal`, `AracBusOverlayPage`) via `React.createPortal` to prevent z-index backdrop clipping over the app header.
- **AbortController Network Stabilization:** Attached proper AbortSignals to prevent background request accumulation, zombie bus markers, and memory leaks on rapid page navigation.
- **Test Suite & CI Stabilization:** Resolved ESLint (`--max-warnings 0`), TypeScript checking (`tsc --noEmit`), and Vitest unit tests (**136/136 tests passing 100% green**).

### Dependencies
- Merged Dependabot security updates (`fast-uri`, `postcss`, `@babel/core`, `picomatch`).

---

## [0.3.25] - 2026-05-30

### Fixed
- Fixed 'zombie buses' race condition by switching to reference-based in-flight markers in MapPage.
- Added error stack trace preservation using the 'cause' property in API client.
- Improved accessibility focus trapping on modals and dropdown closures.

---

## [0.3.23] - 2026-05-30

### Fixed
- Endpoint swap compatibility release (sync with `iett-middle` which replaced dead IETT SOAP endpoints with official Mobiett JSON endpoints).

---

## [0.3.17] - 2026-04-20

### Fixed
- ARAC overlay now uses manual captcha/session flow only; auto-solve action paths were removed.
- Mission time fields are rendered as localized date-time strings instead of raw Unix millisecond values.
