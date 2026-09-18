## Context

The system monitors flight routes using a Google Flights scraper and SerpApi. Search results contain flight records with a `stops` attribute. Currently, `src/lib/scanner.ts` stores only the cheapest flight globally. This design outlines how to persist and present direct vs connecting flights cleanly across database, scanner, and frontend.

## Goals / Non-Goals

**Goals:**
- Extend SQLite schema in `src/lib/db.ts` to support `only_direct` in `monitored_routes` and `lowest_direct_price` / `lowest_stop_price` in `flight_history`.
- In `src/lib/scanner.ts`, partition scraped flight options into direct (`stops === 0`) and stops (`stops > 0`) to record both.
- If a route has `onlyDirect = true`, only direct flights trigger target-met price drops and notification alerts.
- In `RouteModal.tsx`, provide an intuitive selector with warning disclaimer.
- In `src/app/page.tsx` (Dashboard table), display the lowest price with badge (`Direct` vs `1 Stop`), showing direct flight alternatives when applicable.
- Full backwards compatibility with existing database rows.

**Non-Goals:**
- Creating complex multi-city or multi-leg flight builder logic.
- Breaking existing API payloads.

## Decisions

1. **Database schema evolution via idempotent `ALTER TABLE`**:
   - In `initSchema(db)` in `src/lib/db.ts`, execute `ALTER TABLE monitored_routes ADD COLUMN only_direct INTEGER DEFAULT 0` and `ALTER TABLE flight_history ADD COLUMN lowest_direct_price REAL`, etc., safely inside `try/catch` or pragma checks.
2. **Scanner selection logic**:
   - Filter `directOptions = options.filter(o => o.stops === 0)`.
   - Filter `stopsOptions = options.filter(o => o.stops > 0)`.
   - Evaluate `route.onlyDirect ? bestDirect : bestGlobal` for notifications and target evaluation.
3. **UI Display Hierarchy**:
   - Always prioritize showing the cheapest available flight matching the route criteria.
   - For routes set to "Any flight", if the cheapest is with stops but direct options exist, display a subtle secondary note (e.g. `direto a partir de R$ X`).

## Risks / Trade-offs

- [Risk: Routes where no direct flights exist] → Handled gracefully: if `onlyDirect` is true and no direct flights exist, scanner logs info and does not trigger false alerts.
- [Risk: Backwards compatibility with existing DB entries] → Defaults handle old rows (`only_direct = 0`, nullable direct/stop fields).
