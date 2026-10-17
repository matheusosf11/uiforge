# Phase 1: User Setup Required

**Generated:** 2026-10-15
**Phase:** 01-foundation-streaming-generation
**Status:** Incomplete

Complete these items so plan 01-02 (`POST /api/generate`) can call Gemini. Claude automated the scaffold and `.env.example`; the API key requires your Google account.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio → Get API key](https://aistudio.google.com/apikey) | `.env.local` |

Copy `.env.example` to `.env.local` and paste the key. Never prefix this variable with `NEXT_PUBLIC_`.

## Account Setup

- [ ] **Create a Google AI Studio API key** (if needed)
  - URL: https://aistudio.google.com/apikey
  - Skip if: You already have a Gemini API key

## Dashboard Configuration

None — no extra Google Cloud project wiring is required for the free-tier Gemini key used by `@ai-sdk/google`.

## Local Development

```bash
cp .env.example .env.local
# paste GOOGLE_GENERATIVE_AI_API_KEY=... into .env.local
npm run dev
```

`.env.local` is gitignored. Do not commit the real key.

## Verification

After completing setup:

```bash
# Key is present locally and not committed
test -f .env.local && grep -q '^GOOGLE_GENERATIVE_AI_API_KEY=.\+' .env.local
git check-ignore -v .env.local

# After 01-02: stream a component from the running dev server
npm run dev
curl -N -X POST http://localhost:3000/api/generate -H "content-type: application/json" -d '{"prompt":"a button"}'
```

Expected results:
- `.env.local` exists and contains a non-empty key
- `git check-ignore` reports `.env*.local` (file is ignored)
- `npm run build` still succeeds (the key is not required at build time)
- With the key set, `curl -N` streams TSX tokens (not a JSON chat payload)

---

**Once all items complete:** Mark status as "Complete" at top of file.
