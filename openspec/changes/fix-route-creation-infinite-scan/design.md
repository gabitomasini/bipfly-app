## Context

Currently, monitored routes are created via `POST /api/routes`. The endpoint starts an unawaited background task `scanRoute(id).catch(...)`. Simultaneously, the client receives the 201 response and calls `scanSingleRoute(id)`, which sets `isScanning = true` and invokes `POST /api/search` with `{ routeId }`.

Under the hood, `scanRoute` uses `withBrowserLock` to ensure only one Playwright Chromium instance runs at a time. Because both background and foreground scans execute concurrently, the second scan queues behind the first. If both take 25-35s, the client waits up to 70+ seconds. Furthermore, `fetch('/api/search')` in `ScanningContext.tsx` lacks timeout and abort controls, and `withBrowserLock` lacks watchdog timers, leading to deadlocks or infinite UI loading states if Chromium hangs.

## Goals / Non-Goals

**Goals:**
- Eliminate duplicate scraper runs when a route is created or manually scanned.
- Deduplicate concurrent scans for the same `routeId` using an in-memory promise map.
- Make `withBrowserLock` fault-tolerant with guaranteed unlock and a hard 40-second timeout.
- Equip client-side `scanSingleRoute` with a 35-second `AbortController` timeout to prevent endless spinning.
- Provide clear, non-blocking UI status on newly added routes without freezing user interaction.
- Harden Google Flights scraper DOM extraction to prevent premature empty results.

**Non-Goals:**
- Replacing Playwright with an entirely new third-party scraping vendor.
- Re-architecting the database storage or Turso cloud configuration.
- Changing notification delivery channels (Resend / NTFY).

## Decisions

### 1. In-Flight Scan Promise Cache in `scanner.ts`
- **Decision**: Maintain a `Map<number, Promise<ScanResult>>` (`inFlightScans`) keyed by `routeId`. When `scanRoute(id)` is called, if a promise is already active for `id`, return that existing promise instead of queueing another scraper execution. Once settled (success or failure), delete the key from the map.
- **Alternative considered**: Queue in SQLite or Redis. Dismissed because the app is a lightweight Next.js runtime where a simple in-memory map across route handlers handles immediate duplicate calls with zero overhead.

### 2. Streamlined Route Creation Flow (Single Trigger)
- **Decision**: On route creation, let the client trigger the scan via `scanSingleRoute(id)` (or let the server trigger it and have the client poll). To ensure responsive UI feedback with the drawer and toast, `POST /api/routes` will NOT fire a separate background `scanRoute(id)`. Instead, route creation only persists to the database and responds immediately. The client then invokes `scanSingleRoute(id)`, avoiding any race condition.
- **Alternative considered**: Server fires background scan and client polls. While workable, `scanSingleRoute` already provides rich feedback (drawer, toast, countdown timer). Removing the redundant server background trigger immediately halves execution load and eliminates mutex contention.

### 3. Fail-Safe Mutex with Watchdog Timeout in `google-flights-scraper.ts`
- **Decision**: Refactor `withBrowserLock`:
  ```ts
  let browserLock: Promise<void> = Promise.resolve();
  async function withBrowserLock<T>(fn: () => Promise<T>, timeoutMs = 40000): Promise<T> { ... }
  ```
  Ensure `releaseLock` is called in a `finally` block regardless of whether `previousLock` succeeded or rejected (using `previousLock.catch(() => {})`).
  Wrap `fn()` in a `Promise.race` with a 40s timeout that terminates the browser process if exceeded.
- **Alternative considered**: Keep mutex without timeout. Dismissed because a hanging browser locks the scraper for all users indefinitely.

### 4. Client-Side AbortSignal & Graceful Recovery in `ScanningContext.tsx`
- **Decision**: In `scanSingleRoute`, attach an `AbortController` with a 35s timeout to `fetch('/api/search')`. If aborted:
  - Set `isScanning = false`.
  - Show a friendly toast: "A busca inicial está demorando mais que o esperado. Ela continuará sendo processada em segundo plano."
  - Trigger refresh callbacks to update route state from the database.
- **Alternative considered**: Infinite fetch wait. Dismissed because users interpret any wait over 30s as a broken or frozen application.

### 5. Resilient Scraper DOM Waiting
- **Decision**: Increase `waitForFunction` tolerance and check for flight cards or loading skeletons with a fallback retry before declaring `Nenhum voo encontrado`. Avoid triggering sort button clicks if cards are already ordered or if clicking causes a destructive reload of flight cards.

## Risks / Trade-offs

- **[Risk] Scraper takes longer than 35s on slow networks** → **Mitigation**: The client aborts gracefully without freezing the UI, while the server finishes saving the price to SQLite/Turso. A subsequent dashboard refresh or background poll will display the completed price.
- **[Risk] Memory usage if Chromium is not cleanly destroyed on timeout** → **Mitigation**: The watchdog timeout explicitly calls `browser?.close().catch(() => {})` in `finally` and kills orphan processes if needed.
