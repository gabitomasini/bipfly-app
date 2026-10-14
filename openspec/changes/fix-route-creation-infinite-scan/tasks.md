## 1. Mutex Hardening and In-Flight Scan Deduplication

- [x] 1.1 Refactor `withBrowserLock` in `src/lib/scrapers/google-flights-scraper.ts` to guarantee lock release across all error conditions and enforce a 40-second watchdog timeout that closes the browser context. Verify by running a simulated scraper timeout with `npx tsx`.
- [x] 1.2 Implement in-flight scan promise caching (`inFlightScans`) in `src/lib/scanner.ts` to deduplicate concurrent scans for the same `routeId`. Verify by calling `scanRoute` concurrently for the same route and confirming only one scraper instance executes.
- [x] 1.3 Harden Google Flights scraper DOM waiting and card detection in `src/lib/scrapers/google-flights-scraper.ts` to prevent premature empty results when Google Flights is rendering cards. Verify with live route extraction.

## 2. Eliminate Double-Triggering on Route Creation

- [x] 2.1 Remove the unawaited background `scanRoute(id)` call from `POST /api/routes` in `src/app/api/routes/route.ts` so route creation responds instantly (< 500ms) without competing with the client search action. Verify route creation latency in `POST /api/routes`.
- [x] 2.2 Standardize immediate scan triggering in `src/components/RouteModal.tsx` and `src/components/auth/AuthModal.tsx` so the modal dismisses immediately and invokes `scanSingleRoute` without unhandled rejections. Verify modal close behavior.

## 3. Client Timeout and Non-blocking State Recovery

- [x] 3.1 Add a 35-second `AbortController` timeout to `fetch('/api/search')` in `src/context/ScanningContext.tsx` with automatic `isScanning = false` cleanup and an informative toast message. Verify simulated slow requests do not hang the scanning indicator.
- [x] 3.2 Update `src/app/page.tsx` and `src/app/routes/page.tsx` to display an active scanning badge ("Consultando tarifas...") on the newly created route row while keeping the dashboard fully interactive. Verify UI responsiveness during active scans.

## 4. End-to-End Verification

- [x] 4.1 Perform end-to-end verification of route creation and scanning: verify that adding a new route creates the route instantly, starts a single controlled scan, finishes within expected limits without hanging indefinitely, and updates the latest price and dashboard status.
