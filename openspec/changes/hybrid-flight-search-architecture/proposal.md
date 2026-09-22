## Why

Flight scrapers (e.g. Playwright / Google Flights) can be slow (10-30s) or subject to rate-limiting/timeouts, while users demand instant feedback when querying flight routes. By introducing a hybrid search architecture, BipFly can instantly return cached historical price trends via the Aviasales / Travelpayouts Data API (30/60/120 days) while querying live scraped prices in parallel, ensuring immediate UI responsiveness, affiliate revenue attribution (`marker=780599`), and resilient degradation if the live scraper encounters an error.

## What Changes

- Add typed DTO interfaces in `src/types/flight.ts` (`FlightPricePoint`, `LiveFlightResult`, `HybridFlightResponse`).
- Implement the Aviasales Data API client in `src/services/aviasalesDataService.ts` with Next.js revalidation cache (`revalidate: 3600`) and graceful error handling.
- Create an orchestrating Server Action in `src/app/actions/getHybridFlightData.ts` executing Aviasales and Playwright scraper queries concurrently with `Promise.allSettled`.
- Append the affiliate marker (`marker=780599`) to partner and booking deep links.
- Gracefully fall back to historical price trends when the live scraper fails or times out without breaking page rendering or throwing unhandled exceptions.
- Provide a reusable dashboard UI pattern showing immediate historical chart/trends alongside a skeleton loader for the live flight price.

## Capabilities

### New Capabilities
- `hybrid-flight-search`: Dual-source flight query architecture combining cached historical API data with live scraper execution, returning unified DTOs and resilient fallbacks.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Code**: `src/types/flight.ts`, `src/services/aviasalesDataService.ts`, `src/app/actions/getHybridFlightData.ts`, and relevant dashboard/search UI components.
- **Dependencies & Environment**: Requires `TRAVELPAYOUTS_API_TOKEN` and `TRAVELPAYOUTS_MARKER` (default `780599`) in `.env.local` / environment variables.
- **External APIs**: Travelpayouts Data API (`https://api.travelpayouts.com/v2/prices/latest` or `/v1/prices/cheap`).
