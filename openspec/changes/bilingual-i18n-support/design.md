## Context

The application is a Next.js 16 (App Router) client-heavy dashboard monitoring flight deals, with SQLite/Prisma backend. Currently, UI strings and formatting methods (in `src/lib/utils.ts`) are hardcoded in Portuguese (`pt-BR`). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide instantaneous language switching between American English (`en-US`, default) and Brazilian Portuguese (`pt-BR`) without full page reloads.
- Provide a typed, structured dictionary system with autocomplete and fallback to `en-US` for missing keys.
- Adapt all date, time, currency, and relative time formatting helpers to respect the active locale.
- Persist the selected language in `localStorage` across page navigation and reloads.

**Non-Goals:**
- Server-side subpath routing (e.g., `/en/rotas` vs `/pt/rotas`) which would disrupt current single-dashboard SPA architecture.
- Translating external database data like airport IATA codes (`GRU`, `JFK`) or airline names (`LATAM`, `Delta`), which are already universal standard entities.
- Backend scraper query modifications (Google Flights operates on standard IATA codes and ISO dates).

## Decisions

### 1. Zero-Dependency React Context + Typed Dictionaries vs. Heavy i18n Libraries
- **Decision**: Implement a native React Context (`LanguageContext`) with a custom hook `useTranslation()` and TypeScript dictionaries (`en.ts`, `pt.ts`).
- **Rationale**:
  - `next-intl` or `react-i18next` introduce extra runtime dependencies, middleware routing complexity, and potential hydration mismatch issues in Next.js App Router client components.
  - A lightweight React Context provider guarantees instant rendering, zero bundle bloat, and complete type safety (auto-completing translation keys like `t("dashboard.kpis.activeRoutes")`).
- **Alternatives Considered**:
  - *Next.js URL-based locale routing*: Would require restructuring all app folders into `app/[locale]/...` and updating Next.js middleware, breaking bookmarking and complicating navigation.
  - *i18next / next-i18next*: Adds 40kb+ overhead and unnecessary complexity for a two-language SaaS dashboard.

### 2. Hydration-Safe Locale Initialization
- **Decision**: Initialize the `LanguageProvider` state with default locale `'en'` during initial render / SSR, then synchronize with `localStorage.getItem("app_language")` on client mount.
- **Rationale**: Prevents Next.js hydration mismatch errors between server-rendered HTML and client hydration.
- **Fallback**: If `localStorage` is empty or contains an invalid value, `'en'` is strictly selected.

### 3. Modular Dictionary Structure
- **Decision**: Organize translation dictionaries by domain namespaces:
  ```
  src/lib/i18n/
  ├── context.tsx          # LanguageProvider, useTranslation hook
  ├── formatters.ts        # Locale-aware date, time, relative time, currency
  ├── index.ts             # Export barrel
  └── dictionaries/
      ├── en.ts            # American English (Default)
      ├── pt.ts            # Brazilian Portuguese
      └── types.ts         # TypeScript schema for dictionary keys
  ```
- **Rationale**: Keeps dictionary files maintainable, preventing massive monolithic files and ensuring all keys in `pt.ts` strictly adhere to the shape defined by `en.ts`.

### 4. Locale-Aware Formatters Architecture
- **Decision**: Upgrade formatters in `src/lib/utils.ts` (and expose via `useTranslation().formatDate`, etc.) to accept the current locale:
  - `formatDate(date, locale)`: `Oct 24, 2026` for `en`, `24/10/2026` for `pt`.
  - `formatDateTime(date, locale)`: `Oct 24, 2026, 3:30 PM` for `en`, `24/10/2026 15:30` for `pt`.
  - `formatRelativeTime(date, locale)`: "2 hours ago" for `en`, "há 2 horas" for `pt`.
  - `formatCurrency(amount, currency, locale)`: `$1,200.00` for `en-US`, `R$ 1.200,00` for `pt-BR`.

## Risks / Trade-offs

- **[Risk] Flash of default language on initial load if user preferred Portuguese** → **Mitigation**: Synchronize state immediately in `useLayoutEffect` / initial `useEffect` with minimal overhead; default `'en'` ensures consistent first-paint behavior.
- **[Risk] Missing translation key during development** → **Mitigation**: TypeScript type constraints enforce that `pt.ts` satisfies `typeof en`, and `t(key)` includes an automatic fallback to English if a key is undefined.
- **[Risk] Literal or unnatural phrasing in English** → **Mitigation**: All English strings are curated against American airline tech SaaS standards (e.g., "Scan All Routes", "Target Met", "Steal Deal", "Price Intelligence").
