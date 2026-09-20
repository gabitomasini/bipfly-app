## 1. Database Schema & Data Models

- [x] 1.1 Update `src/lib/db.ts` to create `users`, `login_codes`, and `user_sessions` tables, clear existing legacy unassigned routes and associated history, and migrate `monitored_routes` with `user_id` foreign key column and index. Verify schema creation and clean database state.
- [x] 1.2 Update `src/lib/types.ts` to include `User`, `LoginCode`, `UserSession` types and add `userId` and `userName` fields to `MonitoredRoute`. Verify TypeScript compilation with `npx tsc --noEmit`.
- [x] 1.3 Implement database helper functions in `src/lib/db.ts` for user lookup/creation, OTP code generation and validation, rate-limiting checks, session management, and user-scoped route queries. Verify with unit/integration test calls.

## 2. Authentication Utilities & Email Service

- [x] 2.1 Create `src/lib/email.ts` to handle transactional emails for 6-digit OTP delivery and new route monitoring confirmation, with fallback logging to `app_logs` and console in dev mode. Verify delivery formatting and dev logs.
- [x] 2.2 Create `src/lib/auth.ts` with session cookie helpers (`setSessionCookie`, `clearSessionCookie`, `getAuthUser`) supporting Next.js App Router cookies. Verify cookie flags (`httpOnly`, `secure`, `sameSite`, `maxAge`).

## 3. Auth & Route API Endpoints

- [x] 3.1 Create `src/app/api/auth/send-code/route.ts` implementing 6-digit cryptographic OTP generation, 15-minute expiration, and 3-attempt rate limiting per 15 minutes. Verify endpoint responses for valid and rate-limited requests.
- [x] 3.2 Create `src/app/api/auth/verify-code/route.ts` validating the OTP, marking `used_at`, creating a session in SQLite, and setting the persistent `session_token` cookie. Verify correct token issuance and error handling for invalid/expired codes.
- [x] 3.3 Create `src/app/api/auth/me/route.ts` and `src/app/api/auth/logout/route.ts` to fetch current session user and terminate sessions. Verify session invalidation and cookie clearing.
- [x] 3.4 Update `src/app/api/routes/route.ts` and `src/app/api/routes/[id]/route.ts` to enforce user scoping, allowing progressive onboarding on route creation and filtering route listings by active user session. Verify multi-tenant isolation.

## 4. UI/UX & Progressive Profiling Flow

- [x] 4.1 Create `src/components/auth/OtpInput.tsx` featuring 6 individual digit cells, autofocus, automatic jump on input, full-code clipboard paste support, backspace navigation, and resend cooldown timer. Verify input and paste behavior.
- [x] 4.2 Create `src/components/auth/AuthModal.tsx` supporting two modes: Progressive Profiling ("Onde você deseja receber os alertas?") and Recurring Login ("Já monitora rotas? Acesse com seu e-mail"). Verify modal transitions and responsive UI.
- [x] 4.3 Update header and navigation layout with user status indicator, email/name display, and discreet "Sair" (Logout) button, alongside an unauthenticated "Entrar com e-mail" trigger. Verify visibility in both states.
- [x] 4.4 Integrate progressive profiling into the flight search & route creation flow (`src/app/page.tsx`), capturing anonymous parameters and opening the contact modal on submit before persisting the route. Verify seamless onboarding experience.

## 5. End-to-End Verification & Polish

- [x] 5.1 Test anonymous user first access: fill flight form -> trigger modal -> provide email/name -> route created and assigned -> session cookie set -> confirmation email dispatched.
- [x] 5.2 Test recurring user login on fresh browser session: enter email -> receive OTP -> paste 6-digit code -> verify authentication -> user routes automatically loaded on dashboard.
- [x] 5.3 Test session persistence on page refresh and test logout button clearing session and resetting dashboard.
