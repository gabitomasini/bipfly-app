## Why

To verify ownership of the domain `bipfly.app` in Travelpayouts and enable Travelpayouts Drive affiliate tracking, the Travelpayouts verification script must be integrated into the application's root HTML layout.

## What Changes

- Import `Script` from `next/script` in `src/app/layout.tsx`.
- Add the Travelpayouts Drive verification script in `src/app/layout.tsx` targeting domain verification for `bipfly.app`.
- Configure script execution with `id="travelpayouts-drive"` and appropriate loading strategy without blocking hydration or critical UI rendering.

## Capabilities

### New Capabilities
- `travelpayouts-integration`: Integration of Travelpayouts Drive verification script in the RootLayout for affiliate domain verification.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Code**: `src/app/layout.tsx`
- **Dependencies**: Built-in `next/script` from Next.js.
- **External Services**: Travelpayouts / Emerald script (`https://emrldco.com/NTc2Nzc0.js?t=576774`).
