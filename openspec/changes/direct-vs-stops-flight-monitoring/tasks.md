## 1. Database & Types

- [x] 1.1 Update `src/lib/types.ts` to add `onlyDirect?: boolean` to `MonitoredRoute` and `lowestDirectPrice?: number | null`, `directAirline?: string | null`, `lowestStopPrice?: number | null`, `stopAirline?: string | null`, `stopCount?: number | null` to `FlightHistoryEntry`.
- [x] 1.2 Update `src/lib/db.ts` to add safe `ALTER TABLE` migrations for `monitored_routes.only_direct` and `flight_history` direct/stop columns, and update CRUD queries.

## 2. Scanner & Alerting Logic

- [x] 2.1 Update `src/lib/scanner.ts` to separate search results into `bestDirect` and `bestWithStops`, persist them in `recordFlightHistory`, and evaluate target price against `route.onlyDirect`.
- [x] 2.2 Update `src/app/api/routes/route.ts` to accept and return `onlyDirect`.

## 3. UI Components & Internationalization

- [x] 3.1 Update `src/lib/i18n/dictionaries/` (`en.ts`, `pt.ts`, `types.ts`) with translation keys for flight preferences and disclaimers.
- [x] 3.2 Update `src/components/RouteModal.tsx` to include the flight preference selector with the warning disclaimer.
- [x] 3.3 Update `src/app/page.tsx` (Dashboard Live Route Monitor table) to show the primary price, stop badges, and secondary direct flight price when available.
- [x] 3.4 Update `src/components/FlightSearchResultsDrawer.tsx` to highlight best direct flight vs lowest connecting flight.

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` and verify clean type build.
- [x] 4.2 Test creating and editing a route with `onlyDirect` and verify UI display.
