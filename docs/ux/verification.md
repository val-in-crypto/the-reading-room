# Reading Room UX simplification

Implemented the supplied UX/UI plan in its requested order, with one commit per stage:

1. Shared font, colour and icon tokens; serif wordmark; SVG, PNG and ICO favicons.
2. Shelf/search/filter selection reconciliation, tab resets, loading skeletons and retry, remembered reading preferences.
3. In-book navigation, collapsed search and filters, one article toolbar, compact narrator selector, player only in Listen mode.
4. Minimal cover screen, short About dialog, one URL-or-text import field with validation, cancellation and selected-row highlight.
5. Single-leaf layout below 900px, full-width phone book, phone player dock, keyboard navigation, focus return/trapping, tooltips, reduced motion and touch targets.

The latest plan's left-navigation/right-reader layout replaces the earlier optional two-sided article layout. Paged reading on the right remains available. The existing cover and page-turn engines, artwork, illustrations, colours and textures are retained. The desktop cover engine has a completion safeguard for a missing final event; its motion and duration are unchanged.

The plan mentions 12px player times but also requires no text below 13px. Player times use 13px to meet the latter requirement.

## Verification

- `npm run build`: optimized Next.js production build, including TypeScript.
- `npm test`: 18 unit and route checks, including selection reconciliation and URL/text detection without dropping article text.
- `TEST_URL=http://localhost:3001 npm run test:ux`: production browser checks at 1440×1000, 1024×800, 768×1000 and 390×844.
- Zero axe WCAG A/AA violations in landing, reading and listening at all four widths; About and phone import dialogs also checked.
- Lighthouse accessibility: 100/100 for landing, reading and listening at 1440px and 390px. Reports are generated under ignored `test-results/`.
- Narration playback, seeking, voice selection and persistence are checked with mocked provider responses. No ElevenLabs generation credits are spent by these tests.
- Physical opening, next/previous page turns and closing are checked with motion enabled on desktop and phone. Reduced-motion flows are checked separately.
- No page errors or console errors in the responsive browser checks; favicon endpoints return 200.

These automated checks do not replace assistive-technology or real-device testing. Browser checks use Chromium; Safari/iOS hardware was not available for this verification.

## Screenshots

| State | Before, 1440px | After, 1440px |
| --- | --- | --- |
| Closed book | [Before](before-landing-1440.png) | [After](after-landing-1440.png) |
| Reader | [Before](before-reader-1440.png) | [After](after-reader-1440.png) |
| Listen | — | [After](after-listen-1440.png) |

The `test:ux` script regenerates after screenshots and responsive screenshots. It accepts `TEST_URL` and optional `CHROME_PATH`. On macOS it can use installed Chrome; elsewhere run `npx playwright install chromium` first.
