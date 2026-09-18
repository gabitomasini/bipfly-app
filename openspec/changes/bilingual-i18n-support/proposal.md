## Why

The application currently only supports Brazilian Portuguese (`pt-BR`) with hardcoded strings throughout the UI and formatting helpers. To make the platform accessible to a global audience and provide a first-class SaaS experience, the app needs bilingual internationalization (`i18n`) supporting both American English (`en-US`) and Brazilian Portuguese (`pt-BR`), with American English as the default language.

Translations must use natural, modern American airline/travel tech SaaS terminology (e.g., "Flight Radar", "Monitored Routes", "Price History", "Target Met", "Steal Deal", "Scan All Routes") rather than literal or robotic word-for-word translations.

## What Changes

- **i18n Infrastructure & Context**: Introduce a lightweight, zero-dependency client-side and server-friendly localization system (via React Context + Dictionary provider) with `en-US` as the default locale and `pt-BR` as the secondary locale.
- **Language Switcher UI**: Add an elegant, accessible language toggle in the navigation bar (`Navbar.tsx`) with flag/locale indicator (`EN` / `PT`), persisted in `localStorage` and synchronized across sessions.
- **Natural American English & Portuguese Dictionaries**: Curate full dictionary namespaces covering all application domains:
  - Navigation & Common UI (`nav`, `common`, `actions`, `toasts`)
  - Dashboard & KPIs (`dashboard`, `kpis`, `tables`)
  - Route Management & Modals (`routes`, `modal`, `fields`, `validation`)
  - Price History & Analytics (`history`, `charts`, `stats`)
  - System Logs & Streaming (`logs`, `categories`, `levels`)
  - Settings & Schedule (`settings`, `notifications`, `telegram`)
- **Locale-Aware Formatting**: Adapt date, time, currency, and relative time formatters (`src/lib/utils.ts`) to be locale-aware (e.g., `MMM D, YYYY`, 12-hour/24-hour time, relative phrases like "2 hours ago" vs "há 2 horas").
- **Component Translation Integration**: Update all UI views, modals, cards, badges, dropdowns, and custom tooltips to consume translated strings dynamically via `useTranslation()` hook.

## Capabilities

### New Capabilities
- `internationalization`: Covers multi-language dictionary architecture, locale switching state, storage persistence, locale-aware date/time formatting, and comprehensive bilingual translations with `en-US` default.

### Modified Capabilities
<!-- None -->

## Impact

- **Frontend Code**: `Navbar.tsx`, `RouteCard.tsx`, `RouteModal.tsx`, `HistoryModal.tsx`, `ConfirmModal.tsx`, `StatisticalAnalysisCard.tsx`, `MultiRoutePriceChart.tsx`, `PriceHistoryChart.tsx`, `CustomSelect.tsx`, `ExpandableSearch.tsx`, `AirportCombobox.tsx`, `Toast.tsx`, and all pages (`/`, `/rotas`, `/historico`, `/logs`, `/configuracoes`).
- **Utilities**: `src/lib/utils.ts` (locale-sensitive date, time, and currency helpers).
- **Dependencies**: None required (native React context + typed dictionary approach avoids heavy external bloat while delivering type-safety and instant rendering).
