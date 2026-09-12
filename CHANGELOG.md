# Changelog

All notable changes to iett-pwa are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
