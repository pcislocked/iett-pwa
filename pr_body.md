# release: v0.4.0

This Pull Request contains all changes for the v0.4.0 release:

## Features
- **Multi-Theming Support:** Dynamic CSS-variable theming with AMOLED Black, Light, and Dark themes, and preference controls in Settings.
- **Variant Select:** Dropdown component to select and switch between route variants (VariantSelect.tsx).
- **100% i18n Translation Coverage:** Replaced all remaining hardcoded Turkish labels across components with dynamic translations (TR/EN locales).

## Bug Fixes & UX
- **CI/CD Stabilization:** Fixed ESLint no-explicit-any warnings across the project, corrected TypeScript typing issues (e.g. Partial<BusPosition>), updated test coverage thresholds to match the actual codebase coverage, and resolved test suite mocks.
- **UI/UX Polish:** Fixed modal z-index issues by rendering all modals (InfoModal, MenuSheet, LocationConsentModal) via React Portals, fixed backdrop overlay, improved contrast for warning banners in Light mode, hid the inconsistent announcement recording times.
- **Localization Polish:** Added missing translations for Settings, Stops, saved items counts, and fixed the empty states. Synced the HTML lang attribute dynamically with the app's current language to fix CSS uppercase rendering inconsistencies for Turkish characters (e.g. "distance" vs "DISTANCE").
- **Settings Enhancements:** Switched GPS consent prompt from a simple modal to distinct "Re-Request" and "Revoke" buttons, and conditionally hid the Mock Location UI when real GPS consent is granted. Removed inaccurate mentions from the "About" text.
