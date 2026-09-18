## Why

Users monitoring airfare often need to distinguish between direct flights and flights with layovers/stops. Currently, the scanner records only the absolute cheapest flight without categorizing flight types, meaning direct flight prices and deals cannot be specifically targeted or monitored when cheaper connecting flights exist.

## What Changes

- Add configurable flight type preference (`onlyDirect`: boolean) per monitored route in `monitored_routes`.
- Add flight preference selector with an informative warning disclaimer in `RouteModal` when creating or editing a route.
- Enhance scanner to identify both the best direct flight (`bestDirect`) and best connecting flight (`bestWithStops`) from search results.
- Record `lowest_direct_price`, `direct_airline`, `lowest_stop_price`, `stop_airline`, and `stop_count` in `flight_history`.
- Update target-price evaluation and notifications to respect the route's `onlyDirect` setting.
- Update Dashboard table (Live Route Monitor) to display the lowest price by default with clear flight type badges (`Direct` vs `1 Stop`), plus secondary quotation for direct flights when available.
- Update `FlightSearchResultsDrawer` to highlight the best direct flight vs most economical connecting flight.

## Capabilities

### New Capabilities
- `flight-stops-preference`: Route-level flight stop preference configuration, storage, scanning separation (direct vs stops), and UI display.

### Modified Capabilities
<!-- None -->

## Impact

- **Database**: Adds `only_direct` column to `monitored_routes` and `lowest_direct_price`, `direct_airline`, `lowest_stop_price`, `stop_airline`, `stop_count` to `flight_history`.
- **API & Scanner**: Updates `/api/routes`, `src/lib/scanner.ts`, and `src/lib/db.ts`.
- **UI Components**: `RouteModal.tsx`, `src/app/page.tsx` (Dashboard table), `FlightSearchResultsDrawer.tsx`, `src/lib/i18n/dictionaries/`.
