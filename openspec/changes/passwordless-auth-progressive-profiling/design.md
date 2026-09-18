## Context

The application is built on Next.js 16 (App Router) with React 19, Tailwind CSS v4, and SQLite via `better-sqlite3`. Currently, `monitored_routes` has no user association, and all routes are visible to all visitors.

See `proposal.md` for background and user journey objectives.

## Goals / Non-Goals

**Goals:**
- Implement passwordless authentication (OTP via email) without requiring passwords or external OAuth setup.
- Enable progressive profiling: anonymous users can search flights and input route parameters first, providing email/name only upon clicking "Salvar Rota" / "Monitorar Voo".
- Issue secure long-term session cookies (60 days) stored in SQLite `user_sessions`.
- Scope all route queries and mutations to the authenticated user.
- Provide a responsive, accessible OTP input component supporting clipboard paste and automatic digit progression.
- Support local development without requiring external email API keys (graceful fallback logging / dev console).

**Non-Goals:**
- Passwords, OAuth providers (Google/GitHub), or WebAuthn/Passkeys in this iteration.
- Role-Based Access Control (RBAC) / admin superuser dashboards (all users have standard personal access).
- Multi-user collaboration on the same monitored route.

## Decisions

### 1. SQLite Schema Architecture (`better-sqlite3`)
- **`users` Table**:
  ```sql
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    email       TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  ```
- **`login_codes` Table**:
  ```sql
  CREATE TABLE IF NOT EXISTS login_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code        TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    used_at     TEXT,
    ip_address  TEXT,
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_login_codes_lookup ON login_codes(user_id, code);
  ```
- **`user_sessions` Table**:
  ```sql
  CREATE TABLE IF NOT EXISTS user_sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token  TEXT NOT NULL UNIQUE,
    expires_at     TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    last_seen_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
  ```
- **`monitored_routes` Migration**:
  - Add `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`.
  - Create index `idx_monitored_routes_user_id ON monitored_routes(user_id)`.
  - For existing legacy routes without `user_id`, create a default legacy user or keep nullable for migration backwards-compatibility.

*Rationale*: Relational integrity with foreign keys and cascade deletes ensures data consistency while SQLite WAL mode handles concurrency seamlessly.

### 2. Session Management & Cookie Strategy
- Sessions use a 256-bit cryptographically secure random token (`crypto.randomBytes(32).toString('hex')`).
- Cookie flags: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 60 * 24 * 60 * 60` (60 days).
- Helper function `getCurrentUser(req)` reads the cookie, verifies against `user_sessions`, checks `expires_at > datetime('now')`, updates `last_seen_at`, and returns the user object.

*Alternatives Considered*:
- JWT in cookies: Rejected because server-side invalidation/logout is instantaneous with a database table, and SQLite lookups for active sessions take < 0.1ms.

### 3. Email & OTP Verification Flow
- OTP generation: `crypto.randomInt(100000, 1000000).toString()`.
- Validity: 15 minutes.
- Rate limiting: Max 3 requests per 15 minutes per email and IP address.
- Email transport: Modular email sender in `src/lib/email.ts`.
  - If SMTP / Resend credentials exist in `process.env` or `app_settings`, sends real email.
  - If unconfigured, logs the OTP code and welcome email content to `app_logs` and server console, allowing full offline / local testing without friction.

### 4. Progressive Profiling & UI/UX State Machine
- When an anonymous user submits a route:
  1. Capture route payload in component state.
  2. Open `AuthModal` with title *"Onde você deseja receber os alertas?"*.
  3. User enters email and optional name -> Click *"Ativar Monitoramento"*.
  4. Backend endpoint creates/retrieves user, creates route with `user_id`, sets `session_token` cookie, and sends confirmation email.
  5. UI updates state to authenticated, shows success toast, and transitions to the user's route dashboard.
- Returning users on a new device:
  1. Click *"Já monitora rotas? Acesse com seu e-mail"*.
  2. Enter email -> Receive 6-digit OTP.
  3. Enter 6-digit OTP (with paste handling & auto-advance) -> Verified -> Session cookie set -> Redirected to dashboard.

## Risks / Trade-offs

- **[Risk] Email delivery delays or spam filtering**: 
  - *Mitigation*: 15-minute OTP window gives ample time; UI includes resend button (with 60-second cooldown timer); local dev mode prints OTP immediately in logs/console.
- **[Risk] Multiple tabs/concurrent requests**:
  - *Mitigation*: Database transactions (`db.transaction()`) ensure atomic user creation and route attachment.
- **[Risk] Legacy routes created before authentication**:
  - *Mitigation*: Schema migration maintains existing routes with nullable `user_id` or auto-assigns to an initial user if desired, without crashing existing background scanners.

## Migration Plan

1. Run idempotent schema updates on `radar_passagens.db` inside `initSchema()` in `src/lib/db.ts`.
2. Ensure background scanner (`src/lib/scanner.ts`) continues scanning all active routes regardless of user association.
3. Update API route handlers (`/api/routes`, `/api/auth/*`) to check user sessions.
