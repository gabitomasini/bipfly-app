## 1. RootLayout Script Integration

- [x] 1.1 Import `Script` from `next/script` in `src/app/layout.tsx`
- [x] 1.2 Insert the Travelpayouts Drive `<Script />` tag inside `src/app/layout.tsx` with `id="travelpayouts-drive"`, `strategy="afterInteractive"`, and inline snippet via `dangerouslySetInnerHTML`
- [x] 1.3 Run `npx tsc --noEmit` and check for any TypeScript, syntax, or React hydration conflicts
