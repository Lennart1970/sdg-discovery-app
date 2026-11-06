# unsdg colony

This repository is the **colony home** for Lennart van Bolderick’s UN SDG work: affordable, human-scale technology pathways for sustainability problems.

Lanes are fixed specialisms, not agents and not tasks. Each lane owns one job. Agents (Grok Bot unsdg, Cursor threads, a pages publisher bot) attach to a lane when they work; they do not replace the lane.

## Lanes

| Lane | Job |
|------|-----|
| [01-colony-coordination](01-colony-coordination/) | Keep the colony coherent: rules, handoffs, overview |
| [02-problem-radar](02-problem-radar/) | Maintain the approved problem list and propose at most one weekly action |
| [03-pages-publishing](03-pages-publishing/) | Track related GitHub Pages outputs (do not retarget those repos here) |
| [04-discovery-app](04-discovery-app/) | Own this repo’s existing two-agent discovery platform |

Each lane has three files:

- `INITIATING.md` — one job, voice, anti-jobs
- `FEATURES.md` — feature map (what exists / what is in scope)
- `STATUS.md` — current state overview

## Colony rules

1. **Specialists, not tasks.** A lane is a durable specialism. Do not invent ad-hoc lanes for one-off chores.
2. **Initiating statement first.** Before work, read the lane’s `INITIATING.md`. Stay inside the job; respect anti-jobs.
3. **STATUS is transparency, not control.** Entries carry **owner** (agent id or named bot) and **date**. Ownership records who last touched the lane; Lennart decides what ships.
4. **GitHub PRs are the handoff and evidence basis.** Work lands as a PR. Lennart signs off by merging. No merge, no ship.
5. **Grok Bot unsdg is the human-facing overview and communicator.** It proposes at most one weekly action from the approved problem list, or nothing. Nothing happens without Lennart’s OK. No Telegram.
6. **Cursor threads do the heavy work** (docs and code). Cron and search work may later move into this colony or to Railway; do not invent that move until Lennart asks.
7. **No secrets in the repo.** No tokens, personal data, or connector credentials. Drive links are fine when needed.
8. **Do not rewrite this app casually.** The discovery platform in this repo stays intact unless a dedicated, merged PR changes it.
9. **Related repos are not this colony home.** Do not retarget or rewrite:
   - `Lennart1970/SDG_Initiative`
   - `Lennart1970/SDG-initiative` (Manus 12-week course app)
   - `Lennart1970/sdg-challenge-pipeline`
   - Per-problem Pages repos such as `Lennart1970/kunst-via-naasten` and `Lennart1970/kom-van-de-bank-af` (GitHub Pages on; last commit ~26 Oct 2026). A pages publisher bot publishes into per-project `Lennart1970` repos. Mention them as related outputs only.

## Context references (canvases)

Cursor canvases are references only; do not treat them as editable from this repo.

- Problem list (Grok canvas *SDG probleemradar*): [917 Lennart-approved problems](https://cursor.com/canvas/store-001384f2-2d70-40db-8675-11163d6e2bd7/f0f7270c-c446-4fa2-b0d4-40baab4f6168) — weekcheck sources last checked 2 Nov 2026
- Project notes: [weekly one action; open review items](https://cursor.com/canvas/store-001384f2-2d70-40db-8675-11163d6e2bd7/2c057f07-408c-495a-ad78-6fcf95881cb7)
- Colony design: [colony design canvas](https://cursor.com/canvas/store-001384f2-2d70-40db-8675-11163d6e2bd7/f40a4d66-41b7-49ca-844c-8e5d2172c59e)

## How to contribute in this colony

1. Pick the lane that matches the job.
2. Read `INITIATING.md` and current `STATUS.md`.
3. Open a branch and a PR with evidence.
4. Update that lane’s `STATUS.md` (owner + date) in the same PR when state changes.
5. Wait for Lennart to merge.
