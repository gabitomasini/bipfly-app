## Context

BipFly combines Next.js 16 App Router, Playwright-based web scraping, Turso/SQLite persistence, statistical price analysis, and multi-channel alerting. 

Currently:
1. `src/lib/scrapers/google-flights-scraper.ts` parses flight cards from Google Flights using DOM queries and regexes, but falls back silently to `stops = 0` on unrecognized strings, extracts layover durations as total duration, and truncates options to 5 lowest prices before segregating direct vs connecting flights.
2. `src/lib/scanner.ts` runs automated route scans, but its alert condition is strictly static (`lowestPrice <= route.targetPrice`), completely bypassing `src/lib/stats/flight-anomaly-detector.ts`.
3. Administrative routes (`/api/settings`, `/api/scheduler`, `/api/scraper/test`, `/api/notify/test`) lack session authentication, whereas `/api/logs` already established the pattern using `getAuthUser()` and `isUserAdmin(user)`.
4. `README.md` documents an orchestrator with concurrent Travelpayouts scraping and real-time Z-score alerting that diverged from the actual codebase.

## Goals / Non-Goals

**Goals:**
- Eliminate false positives in direct flight detection by making stop parsing resilient and marking ambiguous stops as unknown (`null`) rather than direct (`0`).
- Return all valid scraped flights (or top direct + top connecting) from `scrapeGoogleFlights`, allowing `scanner.ts` to identify the lowest direct fare without being starved by cheaper connecting flights.
- Refine total flight duration extraction to ignore intermediate layovers.
- Lock down `/api/settings`, `/api/scheduler`, `/api/scraper/test`, and `/api/notify/test` with `getAuthUser()` and `isUserAdmin()`, masking sensitive tokens in settings.
- Integrate `analyzeFlightPrice` into `src/lib/scanner.ts` and dispatch enriched Push/Email alerts on statistical anomalies ($Z \le -1.5$ / $Z \le -2.0$).
- Synchronize `README.md` and `ARCHITECTURE.md` to accurately document the hybrid pipeline (Travelpayouts for flexible calendar matrices, Playwright for targeted route quotes, and statistical anomaly alerting in scanner).

**Non-Goals:**
- Replacing Playwright with an alternative scraping engine or third-party paid commercial API.
- Altering the mathematical foundation of Bessel's correction ($N-1$) and Z-score in `flight-anomaly-detector.ts`.
- Redesigning the user session or passwordless OTP authentication system.

## Decisions

### Decision 1: Scraper Option Truncation and Stop Segregation
- **Decision:** Have `scrapeGoogleFlights` preserve the complete sorted list of unique flight options (or accept a segregation strategy), and ensure `scanner.ts` has access to both direct and connecting candidate pools before determining `bestDirect` and `bestWithStops`.
- **Rationale:** If Google Flights presents 10 options where the 5 cheapest have 1 or 2 stops and options 6-8 are direct flights, truncating to 5 lowest general prices before segregation causes `directOptions` to be empty. Preserving both pools guarantees that `onlyDirect` routes never report false negatives when direct flights were actually found on the page.
- **Alternatives Considered:** 
  - *Adding stops filter in Google Flights URL parameter*: Google Flights query parameters for stops can be brittle and often reload the entire SPA. Scraping all rendered cards from the standard search result and partitioning them in memory is faster and extracts both direct and connecting fares in a single network pass.

### Decision 2: Resilient Stop Parsing and Unknown Fallback
- **Decision:** Implement a multi-pattern stops parser supporting Portuguese and English ("sem escalas", "voo direto", "nonstop", "1 parada", "2 paradas", "1 stop", "2 stops", regex `(\d+)\s*(?:parada|escala|stop)`). If no pattern matches, assign `stops = null`. In `scanner.ts`, strictly check `o.stops === 0` for direct flights, ensuring unverified options are never classified as direct.
- **Rationale:** A silent fallback to `0` caused connecting flights without explicit recognized text to be labeled as direct, triggering false price drop alerts on direct-only routes.
- **Alternatives Considered:**
  - *Throwing an error*: Discarding the entire flight option on missing stop text reduces result coverage. Using `null` retains the price for overall tracking while safely excluding it from direct-only filters.

### Decision 3: Duration Extraction Disambiguation
- **Decision:** Prioritize specific DOM selectors for total duration (`.pIavfa`, `[aria-label*="Duração total"]`, `[aria-label*="Total duration"]`), and refine fallback regexes to explicitly exclude patterns like "X h de escala", "X h de parada", or "X h layover".
- **Rationale:** Flight cards with long layovers frequently display the connection waiting time before the total journey time in text nodes, causing duration parsers to record 2 hours instead of 14 hours.
- **Alternatives Considered:**
  - *Calculating duration by subtracting departure from arrival time*: Airport local timezones differ and dates may shift by +1 or +2 days, which makes timezone-unaware time math unreliable without full UTC timestamps.

### Decision 4: Centralized Authorization Pattern for Admin Endpoints
- **Decision:** Apply the authentication and authorization pattern already used in `src/app/api/logs/route.ts`:
  ```ts
  const user = await getAuthUser();
  if (!isUserAdmin(user)) {
    return NextResponse.json({ success: false, error: "Acesso não autorizado." }, { status: 403 });
  }
  ```
  Protect `/api/scheduler` (`POST` actions `restart` and `run_now`), `/api/scraper/test` (`POST`), and `/api/notify/test` (`POST`). For `/api/settings`, require admin privileges for `POST` updates, and for `GET`, either require admin privileges or return a sanitized object with sensitive keys masked (e.g., `serpApiKey: "••••••••"`, `ntfyTopic: "••••••••"`).
- **Rationale:** Simple, consistent, and leverages existing user roles and session cookies without introducing external authorization libraries.
- **Alternatives Considered:**
  - *Global Next.js middleware*: Next.js middleware runs in Edge runtime where Node.js crypto and SQLite drivers require special shims; route-level handlers are already established and run in Node.js runtime.

### Decision 5: Anomaly Engine Integration into Scanner
- **Decision:** In `scanRoute` (`src/lib/scanner.ts`), query historical prices for the route from SQLite via `getFlightHistory(route.id)`. Execute `analyzeFlightPrice(...)` with the current lowest fare and historical series. If `isDeal` is true (Z-Score $\le -1.5$ with $N \ge 3$), trigger notifications and pass statistical metrics (`dealLevel`, `zScore`, `discountPercent`, `mean`) to `sendNtfyNotification` and `sendDealAlertEmail`.
- **Rationale:** Delivers on the core value proposition advertised in the README, turning BipFly into a truly intelligent anomaly-driven monitoring platform rather than just a static threshold checker.
- **Alternatives Considered:**
  - *Only alerting on anomalies when below target price*: Misses the primary value of anomaly detection, which is alerting on abnormal market dips that may still be above a conservatively high static target.

## Risks / Trade-offs

- **[Risk] Google Flights DOM layout mutations** → *Mitigation:* Employ hierarchical extraction: aria-labels first, followed by known CSS selectors, and regex fallback on normalized card text.
- **[Risk] Admin lockout in fresh deployments without configured emails** → *Mitigation:* Preserve `FEATURE_UNLIMITED_ROUTES=true` fallback and allow `ADMIN_EMAILS` env variable configuration in `.env.local`.
- **[Risk] Alert fatigue from statistical anomalies on small sample sizes** → *Mitigation:* `analyzeFlightPrice` strictly enforces `MIN_SAMPLE_FOR_DEAL = 3` and Bessel's correction ($N-1$) widens the variance for small $N$, naturally suppressing false positive Z-scores until sufficient data points exist.
