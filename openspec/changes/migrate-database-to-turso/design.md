## Context

The application currently uses `better-sqlite3` with synchronous database queries in `src/lib/db.ts`. See `proposal.md` for motivation. Next.js API route handlers in `src/app/api/` are already defined as `async` functions, making the transition to asynchronous Promise-based database calls natural and non-disruptive.

## Goals / Non-Goals

**Goals:**
- Provide a unified `@libsql/client` abstraction in `src/lib/db.ts` that works identically for local SQLite files and remote Turso cloud databases.
- Retain 100% of existing SQL queries, parameter bindings, and table definitions without rewriting query syntax.
- Ensure all API route handlers and scanner operations correctly `await` asynchronous database methods.
- Provide an automated migration script (`scripts/migrate-to-turso.ts`) to upload local SQLite database records into the cloud database.

**Non-Goals:**
- Introducing an ORM (e.g., Prisma or Drizzle) — keeping raw SQL queries preserves maximum execution speed and zero unnecessary abstractions.
- Supporting multiple disparate SQL dialects (e.g. Postgres/MySQL) simultaneously.

## Decisions

### Decision 1: Use `@libsql/client` as the unified database client
- **Rationale**: `@libsql/client` is the official client library developed for Turso. It works natively in Node.js, Vercel Serverless, Edge runtimes, and supports both cloud URLs (`libsql://...`) and local file paths (`file:...`).
- **Alternatives considered**:
  - *`better-sqlite3` + custom HTTP layer*: Fails on serverless edge environments because `better-sqlite3` requires native C++ compilation bindings.
  - *Prisma ORM*: Adds significant bundle size, cold-start latency, and requires converting all existing queries to Prisma schemas.

### Decision 2: Dual-Mode Connection Factory
- **Rationale**: When `TURSO_DATABASE_URL` is set, `getDatabaseClient()` initializes a remote client with `TURSO_AUTH_TOKEN`. When absent, it initializes a local LibSQL client pointing to `radar_passagens.db`, enabling seamless offline development.

### Decision 3: Standardized Async Helper Functions
- **Rationale**: Define clean async helpers (`queryAll<T>`, `queryOne<T>`, `execute`) in `src/lib/db.ts` that wrap `client.execute()` and normalize rows into typed JavaScript objects matching our TypeScript models (`User`, `MonitoredRoute`, `FlightHistoryEntry`, etc.).

## Risks / Trade-offs

- **[Risk] Network Latency**: Remote queries introduce network round-trip time compared to in-memory local disk SQLite.
  - *Mitigation*: Turso provides edge replicas with low-latency regions (including São Paulo / `gru`), and batch transactions (`client.batch`) will be used during multi-step operations.
- **[Risk] Sync to Async Refactor**: Any leftover synchronous calls to `db.ts` could cause unhandled Promise errors.
  - *Mitigation*: Run `npx tsc --noEmit` and audit all API routes and scanner files to ensure every database call is properly awaited.

## Migration Plan

1. Install `@libsql/client` and `dotenv`.
2. Update `src/lib/db.ts` with async client initialization and LibSQL query execution.
3. Update consumers (`src/lib/scanner.ts`, `src/lib/scheduler.ts`, `src/app/api/`) with `await`.
4. Create `scripts/migrate-to-turso.ts` to copy existing records from `radar_passagens.db` to Turso.
5. Provide instructions for creating the free database on Turso and generating the Auth Token.
