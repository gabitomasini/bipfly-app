## Why

Currently, the application stores all data (users, routes, price history, logs, settings) in a local disk file using `better-sqlite3` (`radar_passagens.db`). This prevents serverless cloud deployments (such as Vercel or Netlify) and exposes the data to loss if the local container or disk is ephemeral. 

Migrating to Turso (LibSQL) enables a managed, distributed, zero-cost cloud SQLite database (generous 9 GB free tier) while preserving 100% of the existing SQL syntax and table schemas with zero breaking schema changes.

## What Changes

- **Add LibSQL Cloud Driver**: Install `@libsql/client` to allow HTTP/WebSocket communication with Turso database instances.
- **Dual-Mode Connection Support**: Configure `src/lib/db.ts` to seamlessly connect to Turso when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are present, while gracefully falling back to local SQLite when running offline.
- **Async Database Client Abstraction**: Adapt database helper functions in `src/lib/db.ts` to support asynchronous LibSQL queries (`client.execute`).
- **Data Migration CLI**: Provide a CLI migration script (`scripts/migrate-to-turso.ts`) to copy existing tables and records from local `radar_passagens.db` to the remote Turso instance.
- **Environment Configuration**: Document `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.example` and `.env.local`.

## Capabilities

### New Capabilities
- `database/cloud-provider`: Manages cloud database connection to Turso (LibSQL), authentication, automatic table schema initialization, and local database fallback.

### Modified Capabilities
*(None - existing user-facing business logic and requirements remain unchanged)*

## Impact

- **Dependencies**: `@libsql/client` added to `dependencies`.
- **Database Layer**: `src/lib/db.ts` and consumers updated to handle asynchronous database operations.
- **Configuration**: `.env.example` updated with Turso connection variables.
- **Deployment**: Enables frictionless deployments to serverless edge platforms like Vercel.
