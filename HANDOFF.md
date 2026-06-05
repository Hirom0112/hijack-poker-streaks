# HANDOFF — Hijack Poker Daily Streaks (Option C)

**Date:** 2026-06-05 · **State:** ✅ **BUILD COMPLETE.** All slices S0–S10 + the BL login/themes bonus are done, verified live, and committed. Nothing is pushed.

## TL;DR
A full daily-streaks feature on the cloned Hijack skeleton: TypeScript serverless-offline backend + React/MUI dashboard, login & play streaks, milestone rewards, freeze protection, calendar heat map, share card, admin tooling, scheduled-freeze cron, CI. **190 tests** (161 backend + 29 frontend), typecheck clean, every slice gate re-verified by the director against the running stack.

## How to run (verified top-to-bottom)
```bash
cd serverless-v2  # from skeleton root the compose file is at root:
docker compose --profile streaks up        # MySQL, Redis, DynamoDB Local + init, api:5001, frontend:4001
node scripts/seed-streaks.js               # idempotent; players streak-001..010
open http://localhost:4001                 # dashboard (default player streak-001)
git config core.hooksPath .githooks        # enable pre-push (tsc + tests)
```
Demo target: **player `streak-001`, month `2026-04`** (all 5 heat-map states). Internal/admin secret: `dev-internal-secret`.

## What shipped (per slice — see SLICE_REPORTS/)
- **S0** TS foundation · **S1** login streak · **S2** play streak + internal hand-completed · **S3** milestone rewards (atomic txn) · **S4** freeze protection (lazy eval, monthly grant, admin grant 99-cap) · **S5** calendar (one Query) + idempotent seed · **S6** React dashboard (RTL/MSW, real-browser verified) · **S7** hardening + docs (canonical error contract, logging, clean test exit, README, ADRs) — **CORE-SHIPPABLE** · **S8** admin history + scheduled-freeze cron · **S9** share-card SVG · **S10** CI.
- **BL (bonus):** intro video → art-deco login → dashboard flow + 3 selectable themes (dark/lounge/neon). Screenshots in `SLICE_REPORTS/bonus-*.png`.

## Verification standard used
Every slice: subagent builds TDD red→green → director independently re-runs the host suite + invariant greps + a **live curl/browser walkthrough** before marking `[x]`. Caught real bugs the host tests masked (winston/esbuild offline break S1; seed accumulation S5). The user's external review findings (404 shape, `--forceExit`) were folded into S7 and fixed.

## State of the repo
- Branch: the skeleton's working branch (commits direct, CLAUDE.md §4 trunk model). **61 commits** since the planning baseline (`06db546`). Clean tree.
- All ASSUMPTIONS A-1..A-7 reconciled into their docs (S7). 11 ADRs.
- TODO.md: 126 items `[x]`. Remaining `[ ]` are the 4 standing invariants (ongoing, all green) + **PI-1** (trivial: `scripts/init-dynamodb.sh` creates 2 of 4 tables — fix when convenient; not used by CI/compose).

## Optional next steps (none blocking)
1. **Deliver:** the CLAUDE.md deliverable is "one clean PR against the skeleton's `main`." Nothing is pushed yet — needs a remote + the user's go-ahead (outward-facing). Per user memory, pushes target GitHub + the self-hosted GitLab; confirm which remote(s) for this skeleton.
2. **PI-1** init-dynamodb.sh fix.
3. Docs-align polish: `RESEARCH.md` lives in the parent dir (not in the skeleton repo), so its citations across the doc suite are dangling within this repo — vendor it or sweep the citations.
4. Local DynamoDB has leftover `test-s4-*`/`test-*` integration-test rows (harmless residue); purge for a pristine demo DB if desired.
5. CI (`streaks-ci.yml`) only runs once pushed to GitHub — unverified live until then (YAML validated, commands mirror the pre-push hook).

## Key paths
Backend `serverless-v2/services/streaks-api/src/{handlers,services,repositories,lib,middleware,config,domain}`; frontend `serverless-v2/services/streaks-frontend/src/{components,store,types}`; seed `scripts/seed-streaks.js`; docs `*.md` + `SLICE_REPORTS/`.
