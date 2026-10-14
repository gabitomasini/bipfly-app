## Why

When users add a new route to monitor, the application enters an indefinite "buscando, buscando" (scanning) state that either never completes or takes inordinate amounts of time (>60-90s). This happens due to a combination of:
1. Double-triggering of the Playwright scraper: the route creation endpoint (`POST /api/routes`) fires a background scan while the frontend immediately fires a duplicate synchronous scan (`POST /api/search`).
2. Both scans serialize sequentially behind a single global Playwright mutex (`withBrowserLock`), doubling execution time (up to 70s+).
3. The mutex lacks execution timeouts and error-safety guarantees, risking deadlock if a promise rejects or hangs.
4. The client `fetch('/api/search')` lacks timeouts or abort signals, causing the UI spinner and timer to run indefinitely.

Fixing this lifecycle is critical to provide instant route creation confirmation, deterministic scan timeouts, deduplicated in-flight scans, and graceful asynchronous UI updates.

## What Changes

- **Backend Scrape Deduplication & Concurrency**: Implement an in-flight promise cache in `src/lib/scanner.ts` so that concurrent requests for the same `routeId` share the same scan promise instead of queueing sequentially.
- **Mutex Reliability & Timeouts**: Refactor `withBrowserLock` in `src/lib/scrapers/google-flights-scraper.ts` to guarantee lock release in all failure scenarios and enforce a hard execution timeout (40s max) with browser process cleanup.
- **Eliminate Double-Triggering on Route Creation**: Update `src/app/api/routes/route.ts`, `src/components/RouteModal.tsx`, and `src/components/auth/AuthModal.tsx` so route creation does not spawn redundant simultaneous scans.
- **Client-Side Timeout & AbortController**: Add a 35s timeout signal to `scanSingleRoute` in `src/context/ScanningContext.tsx`. If a scan exceeds 35s, gracefully stop the global scanning state, present an informational toast, and allow background polling to pick up the result.
- **Non-blocking Status & Polling for New Routes**: In `src/app/page.tsx` and `src/app/routes/page.tsx`, show newly created routes with an active "Consultando tarifas..." indicator and use non-blocking polling to update the row when background pricing finishes.
- **Scraper DOM Resilience**: Improve flight card detection and timeout grace periods in `scrapeGoogleFlights` to prevent premature empty results when Google Flights is slow to render.

## Capabilities

### New Capabilities
- `route-monitoring-lifecycle`: Defines the complete lifecycle of monitored route creation, price scanning execution, deduplication of concurrent scan requests, client/server timeout boundaries, and asynchronous status synchronization.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Code**:
  - `src/app/api/routes/route.ts`
  - `src/app/api/search/route.ts`
  - `src/lib/scanner.ts`
  - `src/lib/scrapers/google-flights-scraper.ts`
  - `src/context/ScanningContext.tsx`
  - `src/components/RouteModal.tsx`
  - `src/components/auth/AuthModal.tsx`
  - `src/app/page.tsx`
  - `src/app/routes/page.tsx`
- **Dependencies**: No new external dependencies required (uses built-in `AbortController`, standard Promises, and existing Playwright).
- **APIs**: Backwards-compatible; `POST /api/routes` and `POST /api/search` maintain current JSON response contracts.
