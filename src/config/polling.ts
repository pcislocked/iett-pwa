/**
 * Global polling intervals configuration in milliseconds.
 * Can be overridden by Vite environment variables (e.g. VITE_POLL_ARRIVALS_MS).
 */

export const POLLING = {
  ARRIVALS_MS: import.meta.env.VITE_POLL_ARRIVALS_MS ? parseInt(import.meta.env.VITE_POLL_ARRIVALS_MS, 10) : 10_000,
  FLEET_ALL_MS: import.meta.env.VITE_POLL_FLEET_ALL_MS ? parseInt(import.meta.env.VITE_POLL_FLEET_ALL_MS, 10) : 30_000,
  FLEET_SPECIFIC_MS: import.meta.env.VITE_POLL_FLEET_SPECIFIC_MS ? parseInt(import.meta.env.VITE_POLL_FLEET_SPECIFIC_MS, 10) : 15_000,
  TICKER_MS: import.meta.env.VITE_POLL_TICKER_MS ? parseInt(import.meta.env.VITE_POLL_TICKER_MS, 10) : 60_000,
  ROUTE_STOPS_MS: import.meta.env.VITE_POLL_ROUTE_STOPS_MS ? parseInt(import.meta.env.VITE_POLL_ROUTE_STOPS_MS, 10) : 300_000,
  ROUTE_SCHEDULE_MS: import.meta.env.VITE_POLL_ROUTE_SCHEDULE_MS ? parseInt(import.meta.env.VITE_POLL_ROUTE_SCHEDULE_MS, 10) : 300_000,
  ANNOUNCEMENTS_MS: import.meta.env.VITE_POLL_ANNOUNCEMENTS_MS ? parseInt(import.meta.env.VITE_POLL_ANNOUNCEMENTS_MS, 10) : 60_000,
  ROUTE_META_MS: import.meta.env.VITE_POLL_ROUTE_META_MS ? parseInt(import.meta.env.VITE_POLL_ROUTE_META_MS, 10) : 600_000,
  STOP_ROUTES_MS: import.meta.env.VITE_POLL_STOP_ROUTES_MS ? parseInt(import.meta.env.VITE_POLL_STOP_ROUTES_MS, 10) : 300_000,
  STOP_DETAIL_MS: import.meta.env.VITE_POLL_STOP_DETAIL_MS ? parseInt(import.meta.env.VITE_POLL_STOP_DETAIL_MS, 10) : 3600_000,
  GARAGES_MS: import.meta.env.VITE_POLL_GARAGES_MS ? parseInt(import.meta.env.VITE_POLL_GARAGES_MS, 10) : 3600_000,
  DEFAULT_MS: 20_000
}
