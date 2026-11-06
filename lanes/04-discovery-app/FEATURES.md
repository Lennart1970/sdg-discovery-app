# Lane 04 — Feature map

Honest map of what this repo’s app is today (inspected 2026-11-06). This is the discovery platform that already lives here; colony docs do not replace it.

## Product

| Feature | State | Notes |
|---------|-------|-------|
| Challenge Extractor agent | Present | `server/agents/challengeExtractorAgent.ts` — solution-free challenges, confidence scoring, SDG/geography/sector metadata |
| Technology Discovery agent | Present | `server/agents/techDiscoveryAgent.ts` — functions → principles → technology classes; €10k bands; 2–3 paths |
| Journey UI | Present | `/` lists challenges |
| Extract UI | Present | `/extract` paste/extract flow |
| Pathway UI | Present | `/pathway/:id` tech paths for a challenge |
| Sources / documents | Present | `/sources`, `/documents` — Europe sources ingestion path exists |
| Prompts registry UI | Present | `/prompts` |
| Auth | Present | Manus OAuth (`server/_core/oauth.ts`); login route |
| Structured LLM logging | Present | JSON audit logs via `server/agents/logger.ts` |
| LLM routing | Present | OpenAI structured outputs; Grok (xAI) used when scraping is blocked (recent main commits) |

## Stack (as documented in root README)

- Frontend: React 19 + Tailwind CSS 4 + tRPC (Vite)
- Backend: Express 4 + tRPC 11
- Database: MySQL/TiDB via Drizzle (`drizzle/`, `server/db.ts`)
- Auth: Manus OAuth
- Tests: Vitest (`server/*.test.ts`)

## Schema (present)

`users`, `organizations`, `source_feeds`, `challenges`, `tech_discovery_runs`, `tech_paths` — plus seed for organizations/feeds.

## Related but not this lane

| Repo | Relationship |
|------|----------------|
| `Lennart1970/sdg-challenge-pipeline` | Earlier/sibling Python pipeline; do not retarget |
| `Lennart1970/SDG_Initiative`, `Lennart1970/SDG-initiative` | Separate Manus course / initiative apps; not this colony home |
| Per-problem Pages repos | Lane 03 related outputs only |

## Known gaps (from `todo.md`, not started here)

- Performance indexes
- Persist raw prompts/responses in DB (not only logs)
- Supabase Storage uploads for PDFs/images
- Some Phase 5–style storage work still open

Colony rule for this first PR: **docs only — no app refactor.**
