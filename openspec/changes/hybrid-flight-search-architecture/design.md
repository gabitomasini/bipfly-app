## Context

See proposal.md. The current system relies on Playwright-based scraping for Google Flights (`src/lib/scrapers/google-flights-scraper.ts` and `src/lib/scanner.ts`). Scraping can take several seconds and is susceptible to external layout changes or network timeouts. To make user-initiated searches feel instantaneous and provide rich pricing context, we introduce an integration with Aviasales / Travelpayouts Data API alongside our existing live scraper in an asynchronous hybrid architecture.

## Goals / Non-Goals

**Goals:**
- Provide typed DTOs in `src/types/flight.ts` (`FlightPricePoint`, `LiveFlightResult`, `HybridFlightResponse`).
- Provide an Aviasales Data API service in `src/services/aviasalesDataService.ts` with 1-hour cache revalidation (`next: { revalidate: 3600 }`) and token-based authentication.
- Create an orchestrating Server Action `getHybridFlightData` in `src/app/actions/getHybridFlightData.ts` executing parallel promises with `Promise.allSettled`.
- Automatically append affiliate tracking parameter `marker=780599` to partner booking deep links.
- Ensure resilient failure isolation: failures in scraping do not drop historical trends, and failures in historical trends do not block live pricing.
- Provide a clean React UI pattern with skeleton loading for progressive rendering.

**Non-Goals:**
- Completely replacing the Google Flights Playwright scraper.
- Writing full database persistence for ad-hoc hybrid searches (persistence is handled separately by monitored route cron scanners).

## Decisions

### 1. DTO Separation and Typing
- **Location**: `src/types/flight.ts`.
- **Structure**:
  - `FlightPricePoint`: `{ date: string, price: number, currency: string }`
  - `LiveFlightResult`: `{ price: number, currency: string, airline: string, flightNumber: string, departureAt: string, deepLink: string }`
  - `HybridFlightResponse`: `{ liveData: LiveFlightResult | null, historyData: FlightPricePoint[], isLiveLoading?: boolean }`
- **Rationale**: Isolates domain contracts from third-party vendor schemas (Aviasales JSON vs Google Flights DOM structure), ensuring clean evolution.

### 2. Aviasales Data API Integration & Next.js Caching
- **Location**: `src/services/aviasalesDataService.ts`.
- **Endpoint**: `https://api.travelpayouts.com/v2/prices/latest` (with parameters `origin`, `destination`, `currency=BRL`, `period_type=year`, `page=1`, `limit=30`).
- **Authentication**: Token passed via header `x-access-token: process.env.TRAVELPAYOUTS_API_TOKEN` or query parameter `token`.
- **Caching**: Native Next.js fetch caching `fetch(url, { next: { revalidate: 3600 } })` to limit external rate limits and provide instant response times.
- **Error handling**: Catches network / parse exceptions, logs with `logger`, and returns fallback empty array `[]` rather than throwing.

### 3. Orchestrator via Server Action (`Promise.allSettled`)
- **Location**: `src/app/actions/getHybridFlightData.ts`.
- **Concurrency**: `Promise.allSettled([getAviasalesPriceHistory(...), getLiveFlightPrice(...)])`.
- **Rationale**: If Playwright scraper times out (e.g. 20s) or fails, the user still receives historical price distribution and trend analysis immediately.
- **Affiliate Tagging**: Any generated booking deep links or Aviasales deep links append `marker=780599` (or `process.env.TRAVELPAYOUTS_MARKER || "780599"`).

### 4. UI Rendering Pattern
- Provide a client component or example pattern demonstrating how to stream / display `historyData` chart while displaying a Skeleton loader for `liveData`.

## Risks / Trade-offs

- **[Risk] Scraper execution duration blocking server action response if awaited in single promise** → Mitigation: `Promise.allSettled` ensures both complete or fail cleanly without unhandled rejection; in UI, optimistic/progressive rendering handles the live result.
- **[Risk] Missing `TRAVELPAYOUTS_API_TOKEN` in development** → Mitigation: Service gracefully checks for token presence, logs a descriptive warning, and returns empty history data without breaking live search.
- **[Risk] Currency mismatch between Aviasales (BRL/USD) and Scraper** → Mitigation: DTOs explicitly capture the `currency` string and standardize on `BRL` by default.
