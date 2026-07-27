# Changelog

All notable changes to iett-pwa are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.4.1] - 2026-07-28

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
