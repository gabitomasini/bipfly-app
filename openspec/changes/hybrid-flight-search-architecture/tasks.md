## 1. Type Definitions & DTOs

- [ ] 1.1 Create `src/types/flight.ts` with `FlightPricePoint`, `LiveFlightResult`, and `HybridFlightResponse` interfaces, and verify with `npx tsc --noEmit`

## 2. Aviasales Data Service

- [ ] 2.1 Implement `src/services/aviasalesDataService.ts` with Travelpayouts / Aviasales Data API fetch, 1-hour cache revalidation (`next: { revalidate: 3600 }`), and error handling
- [ ] 2.2 Add helper to attach affiliate marker `marker=780599` to partner booking / redirect links

## 3. Orchestration Server Action

- [ ] 3.1 Implement Server Action `getHybridFlightData` in `src/app/actions/getHybridFlightData.ts` using `Promise.allSettled` for concurrent live scraping and historical API calls
- [ ] 3.2 Ensure graceful fallback: if live scraper times out or fails, return `liveData: null` with valid `historyData` and server logs

## 4. UI Progressive Loading Pattern & Verification

- [ ] 4.1 Provide a React UI component / dashboard pattern demonstrating immediate historical chart rendering alongside a skeleton loader for the live flight result
- [ ] 4.2 Validate entire project build with `npx tsc --noEmit` and `npm run build`
