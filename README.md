# The Reading Room

A free, Vercel-ready web prototype based on the supplied Figma design. Next.js App Router, React, TypeScript and plain CSS. The original cover, book, botanical collage, logo and supplied icons are individual local assets; the Figma screenshots are not used as the interface.

## Run locally

Use Node.js 20.9 or later.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Reading, bookmarking and pasted-text imports work without an API key.

## ElevenLabs

Set these server environment variables in `.env.local` or Vercel:

| Variable | Purpose |
| --- | --- |
| `ELEVENLABS_API_KEY` | Your ElevenLabs API key; never use a `NEXT_PUBLIC_` prefix. |
| `ELEVENLABS_VOICE_IDS` | A comma-separated list of 3–4 voice IDs accessible to your account. If empty, the app loads the first four available account voices. |
| `ELEVENLABS_MODEL_ID` | Defaults to `eleven_multilingual_v2`. |
| `PROTOTYPE_ACCESS_CODE` | An owner-chosen listening code. Required for paid narration on Vercel; enter it through the app's listening dialog. |

Get voice IDs from the [ElevenLabs voices endpoint](https://elevenlabs.io/docs/api-reference/voices/get-all). The interface uses real provider names and preview URLs. The four mood cards before configuration are placeholders, not generated voices. No credentials are entered into the UI or committed to the repository.

Narration is generated only when play is pressed, in sections under 3,000 characters, and continues through the full article. Audio is cached in memory for the current browser session; reloading can incur another generation charge. Changing voices restarts the current section. Reading position and current audio section/time are stored locally. Playback speed and seeking apply to the current section. This prototype has no persistent server audio storage or word highlighting.

API billing remains separate from making the app free for readers. The access code gates paid requests; the in-memory rate limiter is only a per-instance throttle, not a distributed quota. Set provider spending limits and keep the preview restricted. Before a broad public launch, add individual authentication and a persistent per-user usage ledger.

## Deploy on Vercel

1. Put the project in your own Git repository and import it into Vercel.
2. Use the detected **Next.js** preset. Build command: `npm run build`. Keep the default output directory.
3. Add the server environment variables above. Redeploy after changing them.
4. Verify an open-access import and a short narration with the chosen voices.

There is no database requirement for this prototype. Bookmarks, imports and progress belong to one browser/device and disappear if its site data is cleared. Audio generation and external article fetching run in Node.js route handlers.

## What's working

- Animated opening cue, hinged cover transitions and forward/backward page turns; one-page mobile reader.
- Tech, Medicine, Nobel Prizes, AI and Crypto topics; collection search.
- Complete article text by default, an optional animated Pages view, bookmarks, text size and saved reading/listening positions.
- Import a public HTTPS article link; paste text when extraction fails.
- Three or four configured ElevenLabs voices, previews, section-based audio playback and a complete Read along transcript.
- A live **Popular today** shelf: Hacker News top stories submitted within the last 24 hours, with actual HN points and discussion links. Story titles load full readable publisher text directly into the app. Blocked pages offer a paste-text fallback.
- Clear loading, empty, extraction and narration error states.

Popular today reflects one community's ranking, not an internet-wide trend score. HN is strongest for tech and AI; medicine, Nobel and crypto coverage is uneven. Topic assignment uses simple title keywords. Source bookmarks provide other discovery paths rather than pretending to be additional live feeds.

The five starter articles are original, evergreen prototype explainers. They are labelled as such and are not publisher republications, summaries of today's news, medical instructions or investment recommendations.

## Article sources and the next content stage

| Source | Best use | Integration approach |
| --- | --- | --- |
| [Hacker News API](https://github.com/HackerNews/API) | Popular tech/AI links | Implemented: title, URL, submission time, score and discussion link. |
| [MIT Technology Review](https://www.technologyreview.com/) | Tech and AI editorial discovery | Source link now; negotiate a publisher arrangement before full-text catalogue distribution. |
| [NIH Research Matters](https://www.nih.gov/news-events/nih-research-matters) | Medical research explanations | Source link now; inspect each page's text and image rights before importing into a shared catalogue. |
| [NobelPrize.org](https://www.nobelprize.org/) | Authoritative announcements and background | Source link now; a later approved integration can track announcements. Public accessibility alone does not grant republication rights. |
| [CoinDesk](https://www.coindesk.com/) | Crypto news discovery | Source link now; negotiate a feed/licensing arrangement for a shared catalogue. |
| [The Public Domain Review](https://publicdomainreview.org/reusing-material) | Occasional historical science and technology reads | Individually check CC BY-SA terms and exceptions; preserve attribution/licensing and check illustrations separately. |

The server transiently extracts text when a reader submits a URL; imported full text is returned to that reader and stored only in their browser. It is not added to a public catalogue. Text selected for narration is sent to ElevenLabs. Personal import is a product flow, not a blanket copyright exemption: do not assume all readable publisher pages can be republished or narrated. Publisher text, illustration and audio rights should be tracked separately for the shared catalogue.

The importer does not run publisher scripts, sign in or bypass paywalls. Some sites, PDFs and pages rendered entirely with JavaScript will fail. Readability can include sidebars or omit content; readers should check the imported text. Use paste text for a clean article. Imports are limited to 60,000 characters and 30 saved items. Only text is rendered, without publisher HTML or remote image tracking.

## Build plan after this prototype

1. **Content quality:** select approved sources for each topic; add licensed feeds, editorial review, attribution and separate text/image/audio permission records. Define a transparent popularity score using real signals per source.
2. **Listening:** audition 3–4 voices on medical terminology, AI abbreviations and crypto terms; add pronunciation dictionaries, persistent audio caching, seamless streaming and text/audio alignment.
3. **Accounts:** add private libraries with authentication, cross-device progress, deletion/export and a persistent narration quota.
4. **Public web release:** accessibility checks, publisher agreements, live-source monitoring, usage analytics and a provider billing cap.
5. **App Store and Android:** build native clients against the same authenticated article/audio API; add background audio, lock-screen controls and offline reading before store submission.

Suggested entities for the shared backend: `articles`, `article_sources`, `article_permissions`, `voices`, `audio_sections`, `user_bookmarks`, `user_progress`, `usage_events`. Keep public licensed articles and private user imports separate.

## Validation

```sh
npm run test
npm run typecheck
npm run build
```

Tests cover URL/IP filtering (including encoded and mapped loopback addresses), text-only article extraction, unreadable/oversized input and full-text narration chunking. Each redirect is revalidated and connections pin a verified public DNS address to block local-network access and DNS rebinding.

No real ElevenLabs generation has been performed without an account key. Browser audio controls can be verified with a mocked provider response; an actual voice audition and quota check remain required after configuration.
