## 1. Dependencies and Environment Setup

- [x] 1.1 Add `@libsql/client` and `dotenv` to `package.json` and verify `yarn install` completes with exit code 0
- [x] 1.2 Update `.env.example` and project configuration documentation with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

## 2. Core Database Layer Refactoring (`src/lib/db.ts`)

- [x] 2.1 Refactor client initialization in `src/lib/db.ts` to use `createClient` from `@libsql/client` supporting both remote Turso cloud URLs and local file fallback
- [x] 2.2 Implement async schema initialization (`initSchema`) for all application tables (`users`, `login_codes`, `user_sessions`, `monitored_routes`, `flight_history`, `app_settings`, `app_logs`) and indexes
- [x] 2.3 Refactor all database helper methods in `src/lib/db.ts` (CRUD for users, routes, history, settings, and logs) to return asynchronous Promises with typed outputs

## 3. Update API Routes and Backend Callers

- [x] 3.1 Audit and update all API route handlers under `src/app/api/` (`routes`, `settings`, `history`, `auth`, `logs`, `scraper`) to `await` asynchronous database calls
- [x] 3.2 Update `src/lib/scanner.ts` and `src/lib/scheduler.ts` to `await` route lookups, status updates, and history insertions
- [x] 3.3 Run `npx tsc --noEmit` to verify zero TypeScript compilation errors across all files

## 4. Migration Tooling and Verification

- [x] 4.1 Create `scripts/migrate-to-turso.ts` to automatically copy existing records from `radar_passagens.db` into Turso and register `yarn db:migrate-turso` script in `package.json`
- [x] 4.2 Verify end-to-end functionality by testing route creation, manual search trigger, historical price logging, and log stream with both local SQLite file and remote Turso cloud database
