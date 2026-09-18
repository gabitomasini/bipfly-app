## Purpose

Provides seamless bilingual localization for the flight monitoring application, supporting American English as the default language and Brazilian Portuguese as an alternate language with natural, industry-standard travel tech terminology and locale-aware formatting.

## ADDED Requirements

### Requirement: Default Locale and Supported Languages
The application SHALL initialize in American English (`en-US`) by default and SHALL provide full support for Brazilian Portuguese (`pt-BR`).

#### Scenario: First-time visitor visits the application
- **WHEN** a user opens the application for the first time without a saved language preference
- **THEN** all user interface elements, labels, buttons, navigation links, and alerts MUST render in American English (`en-US`)

#### Scenario: Available languages selection
- **WHEN** a user accesses the language selector
- **THEN** the system MUST present options for English (`English (US)`) and Portuguese (`Português (BR)`)

---

### Requirement: Language Switcher in Navigation Bar
The application SHALL provide a prominent, accessible language switcher in the top navigation bar.

#### Scenario: User switches language from English to Portuguese
- **WHEN** a user selects Portuguese from the language switcher
- **THEN** the entire user interface MUST immediately re-render in Brazilian Portuguese without requiring a full page reload

#### Scenario: User switches language from Portuguese to English
- **WHEN** a user selects English from the language switcher
- **THEN** the entire user interface MUST immediately re-render in American English without requiring a full page reload

---

### Requirement: Language Preference Persistence
The application SHALL persist the user's selected language in client storage (`localStorage`) and restore it across sessions and page navigation.

#### Scenario: Preserving language across page navigation
- **WHEN** a user switches the language to Portuguese on the Dashboard and navigates to the Routes or History page
- **THEN** the destination page MUST continue rendering in Portuguese

#### Scenario: Restoring language across browser sessions
- **WHEN** a user sets their language preference and refreshes or reopens the browser
- **THEN** the application MUST load the saved language preference from storage

---

### Requirement: Contextual and Natural American English Terminology
The translation dictionaries SHALL use natural, contemporary American flight search / travel tech SaaS vocabulary rather than literal or robotic word-for-word translations.

#### Scenario: Navigation and brand labels
- **WHEN** viewing the top navigation in English
- **THEN** the brand MUST display "Flight Radar" (or "Radar Passagens" with subtitle "Airfare Deal Tracker"), and nav links MUST display "Dashboard", "Routes", "Price History", "Logs", and "Settings"

#### Scenario: Status badges and deals terminology
- **WHEN** viewing flight route status pills in English
- **THEN** routes below target price MUST display "Target Met" or "Deal Found", routes above target MUST display "Above Target", and routes without data MUST display "Pending Scan"

#### Scenario: Price intelligence and anomaly badges
- **WHEN** viewing statistical anomaly analysis in English
- **THEN** extreme low price z-score (Z <= -2.0) MUST display "Steal Deal", moderate low price (-2.0 < Z <= -1.5) MUST display "Great Price", normal price MUST display "Typical Price", and high price (Z >= +1.5) MUST display "High Price"

#### Scenario: Action buttons and tooltips
- **WHEN** viewing primary action buttons in English
- **THEN** the bulk search action MUST display "Scan All Routes", single route refresh MUST display "Search Now", and creation buttons MUST display "Add Route"

---

### Requirement: Locale-Aware Date, Time, and Relative Time Formatting
The application SHALL format dates, times, relative timestamps, and currency values according to the active locale.

#### Scenario: Date formatting in English vs Portuguese
- **WHEN** displaying flight departure dates with active locale `en-US`
- **THEN** dates MUST format according to American convention (e.g., `Oct 24, 2026` or `10/24/2026`) instead of Brazilian `DD/MM/YYYY`

#### Scenario: Relative time phrasing
- **WHEN** displaying query execution timestamps in English
- **THEN** relative timestamps MUST format as natural English phrases (e.g., "just now", "2 mins ago", "3 hours ago", "yesterday") instead of Portuguese ("agora mesmo", "há 2 min", "há 3 horas", "ontem")

#### Scenario: Toast notifications and system messages
- **WHEN** a user triggers an action (e.g., creating a route, deleting a route, triggering search)
- **THEN** the resulting toast notification title and description MUST render in the currently active language
