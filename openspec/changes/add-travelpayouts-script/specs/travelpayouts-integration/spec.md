## Purpose

Provides domain verification and affiliate partner tracking by loading the Travelpayouts Drive script on all web application pages.

## ADDED Requirements

### Requirement: Travelpayouts Drive Script Embedding
The application MUST include the Travelpayouts Drive verification script in the root layout so that domain verification for `bipfly.app` and affiliate tracking can be detected by Travelpayouts crawlers.

#### Scenario: Script tag presence in root layout
- **WHEN** the root layout is rendered on any page of `bipfly.app`
- **THEN** the Travelpayouts Drive script element is present in the DOM with source `https://emrldco.com/NTc2Nzc0.js?t=576774` and attribute `data-cmp-ab="2"`

### Requirement: Non-blocking Script Execution and Hydration Safety
The script integration MUST NOT block initial document parsing, must not cause React hydration mismatches, and must execute cleanly in Next.js App Router.

#### Scenario: Client-side hydration
- **WHEN** a client visits the application
- **THEN** React hydration succeeds without hydration mismatch errors or warnings related to third-party script injection
