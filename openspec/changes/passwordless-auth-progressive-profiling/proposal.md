## Why

Currently, the flight monitoring application operates without user accounts or authentication. All monitored routes are globally accessible without ownership, limiting personalized route tracking, preventing cross-device access, and exposing monitored alerts without proper attribution. 

Introducing a passwordless authentication flow with progressive profiling allows users to seamlessly start monitoring flights without upfront registration friction. By capturing identity (email and optional name) at the exact moment of saving a route, issuing persistent secure session cookies, and enabling 6-digit OTP verification for recurring access on new devices, we deliver a modern, low-friction, and secure user experience.

## What Changes

- **User & Auth Data Model**: Add `users`, `login_codes`, and `user_sessions` database tables/models with proper indices, relational foreign keys (`user_id` on `monitored_routes`), and constraints.
- **Progressive Profiling on Route Creation**: Anonymous users fill out flight parameters normally; upon clicking "Salvar Rota" / "Monitorar Voo", an interactive modal prompts for name (optional) and email ("Onde você deseja receber os alertas?"). The user is created/retrieved, the route is assigned to them, a persistent session is created immediately, and a welcome/confirmation notification is dispatched.
- **Persistent Session & Automatic Recognition**: Authenticated users returning on the same browser are automatically recognized via secure `httpOnly` session cookies (30–90 days duration), loading their specific monitored routes directly. A clear "Sair" (Logout) option is provided in the header/navigation to invalidate sessions.
- **Returning User Login via 6-Digit OTP (Magic Code)**: Users accessing from a new device or browser can request a 6-digit OTP sent to their registered email with rate-limiting (maximum 3 requests per 15 minutes). The OTP modal supports autofocus, full-code paste, and validation with expiration (15 minutes).
- **Multi-Tenant Route Segregation**: Ensure CRUD and listing APIs filter routes by the active user session, preventing cross-user route pollution.
- **UI/UX Integration**: Integrate responsive modal dialogs, OTP inputs with auto-focus and clipboard paste support, user status indicator, and toast notifications adhering to the existing Tailwind CSS design system.

## Capabilities

### New Capabilities
- `passwordless-auth`: Passwordless authentication handling 6-digit OTP code generation, email delivery, verification, rate limiting, and long-term secure session cookie management.
- `user-route-ownership`: Progressive profiling onboarding modal on route creation, user association to flight routes, and authenticated user dashboard route isolation.

### Modified Capabilities
<!-- No existing capabilities' requirements are changing. -->

## Impact

- **Database**: Adds `users`, `login_codes`, and `user_sessions` tables in SQLite (`better-sqlite3`), and adds `user_id` foreign key column to `monitored_routes`.
- **APIs**:
  - `POST /api/auth/send-code`: Generates and sends 6-digit OTP code to email.
  - `POST /api/auth/verify-code`: Verifies OTP code and sets persistent session cookie.
  - `POST /api/auth/logout`: Clears session cookie and invalidates session in DB.
  - `GET /api/auth/me`: Returns current authenticated user profile.
  - `GET/POST/PUT/DELETE /api/routes`: Updated to enforce user session authentication and scope queries by `user_id`.
- **UI/Components**: New `AuthModal`, `OtpInput`, `UserProfileBadge` / `LogoutButton`, and integration into `RouteForm` for progressive profiling.
- **Dependencies & Email Delivery**: Crypto random code generation (Node `crypto`), nodemailer or mock email transporter for local development / transactional email sending.
