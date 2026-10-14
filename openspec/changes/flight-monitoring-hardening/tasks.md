## 1. Scraper Parsing and Result Segregation Hardening

- [x] 1.1 Update flight stop detection in `src/lib/scrapers/google-flights-scraper.ts` to support PT/EN direct and multi-stop regexes, assigning `null` instead of defaulting to 0 for unverified cards; verify with mock text test cases covering direct, 1-stop, and ambiguous texts.
- [x] 1.2 Refine total duration extraction in `src/lib/scrapers/google-flights-scraper.ts` to prioritize total journey selectors/labels and ignore layover/connection intervals; verify by testing flight cards containing both layover and total travel times.
- [x] 1.3 Update `scrapeGoogleFlights` and `src/lib/scanner.ts` to preserve direct and connecting flight pools across all parsed options prior to slicing, ensuring `bestDirect` is accurately identified when connecting flights have lower fares; verify `scanRoute` identifies direct flights on test fixtures.

## 2. API Routes Authentication & Sensitive Data Protection

- [x] 2.1 Secure `src/app/api/settings/route.ts` with `getAuthUser` and `isUserAdmin`, requiring admin privileges for `POST` configuration updates and masking secrets (`serpApiKey`, `ntfyTopic`) on unauthenticated or non-admin access; verify with unauthenticated and authenticated requests.
- [x] 2.2 Protect `src/app/api/scheduler/route.ts` to require admin authentication for `restart` and `run_now` execution actions; verify that anonymous calls return HTTP 401 or 403 without triggering background scans.
- [x] 2.3 Protect test diagnostic endpoints `src/app/api/scraper/test/route.ts` and `src/app/api/notify/test/route.ts` with administrator authorization checks; verify anonymous requests receive HTTP 401 or 403 without spawning browser instances or sending push notifications.

## 3. Anomaly Engine Integration in Route Scanner

- [x] 3.1 Integrate `analyzeFlightPrice` from `src/lib/stats/flight-anomaly-detector.ts` into `scanRoute` in `src/lib/scanner.ts` by querying historical route quotes; verify statistical calculation produces valid `zScore`, `mean`, and `dealLevel`.
- [x] 3.2 Update alert evaluation in `src/lib/scanner.ts` so `shouldNotify` triggers when a statistical deal is detected (`isDeal = true`, $Z \le -1.5$ / $Z \le -2.0$) or when price is below target; verify notification trigger conditions via automated test or simulation.
- [x] 3.3 Enrich `src/lib/notifier.ts` and `src/lib/email.ts` to format and include statistical anomaly metrics (deal level badge, Z-score, and historical average) in Push and Email notifications; verify generated message content includes deal insights.

## 4. Documentation and Architecture Alignment

- [x] 4.1 Update `README.md` and `ARCHITECTURE.md` to accurately document the role of Travelpayouts (flexible date matrix and affiliate tracking) and the live runtime Z-Score/Bessel anomaly alert trigger; verify diagrams and text reflect actual codebase behavior.
- [x] 4.2 Run project typechecking and build validation (`npm run build`) to ensure type safety and absence of regression across modified routes, scrapers, and scanner logic.
