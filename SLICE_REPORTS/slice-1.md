# Slice S1 — Login streak core — SLICE REPORT

**Status:** ✅ DONE (director independently re-verified host + live)
**Date:** 2026-06-05
**Dispatch:** 1 senior-engineer subagent (S1-1..S1-17, TDD red→green); one director-issued fix cycle (live-gate). Director ran S1-18.

## What shipped
Idempotent login check-in + current-state read with a correct, conditional-write login streak engine, layered handler→service→repository. Canonical `/api/v1/player/streaks(/check-in)` + the `/api/v1/streaks` alias, behind stub `X-Player-Id` auth.

## Definition of Done — evidence

| DoD check | Result | Evidence |
|---|---|---|
| `npm test` green incl. 5 worked login targets + integration | ✅ | `Test Suites: 7 passed / Tests: 30 passed` (12 S0 + 7 service + 6 repo + 5 integration) |
| `npm run typecheck` | ✅ | 0 errors |
| Live double-check-in `true` then `false`, both 200 | ✅ | player `dir-…`: 1st `streakAdvanced:true loginStreak:1`; 2nd `streakAdvanced:false loginStreak:1` |
| `GET …/player/streaks` correct | ✅ | `loginStreak:1`; alias `/api/v1/streaks` byte-identical |
| Zero-state unseen player | ✅ | `200` all-zeros, `lastLoginDate/lastPlayDate:null`, next-milestone = 3-day rung |
| No-auth | ✅ | `401 {"error":"Unauthorized","message":"X-Player-Id header is required"}` |
| Inv 3 — no bare `ADD` on streak | ✅ | `grep 'ADD ' dynamo.repository.ts` clean; advance/reset use `SET loginStreak = :n` |
| Inv 6 — layered | ✅ | no `docClient` in handlers/services (only doc-comments); IO in repository |
| Inv 1 — single UTC source | ✅ | today/yesterday computed once at edge via `lib/utc.ts` (`nowIso()` added); no stray day-math |
| STND-3 — no `console.log` | ✅ | grep clean |

## Wire-contract conformance (director-owned)
`GET` returns the exact §4.1 nine fields; `POST` returns the §4.2 shape with `freezeConsumed:false`/`milestoneEarned:null` wired as placeholders (freeze=S4, rewards=S3). `daysRemaining = days − streak` verified (streak 1 → 2, streak 0 → 3).

## Repository (mocked-docClient unit tests)
`createPlayer` → `attribute_not_exists(playerId)`; `putActivity` → `attribute_not_exists(#date)` (`#date` alias, returns false on `ConditionalCheckFailedException`); `advanceLoginStreak` → `ConditionExpression: lastLoginDate = :yesterday` + `SET`; `resetLoginStreak` (added) → `SET`, guarded `lastLoginDate <> :today`.

## Fix cycle (caught at the live gate, not by host tests)
Host tests were green while the live API was down — see **ASSUMPTIONS A-5**: (1) `winston` pulled into the esbuild bundle via the shared logger couldn't resolve → marked external; (2) serverless-offline clobbered AWS creds → declared `DYNAMODB_ENDPOINT`/`AWS_*` in offline `provider.environment`. Config-only, no app-code/dep change. This validated the director's two-stage verify protocol: a passing host suite is not a passing slice.

## Notable additions (beyond the literal items, all benign)
- `lib/utc.ts:nowIso()` single current-instant source (keeps Inv-1 grep clean).
- `handlers/presenter.ts` for §4.1 wire mapping + zero-state.
- `logger.d.ts` shared-interop declaration (mirrors `dynamo.d.ts`); minimal error-path logging only (full sweep = S7).
- `RewardRecord`/`NotificationPayload` types pre-declared so `milestoneEarned` is typed for S3.
- dev deps `supertest` + `@types/supertest` (test-infra, justified).

## Carried into later slices
- `freezeConsumed` (S4) and `milestoneEarned` (S3) are placeholders to be wired.
- Jest integration tests require the Docker stack up (DynamoDB Local at :8000); `jest.setup.ts` sets the local endpoint/creds.

## Commits
- `8dad341` feat: domain types + next-milestone helper (login)
- `9967093` feat: login check-in service — increment/reset/idempotent (red→green)
- `c0ada5c` feat: dynamo repository conditional login writes (red→green)
- `633b229` feat: check-in + streaks handlers, canonical path + alias
- `00084d8` test: integration check-in → streak read
- `b0587cf` fix: mark winston external + offline DynamoDB-Local env (live-gate)
