# Slice S5 — Calendar + seed — SLICE REPORT

**Status:** ✅ DONE (director re-verified host + live, incl. seed idempotency)
**Date:** 2026-06-05
**Dispatch:** 1 senior-engineer subagent (S5-1..S5-10, TDD) + one director-issued fix (seed idempotency). Director ran S5-11.

## What shipped
The calendar month endpoint (a single `Query`, the 4th SM-5 invariant) and a full rewrite of `scripts/seed-streaks.js` to the login/play/freeze/reward model — the data that makes the S6 dashboard demonstrable.

## Definition of Done — evidence

| DoD check | Result | Evidence |
|---|---|---|
| `npm test` green incl. 5 derivations + priority + validation | ✅ | `Test Suites: 15 / Tests: 127 passed` (+34 over S4) |
| `npm run typecheck` | ✅ | 0 errors |
| Calendar = one `Query` (no `Scan`) — **SM-5 #4** | ✅ | `queryMonth` = `QueryCommand` `begins_with(#date,:ym)`; `grep Scan src/{handlers,services,repositories}` clean (NFR-8) |
| Live dense month, all 5 states | ✅ | `streak-001` April 2026: `{none:7, login_only:11, played:9, freeze:2, broken:1}` — all 5 heat-map colors in one month |
| Malformed month → 400 | ✅ | `?month=2026-13` / `feb` → `400 BadRequest` |
| Omitted month → current UTC | ✅ | no param → `200 month:"2026-06"`, 30 days |
| Seeded endpoints non-empty | ✅ | `streak-001` streaks/rewards/freezes all return seeded data |
| **Seed idempotency** (re-runnable, no accumulation) | ✅ | two consecutive runs → IDENTICAL `427 activity / 79 rewards / 13 freeze`; rewards for `streak-001` = 12 total, 12 distinct, **0 same-day dupes** |

## Calendar
`deriveActivity` is total + order-independent with the canonical priority `played > freeze > broken > login_only > none`. Dense array: one entry per calendar day ascending, absent/future days `none`-zeroed. Validation single-sourced in `lib/utc.ts` (`isValidYearMonth`, `monthDays`, `monthOf`). Handler thin, canonical path + alias, no `docClient`. +6 calendar integration cases.

## Seed rewrite (`scripts/seed-streaks.js`)
- 10 players `streak-001..010` + consistency weights; 60 days ending today; `loggedIn~Bernoulli(consistency)`, `played~Bernoulli(consistency*0.6)`; gap-reset walk for `loginStreakAtDay`/`playStreakAtDay`; some single-day gaps freeze-protected (freeze-history row + decremented balance + `freezeUsed:true`); a `streaks-rewards` row whenever a counter equals a milestone (incl. re-award); aggregate derived last. Legacy fields dropped.
- **Idempotency fix (director-issued):** wipes each of the 10 players' rows across all 4 tables before writing — bounded per-player `Query` by PK + `BatchWriteCommand` deletes (chunks of 25, no `Scan`). Random draws use a deterministic seeded PRNG (mulberry32; override via `SEED_RANDOM`) so re-runs are byte-stable.
- **Self-locating:** the script pushes the streaks-api `node_modules` onto `module.paths`, so both `node scripts/seed-streaks.js` and `npm run seed:streaks` work bare (no `NODE_PATH` needed). The repo root has no `node_modules`.

## Demo note for S6/S7
Use **`streak-001`, month `2026-04`** as the dashboard demo target — it shows all 5 heat-map states in one month. (Current month June only has ~5 days of history.)

## Carried / notes
- Sibling tools `scripts/seed-rewards.js`, `scripts/simulate-hands.js` have the same latent `node_modules` resolution issue (pre-existing, not introduced); fix with the same one-liner if `npm run seed:rewards`/`simulate:hands` need to run bare.
- Seed `source` rule: first freeze of a month = `free_monthly`, later = `purchased` (matches FR-3.1 framing).

## Commits
- `c6f5d18` feat: calendar.service — deriveActivity + dense month + validation (red→green)
- `afa3712` feat: repository queryMonth (begins_with, no Scan)
- `24782dd` feat: calendar handler
- `4dc7cb9` feat(seed): rewrite seed-streaks to login/play/freeze/reward model
- `207c0fc` fix(seed): wipe seeded players before write so re-runs are idempotent
