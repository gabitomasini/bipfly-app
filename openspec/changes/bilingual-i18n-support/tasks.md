## 1. Core i18n Infrastructure & Dictionaries

- [x] 1.1 Create TypeScript dictionary schema and the American English dictionary (`src/lib/i18n/dictionaries/en.ts`) using natural travel tech SaaS vocabulary, verifying all namespaces (`nav`, `dashboard`, `routes`, `history`, `logs`, `settings`, `modals`, `stats`, `common`, `toasts`) are defined.
- [x] 1.2 Create the Brazilian Portuguese dictionary (`src/lib/i18n/dictionaries/pt.ts`), verifying 100% key parity and type conformance with the English dictionary.
- [x] 1.3 Implement `LanguageProvider`, `LanguageContext`, and `useTranslation()` custom hook in `src/lib/i18n/context.tsx` with default locale `'en'` and `localStorage` persistence.
- [x] 1.4 Implement locale-aware formatters in `src/lib/i18n/formatters.ts` and update `src/lib/utils.ts` to support locale-aware dates (`Oct 24, 2026` vs `24/10/2026`), relative time ("2 hours ago" vs "há 2 horas"), and currency formatting.

## 2. Layout & Global Navigation

- [x] 2.1 Wrap the application tree with `LanguageProvider` in `src/app/layout.tsx`, verifying no hydration mismatch occurs on initial render.
- [x] 2.2 Add an accessible Language Switcher toggle (EN / PT) to `src/components/Navbar.tsx` and translate navigation links, badges, tooltips, and the "Scan All Routes" action.
- [x] 2.3 Update `src/components/Toast.tsx` and toast notification dispatchers across the app to support translated messages.

## 3. Dashboard & KPI Metrics

- [x] 3.1 Translate the 4 KPI metric cards, progress indicators, quick filters, and search bar in `src/app/page.tsx`.
- [x] 3.2 Translate the flight deal monitoring table headers, status pills ("Target Met", "Above Target", "Pending Scan"), action tooltips, and pagination in `src/app/page.tsx`.

## 4. Route Management & Modals

- [x] 4.1 Translate the routes page header, view mode toggles ("Card View", "Table View"), and filter dropdowns in `src/app/rotas/page.tsx`.
- [x] 4.2 Translate route cards, flight detail labels, and action tooltips in `src/components/RouteCard.tsx`.
- [x] 4.3 Translate the route creation and edit modal form fields, passenger options, helper texts, and validation messages in `src/components/RouteModal.tsx`.
- [x] 4.4 Translate the delete confirmation dialog in `src/components/ConfirmModal.tsx`.
- [x] 4.5 Translate the airport combobox labels, search placeholders, and tooltips in `src/components/AirportCombobox.tsx`.

## 5. Price History, Analytics & Charts

- [x] 5.1 Translate single and multi-route history filters, sort controls, and history logs table in `src/app/historico/page.tsx`.
- [x] 5.2 Translate the Price Intelligence card (Z-Score anomalies: "Steal Deal", "Great Price", "Typical Price", "High Price") in `src/components/StatisticalAnalysisCard.tsx`.
- [x] 5.3 Translate history modal details and chart tooltips in `src/components/HistoryModal.tsx`, `src/components/PriceHistoryChart.tsx`, and `src/components/MultiRoutePriceChart.tsx`.

## 6. System Logs & Settings

- [x] 6.1 Translate log stream toggles, severity filters, category tags, JSON view actions, and pagination in `src/app/logs/page.tsx`.
- [x] 6.2 Translate automated scheduling controls, Telegram notification settings, and scraper configuration in `src/app/configuracoes/page.tsx`.

## 7. Verification & Quality Assurance

- [x] 7.1 Run `yarn build` to verify zero TypeScript errors, broken imports, or missing translation keys.
- [x] 7.2 Verify default American English rendering on clean session, switch language to Portuguese, and confirm seamless live translation across all pages.
