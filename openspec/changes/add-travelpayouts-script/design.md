## Context

See proposal.md. The application runs Next.js (App Router) with TypeScript. The root layout is defined in `src/app/layout.tsx`. To complete domain verification for `bipfly.app` on Travelpayouts Drive, an external tracking/verification script snippet must be injected into the application.

## Goals / Non-Goals

**Goals:**
- Inject the Travelpayouts snippet into `src/app/layout.tsx` using `next/script`.
- Preserve clean hydration with zero React hydration warnings or errors.
- Satisfy Travelpayouts domain verification requirements.

**Non-Goals:**
- Injecting affiliate link replacements manually or creating additional proxy endpoints.
- Modifying other layout or page components.

## Decisions

### 1. Use Next.js `<Script>` with inline execution vs direct `<Script src="...">`
- **Decision**: Use `<Script id="travelpayouts-drive" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: ... }} />`.
- **Rationale**: The snippet provided by Travelpayouts dynamically sets `data-cmp-ab="2"` and appends the script tag with specific query parameters. Preserving the snippet inside `<Script>` with a unique `id` ensures exact fidelity to Travelpayouts' verified format while preventing duplicate executions across client-side navigations.
- **Alternative considered**: Direct `<Script src="https://emrldco.com/NTc2Nzc0.js?t=576774" data-cmp-ab="2" />`. While cleaner, external partner verifiers often specifically look for their exact snippet structure or append logic during initial crawler verification.

### 2. Script Strategy
- **Decision**: Use `strategy="afterInteractive"` (or `beforeInteractive`).
- **Rationale**: `afterInteractive` is the default in Next.js, executes immediately after the page becomes interactive, and does not block the critical rendering path or SSR HTML streaming. It provides optimal web vitals while remaining immediately detectable.

## Risks / Trade-offs

- **[Risk] Ad-blockers or tracking protection blocking emeraldco / Travelpayouts script in browser** → Mitigation: Domain verification crawlers do not run ad blockers; script failure in client ad-blockers will not break the rest of the application since it loads asynchronously.
- **[Risk] React hydration mismatch when modifying DOM** → Mitigation: Next.js `<Script>` natively manages its own script tag insertion outside the React Virtual DOM diffing root, preventing hydration mismatch errors.
