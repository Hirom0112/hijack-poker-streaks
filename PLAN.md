# PLAN.md — Hijack Poker Daily Streaks (Option C)

**Status:** Build-ready execution plan. Produced by the slice-planning skill from the locked doc suite. **This plan is the bridge between the docs and the build; it does not itself contain code.**
**Inputs (read in precedence order):** [`PROJECT.md`](PROJECT.md) → [`DATA_MODEL.md`](DATA_MODEL.md) / [`API_CONTRACT.md`](API_CONTRACT.md) → [`ARCHITECTURE.md`](ARCHITECTURE.md) → [`TECH_STACK.md`](TECH_STACK.md) → [`CLAUDE.md`](CLAUDE.md), grounded in [`../RESEARCH.md`](../RESEARCH.md) and the official spec [`docs/challenge-streaks.md`](docs/challenge-streaks.md).
**Companion:** [`TODO.md`](TODO.md) is the per-item build contract; this doc is the per-slice strategy. When they disagree, fix both — they ship together.

---

## 0. How to use this plan

- **Build order is fixed (PROJECT.md §10, CLAUDE.md §2):** S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 (Must+Should core, shippable) → **then** the bonus phase S8 → S9 → S10. Do **not** start a slice until the previous slice's Definition of Done (DoD) passes.
- **Gate rule:** a slice is not "done" until its DoD verification commands actually run green and its *Runnable result* (PROJECT.md §10) is observed, not assumed (CLAUDE.md §5). The director marks `[x]` in TODO.md only after that verification. A DoD walkthrough is written to `SLICE_REPORTS/slice-N.md` at each gate.
- **Over-scope discipline (PROJECT.md §7, CLAUDE.md §2):** never open a bonus slice (S8–S10) while any core slice (S0–S7) is unfinished. If time runs short, the core ships complete and unfinished bonuses are documented in the README's "what we'd do next."
- **TDD is mandatory in strict scopes (CLAUDE.md §3):** `lib/utc.ts`, `services/streak.service.ts`, `services/play.service.ts`, `services/freeze.service.ts`, `services/reward.service.ts`, `services/calendar.service.ts`, `services/share.service.ts`, and the repository conditional-write/transaction helpers. Write the failing unit test first, with **exact** expected values. Handlers/routes are covered by the integration test; frontend components by RTL+MSW acceptance tests.
- **Commit at green (CLAUDE.md §4):** each commit pairs passing tests with the code that makes them pass; refactors are separate commits; conventional-commit style with a package scope.

### Assumption protocol (CLAUDE.md doc precedence)

- **Gaps or doc conflicts that are resolvable by the precedence order** (PROJECT.md > ARCHITECTURE.md > DATA_MODEL.md/API_CONTRACT.md > TECH_STACK.md > CLAUDE.md; the official `docs/challenge-streaks.md` wins on *functional* behavior) are resolved, recorded in [`ASSUMPTIONS.md`](ASSUMPTIONS.md), and the losing doc is corrected — never silently. Three such conflicts are already found and resolved there (internal-secret default value, seed player-id convention, DB-down HTTP code). Re-read ASSUMPTIONS.md before S0 and S7.
- **True blockers** (a decision the docs cannot settle, or an environmental failure) go in `BLOCKED.md` with the exact question and what was tried, and the slice stops there rather than guessing.

### Standing items (apply to every slice)

- Keep `ASSUMPTIONS.md` current; cite the FR/NFR/ADR and the doc precedence used for each entry.
- Every new env var lands in **three** places together (CLAUDE.md §5.5, TECH_STACK.md §4): `docker-compose.yml` `streaks-api` env, `.env.example`, and TECH_STACK.md §4.
- Every write path logs structured `winston` with `playerId` + `correlationId` (NFR-6).
- Keep the repo junior-navigable (CLAUDE.md §8): clear layout, package docstrings, no cruft, a README that runs.
- The dependency budget is **11 required top-level installs** (TECH_STACK.md §2). Adding anything beyond reopens TECH_STACK.md.

---

## Slice S0 — TypeScript foundation

**Objective.** Convert the CommonJS `streaks-api` skeleton to a strict-TypeScript, layered, test-runnable service and wire the 4-table env, so every later slice builds on a green baseline. Implements PROJECT.md §10 **S0** (NFR-1, NFR-9; repo/build/test pipeline).

**Roadmap target / Runnable result.** `streaks-api` builds in TS; `GET /api/v1/health` works; `utcDay()` unit tests pass; all four table env vars + `INTERNAL_API_SECRET` + `FREEZE_CRON_ENABLED` are wired through docker-compose, `.env.example`, and `serverless.*.yml`.

**Ordered task breakdown** (RED tests named for the strict scope — `lib/utc.ts`):

1. Add the TS toolchain to `streaks-api/package.json` (TECH_STACK.md §1–2): `typescript ^5.4.0`, `ts-jest ^29.1.0`, `serverless-esbuild ^0.8.0` (dev), `luxon ^3.4.0` (prod), `@types/luxon ^3.4.0` (dev). Add scripts `typecheck` (`tsc --noEmit`) and switch `test` to ts-jest. **Do not exceed the 5 backend installs.**
2. Add `tsconfig.json` (TECH_STACK.md §3): `strict: true`, `esModuleInterop`, `skipLibCheck`, `module: CommonJS`, `target: ES2022` (`--target=node20` lower bound). Add `serverless-esbuild` config so `serverless offline` runs `.ts` handlers.
3. Hand-write `shared/config/dynamo.d.ts` exporting `{ docClient, ddbClient }` typed as `DynamoDBDocumentClient`/`DynamoDBClient` (TECH_STACK.md §3 interop option 1).
4. **RED:** `__tests__/lib/utc.test.ts` → `utc › utcDay/yesterday/daysBetween/yearMonth` pins: `utcDay('2026-02-20T00:00:00Z') === '2026-02-20'` (midnight-boundary edge, spec §Edge 3); `yesterday('2026-03-01') === '2026-02-28'`; `daysBetween('2026-02-18','2026-02-20') === 2`; `yearMonth('2026-06-05') === '2026-06'`. **GREEN:** `src/lib/utc.ts` using Luxon `DateTime.utc().toISODate()` (NFR-1, CLAUDE.md Inv 1).
5. Port `handler.js` → `handler.ts` (Express + `serverless-http`, keep `module.exports.api = serverless(app)` contract via `esModuleInterop`); port `src/middleware/auth.js` → `auth.ts` (unchanged 401 shape) and add `src/middleware/internalAuth.ts` (shared-secret guard, returns **403** per API_CONTRACT.md §2.2/§3 — see ASSUMPTIONS.md). Port `src/routes/health.js` → `src/routes/health.ts`.
6. Reshape the existing health test: replace the brittle `healthRoute.stack[...]` reach-in (`__tests__/health.test.js`) with `__tests__/health.test.ts` asserting `service:'streaks-api'`, `status:'ok'`, `timestamp` defined. Keep `testMatch` updated to `*.test.ts`.
7. Wire env (CLAUDE.md Inv 11, TECH_STACK.md §4): add `STREAKS_REWARDS_TABLE=streaks-rewards`, `STREAKS_FREEZE_HISTORY_TABLE=streaks-freeze-history`, `INTERNAL_API_SECRET=dev-internal-secret`, `FREEZE_CRON_ENABLED=false` to `docker-compose.yml` `streaks-api` env + `.env.example` + `serverless.offline.yml` provider.environment. (The 4 tables already exist in `dynamodb-init`, docker-compose ~L112–147 — do **not** change names/keys.)
8. Establish the layered skeleton dirs (empty but real): `src/handlers/`, `src/services/`, `src/repositories/`, `src/domain/`, `src/config/`. Port `src/config/constants.js` milestone helpers → `src/config/constants.ts` + `src/config/milestones.ts` (identical values, DATA_MODEL.md §9), keeping the single-source `MILESTONES` table.
9. Stand up the `.githooks/pre-push` (CLAUDE.md §4): runs `tsc --noEmit` + `npm test` for changed packages; document `git config core.hooksPath .githooks` in README setup.

**Planned commit sequence.**
- `build(streaks-api): add TypeScript + ts-jest + esbuild toolchain and tsconfig`
- `test(streaks-api): utcDay/yesterday/daysBetween unit tests (red→green)`
- `refactor(streaks-api): port handler, auth, health to TypeScript; layered dirs`
- `feat(streaks-api): wire rewards/freeze-history tables + internal secret env`
- `chore(repo): add pre-push hook (typecheck + tests)`

**Definition of Done → verification.**
- `cd serverless-v2/services/streaks-api && npm run typecheck` → 0 errors.
- `npm test` → green (utc + health).
- `docker compose --profile streaks up` → `curl http://localhost:5001/api/v1/health` returns `{service:'streaks-api',status:'ok',...}`.
- `grep -E 'STREAKS_REWARDS_TABLE|STREAKS_FREEZE_HISTORY_TABLE|INTERNAL_API_SECRET|FREEZE_CRON_ENABLED' docker-compose.yml .env.example` finds all four.
- `SLICE_REPORTS/slice-0.md` written.

**Dependencies.** None.
**Top risks.** (1) *CJS↔TS interop friction with `shared/`* → mitigated by the hand-written `.d.ts` (option 1) and `allowJs` fallback (option 2), TECH_STACK.md §3; reopen ADR-7 only if friction is unworkable (PROJECT.md §11.1). (2) *`serverless-esbuild` not transpiling `.ts` for `serverless-offline`* → verify with the health curl before declaring S0 done; fall back to `serverless-plugin-typescript` only if esbuild fails (note in ASSUMPTIONS.md, do not silently swap).

---

## Slice S1 — Login streak core

**Objective.** Idempotent login check-in + current-state read with a correct, conditional-write login streak engine. Implements PROJECT.md §10 **S1** (FR-1.1/1.4–1.7, FR-5.1–5.2, NFR-2).

**Roadmap target / Runnable result.** `POST /api/v1/player/streaks/check-in` (idempotent) and `GET /api/v1/player/streaks` return the correct login streak; unit + integration tests green.

**Ordered task breakdown** (strict scopes: `streak.service.ts`, repository helpers — RED first, exact values from CLAUDE.md §3 worked targets):

1. **RED/GREEN domain types.** `src/domain/types.ts` — `PlayerStreak`, `ActivityDay`, `StreaksResponse`, `CheckInResponse`, `NextMilestone` mirroring API_CONTRACT.md §4.1/§4.2/§5.5 and DATA_MODEL.md appendix. (Type-only; verified by `tsc`.)
2. **RED:** `streak.service.test.ts › first check-in (new player)` → no `lastLoginDate` ⇒ `loginStreak=1`, `bestLoginStreak=1`, activity `{loggedIn:true, loginStreakAtDay:1, streakBroken:false}` (spec §Edge 6). **GREEN:** `streak.service.ts` new-player branch.
3. **RED:** `streak.service.test.ts › consecutive day` → `lastLoginDate=yesterday`, `loginStreak=4` ⇒ `loginStreak=5`. **GREEN:** consecutive increment branch.
4. **RED:** `streak.service.test.ts › idempotent same-day` → second same-day check-in leaves `loginStreak` unchanged, one activity row, both responses computed as `streakAdvanced:false`. **GREEN:** activity-row `attribute_not_exists(#date)` short-circuit (DATA_MODEL.md §7 pattern D, §8).
5. **RED:** `streak.service.test.ts › missed day, no freeze` → `lastLoginDate=2 days ago`, `freezesAvailable=0`, `loginStreak=9` ⇒ `loginStreak=1`, activity `streakBroken:true` (FR-1.5). **GREEN:** reset branch (freeze paths land in S4; here `freezesAvailable=0` only).
6. **RED:** `streak.service.test.ts › nextLoginMilestone math` → `loginStreak=12` ⇒ `{days:14,reward:400,daysRemaining:2}`; `loginStreak>=90` ⇒ `null` (API_CONTRACT.md §4.1, §5.5). **GREEN:** next-milestone helper using `config/milestones.ts`.
7. **Repository helpers** (`dynamo.repository.ts`, strict scope for the conditional writes): `getPlayer`, `createPlayer` (`attribute_not_exists(playerId)`, pattern B), `putActivity` (`attribute_not_exists(#date)`, pattern D), conditional `advanceLoginStreak` `UpdateCommand` (`ConditionExpression: lastLoginDate = :yesterday`, pattern C — **never a bare `ADD`**, CLAUDE.md Inv 3). Unit-test the condition-expression construction with a mocked `docClient`.
8. **Handlers.** `src/handlers/check-in.ts` (FR-5.2) and `src/handlers/streaks.ts` (FR-5.1), thin: compute `today/yesterday` once at the edge (NFR-1), call `streak.service`, map to the API_CONTRACT.md §4.1/§4.2 shapes. Mount canonical `/api/v1/player/streaks…` **and** the `/api/v1/streaks…` alias (ADR-6) behind `authMiddleware`.
9. **Integration test** (`__tests__/integration/check-in.int.test.ts`, supertest + DynamoDB Local): new player → `POST check-in` → `200 streakAdvanced:true loginStreak:1`; repeat same day → `200 streakAdvanced:false`; `GET /player/streaks` → `loginStreak:1`. Zero-state `GET` for an unseen player returns `200` all-zeros (API_CONTRACT.md §4.1 canonical behavior, see ASSUMPTIONS.md).

**Planned commit sequence.**
- `feat(streaks-api): domain types + milestone helpers (login axis)`
- `feat(streaks-api): login check-in service — increment/reset/idempotent (red→green)`
- `feat(streaks-api): dynamo repository conditional login writes`
- `feat(streaks-api): check-in + streaks handlers with canonical path + alias`
- `test(streaks-api): integration check-in → streak read`

**Definition of Done → verification.**
- `npm test` green incl. the 5 worked login targets + integration.
- Live: `curl -X POST …/check-in -H 'X-Player-Id: streak-001'` twice → first `streakAdvanced:true`, second `false`, both `200`; `GET …/player/streaks` shows the value.
- `grep -n 'ADD ' src/repositories/dynamo.repository.ts` finds **no** bare atomic counter on streak length.
- `SLICE_REPORTS/slice-1.md` written.

**Dependencies.** S0.
**Top risks.** (1) *Double-increment on retry* → the activity-row conditional write is the source of truth, the player `UpdateCommand` is condition-guarded as defense-in-depth (ARCHITECTURE.md §5a); the idempotent-same-day test is the gate. (2) *UTC math scattered* → enforce single `utcDay()` at the edge; `grep` for `new Date(` in services/repositories must find none (NFR-1).

---

## Slice S2 — Play streak + internal event

**Objective.** Independent play-streak axis driven by the internal hand-completed event, idempotent per UTC day. Implements PROJECT.md §10 **S2** (FR-1.2/1.3, FR-6).

**Roadmap target / Runnable result.** `POST /internal/streaks/hand-completed` advances the play streak idempotently and independently from login.

**Ordered task breakdown** (strict scope: `play.service.ts`):

1. **RED:** `play.service.test.ts › first hand of day` → `playStreak` advances, activity `played:true, playStreakAtDay:n`; uses `day = utcDay(completedAt)` (the **hand's** UTC day, not now — ARCHITECTURE.md §5b, spec §Edge 1). **GREEN:** `play.service.ts` advance branch.
2. **RED:** `play.service.test.ts › multiple hands same day` → second hand same UTC day is a no-op (`playStreakUpdated:false`), `played` already true (FR-6.2, spec §Edge 2). **GREEN:** conditional upsert `attribute_not_exists(#date) OR #played <> :true` (ARCHITECTURE.md §5b step 2; DATA_MODEL.md §7 pattern E merge).
3. **RED:** `play.service.test.ts › independence` → a hand-completed advances `playStreak` without touching `loginStreak`, and a login check-in does not touch `playStreak` (FR-1.3, CLAUDE.md §3 worked target). **GREEN:** keep the two axes' state separate on the player record.
4. **RED:** `play.service.test.ts › missed day reset` → play `lastPlayDate=2 days ago`, no freeze ⇒ `playStreak=1`, `streakBroken` recorded on the play axis.
5. **Repository.** Add `mergePlayed` (pattern E) and `advancePlayStreak` (conditional on `lastPlayDate = :yesterday`) to `dynamo.repository.ts`. The same-day activity row may be touched twice (login then hand) — create-once, narrowly-updatable (DATA_MODEL.md §3 ASSUMPTION).
6. **Handler + auth.** `src/handlers/internal.ts` (FR-6.1): `internalAuth` guard (shared secret → **403** on miss, API_CONTRACT.md §2.2/§4.6); validate `{playerId, tableId, handId, completedAt}` (400 on missing/invalid/non-ISO `completedAt`); **never** accept `X-Player-Id` on this surface (FR-6.3). Map to API_CONTRACT.md §4.6 response (`playStreakUpdated`, `date`, `playStreak`).
7. **Integration test:** post a hand → `playStreakUpdated:true playStreak:1`; repeat same `completedAt` → `false`; confirm `GET /player/streaks` shows `playStreak` advanced and `loginStreak` unchanged.

**Planned commit sequence.**
- `feat(streaks-api): play-streak service — advance/idempotent/independent (red→green)`
- `feat(streaks-api): repository played-merge + play-advance conditional writes`
- `feat(streaks-api): internal hand-completed handler with shared-secret guard`
- `test(streaks-api): integration hand-completed idempotency + independence`

**Definition of Done → verification.**
- `npm test` green incl. independence + multiple-hands targets.
- Live: `curl -X POST …/internal/streaks/hand-completed -H 'X-Internal-Secret: dev-internal-secret' -d '{…}'` twice → first `playStreakUpdated:true`, second `false`; missing secret → `403`; `X-Player-Id` alone → `403`.
- `SLICE_REPORTS/slice-2.md` written.

**Dependencies.** S1 (shared player record, repository, types).
**Top risks.** (1) *Internal endpoint leaking onto the player-auth surface* → route is mounted under `/internal` with `internalAuth` only; an explicit test asserts `X-Player-Id` does not authorize it (CLAUDE.md Inv 10). (2) *Crediting "now" instead of `completedAt`'s day* → the `utcDay(completedAt)` test is the gate (spec §Edge 1).

---

## Slice S3 — Milestone rewards

**Objective.** Atomic, once-per-instance milestone awards writing reward + `streak_bonus` txn + notification payload in one transaction, plus the rewards history read. Implements PROJECT.md §10 **S3** (FR-2; FR-7 push payload is partly seeded here, completed/audited in S8).

**Roadmap target / Runnable result.** Reaching a milestone writes a reward + `streak_bonus` txn + notification; once-per-instance; `GET …/rewards` lists them.

**Ordered task breakdown** (strict scope: `reward.service.ts`):

1. **RED:** `reward.service.test.ts › exact milestone fires once` → login streak advancing to `7` ⇒ one reward `{type:'login_milestone', milestone:7, points:150, streakCount:7}`; advancing to `8` ⇒ **no** new reward (FR-2.1/2.3, CLAUDE.md §3). **GREEN:** `getMilestone(n)` exact-match detection.
2. **RED:** `reward.service.test.ts › re-award after reset` → reach 7, reset, reach 7 again ⇒ a second reward with a new `rewardId` (FR-2.2). **GREEN:** detection keyed on *this advance hitting the exact value* (ARCHITECTURE.md §5d step 2).
3. **RED:** `reward.service.test.ts › play points differ` → play milestone 7 ⇒ `points:300`; 3 ⇒ `100` (DATA_MODEL.md §9 ladder). **GREEN:** points from `loginReward`/`playReward` by `type`.
4. **RED:** `reward.service.test.ts › notification payload` → reward carries `notification:{title, body, deepLink:'hijackpoker://streaks', milestone, type}` with milestone-aware loss-aversion-light body distinct for login vs play, e.g. `"You earned 150 bonus points for a 7-day login streak. 14 days unlocks 400!"` (FR-2.4/FR-7.3, API_CONTRACT.md §4.4). **GREEN:** payload builder.
5. **Repository transaction.** `awardMilestone` via **one `TransactWriteCommand`** (DATA_MODEL.md §8, ARCHITECTURE.md §5d): player `Update` + activity `Put` + `streaks-rewards` `Put` (carrying `pointTxnType:'streak_bonus'` §4 + `notification` Map §5) with `attribute_not_exists(rewardId)`. `rewardId` = ULID — install `ulid ^2.3.0` **only** if the sortable property is used by the rewards Query (it is — `ScanIndexForward=false`, pattern H); otherwise a timestamp-prefixed string (optional-dep justification, TECH_STACK.md §2). Record the choice in ASSUMPTIONS.md.
6. **Wire into check-in/hand-completed.** When `streak.service`/`play.service` cross a milestone, route the persist through `awardMilestone` (transaction); non-milestone writes stay plain conditional writes (cheap path, DATA_MODEL.md §8).
7. **Rewards read.** `src/handlers/rewards.ts` (FR-5.4) → `GET …/rewards` returns the top-level array newest-first (pattern H, `ScanIndexForward=false`), each element the §4.4 shape incl. `notification`; empty → `[]`.
8. **Integration test (the rubric flow, NFR-4/SM-2):** drive a player to a login milestone via check-ins → assert `milestoneEarned` on the crossing response, `null` on the next, and `GET …/rewards` returns exactly one reward for that milestone with the right points + notification.

**Planned commit sequence.**
- `feat(streaks-api): reward service — exact-milestone detection + re-award (red→green)`
- `feat(streaks-api): notification payload builder (FR-7 content)`
- `feat(streaks-api): atomic milestone TransactWrite (reward + txn + notification)`
- `feat(streaks-api): rewards history endpoint`
- `test(streaks-api): integration check-in → milestone reward`

**Definition of Done → verification.**
- `npm test` green incl. once-per-instance + re-award + integration.
- Live: drive `streak-001` to a milestone, `GET …/rewards` shows the reward with correct `points` and `notification`; a second crossing of the same milestone after a reset shows two rewards.
- `SLICE_REPORTS/slice-3.md` written.

**Dependencies.** S1 + S2 (both axes can award).
**Top risks.** (1) *Awarded-but-unrecorded reward* → impossible by construction: single `TransactWriteCommand` (ARCHITECTURE.md §7 partial-write row). The transaction is the gate. (2) *Milestone double-fire on retry* → the activity-row idempotency (S1/S2) guarantees the advance happens at most once/day, which is what makes "exactly once per instance" hold (ARCHITECTURE.md §5d step 2); covered by the idempotent-same-day test reaching a milestone day.

---

## Slice S4 — Freeze protection

**Objective.** Monthly free-freeze grant + lazy auto-consume (one freeze, one missed day, both axes) + admin grant + freeze read. Implements PROJECT.md §10 **S4** (FR-3, FR-5.5).

**Roadmap target / Runnable result.** Monthly grant + lazy auto-consume preserve a streak across one missed day; two missed days still reset; admin grant works; `GET …/freezes` returns balance + history.

**Ordered task breakdown** (strict scope: `freeze.service.ts`):

1. **RED:** `freeze.service.test.ts › missed one day, freeze available` → `lastLoginDate=2 days ago`, `freezesAvailable=1`, `loginStreak=9` ⇒ freeze consumed (`freezesAvailable=0`), streak preserved at 9 then this check-in makes it 10; a `streaks-freeze-history` row for the missed day; activity `freezeUsed:true` (FR-3.4, CLAUDE.md §3). **GREEN:** `gap===2 && freezesAvailable>0` consume branch (ARCHITECTURE.md §5c step 3).
2. **RED:** `freeze.service.test.ts › missed two days, one freeze` → `gap` of 2 missed days, `freezesAvailable=1` ⇒ freeze covers first, streak **resets** (`loginStreak=1`) on the second (FR-3 edge, spec §Edge 4). **GREEN:** `gap>=3` (or `gap===2` no freeze) → no protection.
3. **RED:** `freeze.service.test.ts › freeze covers both axes` → one consumed freeze protects login **and** play for the same missed day (FR-3.6). **GREEN:** single consume applies to both transitions.
4. **RED:** `freeze.service.test.ts › monthly grant on the 1st` → `lastFreezeGrantDate` in a prior `YYYY-MM` ⇒ `freezesAvailable+=1` and `lastFreezeGrantDate=current YYYY-MM`; same month ⇒ no extra grant (FR-3.1, compared as `YYYY-MM` strings, **not** every 30 days; spec §Edge 5). **GREEN:** monthly-grant branch (ARCHITECTURE.md §5c step 5).
5. **Repository transaction.** `consumeFreeze` via `TransactWriteCommand` (ARCHITECTURE.md §5c step 3): player `Update` `freezesAvailable-1, freezesUsedThisMonth+1` with `ConditionExpression: freezesAvailable > :zero`; `streaks-freeze-history` `Put` for the missed `date` with `attribute_not_exists(#date)` (per-day idempotency — the load-bearing invariant for S8's cron); missed-day activity `freezeUsed=true`. `grantFreezeAdmin` via `UpdateCommand ADD freezesAvailable :n` (pattern J — atomic add is fine for admin grant; not retry-sensitive).
6. **Wire lazy eval first.** Call `freeze.service` at the **top** of check-in and hand-completed, **before** the transition decision (ARCHITECTURE.md §5c, CLAUDE.md Inv 5).
7. **Handlers.** `src/handlers/freezes.ts` (FR-5.5) → `GET …/freezes` returns `{freezesAvailable, freezesUsedThisMonth, lastFreezeGrantDate, history[]}` (history = consumptions newest-first, pattern I; API_CONTRACT.md §4.5). `src/handlers/admin.ts` `POST …/admin/streaks/freezes/grant` (FR-3.3): `internalAuth` (403 on miss), validate `count>=1` (400 else), `404` unknown player, `409` if grant would exceed the soft cap `99` (API_CONTRACT.md §4.7 ASSUMPTION — record in ASSUMPTIONS.md), response per §4.7.
8. **Integration test:** seed a player with a one-day gap + one freeze → check-in → `freezeConsumed:true`, streak preserved, `GET …/freezes` shows balance down and a history row; admin-grant raises the balance.

**Planned commit sequence.**
- `feat(streaks-api): freeze service — consume/grant/monthly (red→green)`
- `feat(streaks-api): consumeFreeze + grantFreezeAdmin repository writes`
- `feat(streaks-api): lazy freeze eval wired into check-in/hand-completed`
- `feat(streaks-api): freezes read + admin grant endpoints`
- `test(streaks-api): integration freeze-protects-streak + admin grant`

**Definition of Done → verification.**
- `npm test` green incl. one-day-protected, two-day-reset, both-axes, monthly-grant.
- Live: admin-grant a freeze, simulate a one-day gap, check-in → `freezeConsumed:true`; `GET …/freezes` reflects the consumption.
- `SLICE_REPORTS/slice-4.md` written.

**Dependencies.** S1, S2.
**Top risks.** (1) *Monthly grant firing every 30 days instead of on the 1st* → compared as `YYYY-MM` strings; the same-month-no-grant test is the gate (spec §Edge 5). (2) *Freeze covering more than one day* → `gap===2` exactly; the two-day-reset test is the gate (spec §Edge 4).

---

## Slice S5 — Calendar + seed

**Objective.** The single-Query month calendar (5-state day array) and a rewritten seed that populates the full new model so the dashboard has real data. Implements PROJECT.md §10 **S5** (FR-5.3; NFR-5, NFR-8).

**Roadmap target / Runnable result.** `GET …/calendar?month=` returns the 5-state day array; the extended `seed-streaks.js` populates login/play/freeze/reward data for 10 players × 60 days.

**Ordered task breakdown** (strict scope: `calendar.service.ts`):

1. **RED:** `calendar.service.test.ts › derive activity enum` → `{loggedIn:true,played:false}`→`login_only`; `{played:true}`→`played`; `{freezeUsed:true}`→`freeze`; `{streakBroken:true}`→`broken`; no row→`none`; priority `played > freeze > broken > login_only > none` (DATA_MODEL.md §3, API_CONTRACT.md §5.1). **GREEN:** `deriveActivity()` total/order-independent function.
2. **RED:** `calendar.service.test.ts › dense month array` → for a month with rows on some days, emit one entry per calendar day ascending; absent days → `none` with zeroed counters; future days in the current month → `none` (API_CONTRACT.md §4.3). **GREEN:** dense-array assembly.
3. **RED:** `calendar.service.test.ts › month validation` → `2026-2`/`2026-13`/`feb` → 400-class error; omitted `month` → current UTC month (API_CONTRACT.md §4.3 ASSUMPTION). **GREEN:** validation + default.
4. **Repository.** `queryMonth` — **one** `QueryCommand` `playerId = :p AND begins_with(#date, :ym)` (pattern F, NFR-8 — no Scan on the hot path). Unit-assert the KeyConditionExpression uses `begins_with`.
5. **Handler.** `src/handlers/calendar.ts` (FR-5.3) → `{month, days[]}` per §4.3, `400` on malformed month.
6. **Rewrite the seed** (`scripts/seed-streaks.js`, DATA_MODEL.md §11) to the **new** model — this is the Seed/infra scope (CLAUDE.md §7): keep 10 players (`streak-001..010`, their `consistency` weights), 60 days ending today UTC; per day generate `loggedIn ~ Bernoulli(consistency)`, `played ~ Bernoulli(consistency*0.6)`; walk days computing `loginStreakAtDay`/`playStreakAtDay` with gap resets; probabilistically protect some single-day gaps with a freeze (write `freezeUsed`, decrement balance, write `streaks-freeze-history` row); write a `streaks-rewards` row each time a counter **equals** a milestone (incl. re-award after reset); derive the player aggregate (current/best streaks, last dates, freeze fields, `lastFreezeGrantDate=current YYYY-MM`) last; **drop** the legacy `currentStreak`/`longestStreak`/`totalCheckIns`/`lastCheckIn` and activity `checkedIn`. Plain `PutCommand` (overwrite, re-runnable).

**Planned commit sequence.**
- `feat(streaks-api): calendar service — activity derivation + dense month (red→green)`
- `feat(streaks-api): single-Query month repository + calendar endpoint`
- `feat(scripts): rewrite seed-streaks for login/play/freeze/reward model`

**Definition of Done → verification.**
- `npm test` green incl. all 5 activity derivations + priority + month validation.
- Live: `docker compose --profile streaks up` then `node scripts/seed-streaks.js`; `curl "…/calendar?month=<current>" -H 'X-Player-Id: streak-001'` returns a dense day array with a mix of `played/login_only/freeze/broken/none`.
- `grep -n 'Scan' src/handlers src/services src/repositories` shows no Scan on calendar/player/internal paths (only seed/admin tooling, NFR-8).
- `SLICE_REPORTS/slice-5.md` written.

**Dependencies.** S1–S4 (activity/freeze/reward rows must exist to render).
**Top risks.** (1) *Seed emitting the legacy shape* → the field-drop checklist + a dashboard render against seeded data is the gate (DATA_MODEL.md §11). (2) *Calendar doing a Scan or per-day Get* → `begins_with` single-Query unit assertion + the grep gate (NFR-8).

---

## Slice S6 — Dashboard (React)

**Objective.** The on-brand React dashboard: streak counters with growing flame, 30-day heat map, milestone progress, personal best, freeze status, reward history — the most visible deliverable. Implements PROJECT.md §10 **S6** (FR-4 all).

**Roadmap target / Runnable result.** The dashboard renders all FR-4 panels against the live API on Hijack's dark/orange brand.

**Ordered task breakdown** (adapted scope: RTL + MSW acceptance tests, TECH_STACK.md §1/§2, CLAUDE.md §3):

1. **Frontend toolchain + test deps** (6 dev installs, TECH_STACK.md §2): `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw`, `@testing-library/user-event`; add `test` script + `vitest` config sharing `vite.config.ts`; MSW `setupServer`. **Do not exceed 6.**
2. **Data layer.** `src/store/streaksApi.ts` — RTK Query `createApi` + `fetchBaseQuery` (baseUrl `VITE_API_URL`, `X-Player-Id` header) with endpoints for streaks/calendar/rewards/freezes (TECH_STACK.md §1, ARCHITECTURE.md §3). Extend `store.ts` to add the api reducer/middleware (keep the existing auth slice). `src/types/streaks.types.ts` mirrors API_CONTRACT.md §5.5.
3. **Brand theme.** `theme.ts` — dark base + single orange accent (`#FF9800` on `#0D1117`, or dossier `#F5923E`; pick one intentionally — CLAUDE.md §8). Re-check real brand tokens before hardcoding (RESEARCH.md Q6 flags teal/Poppins as unverified).
4. **RED→GREEN per component** (render with real Redux `<Provider>`, MSW-mocked network, assert rendered output):
   - `StreakCounter.tsx` (FR-4.1/4.2): login flame + play cards; flame grows via CSS `transform: scale(1 + min(streak,30)*0.02)` (zero-dep, TECH_STACK.md §1). Test: number renders; scale increases with streak.
   - `CalendarHeatMap.tsx` (FR-4.3, ADR-5): CSS-grid 30 cells, 5 state colors gray/light-green/dark-green/blue/red, MUI `<Tooltip>`. Test asserts cell color per `activity` value (`findByText`/cell state).
   - `MilestoneProgress.tsx` (FR-4.4): "Play 2 more days to earn 300 bonus points!" copy + progress for both axes. Test asserts the computed copy.
   - `PersonalBest.tsx` (FR-4.5); `FreezeStatus.tsx` (FR-4.6: available count, "freeze active" when today protected, last-used dates); `RewardHistory.tsx` (FR-4.7: date/milestone/type/points list).
5. **Container.** `StreakDashboard.tsx` replaces the placeholder `pages/Dashboard.tsx`; wires `useStreaks`/`useCalendar` hooks; a check-in affordance posts and refetches. Display clamps streaks at 365 (FR-1.7) — server returns the true value.

**Planned commit sequence.**
- `build(streaks-frontend): add vitest + RTL + MSW test toolchain`
- `feat(streaks-frontend): RTK Query streaks api slice + dark/orange theme`
- `feat(streaks-frontend): StreakCounter with growing flame (red→green)`
- `feat(streaks-frontend): CalendarHeatMap 5-state grid (red→green)`
- `feat(streaks-frontend): milestone/personal-best/freeze/reward panels (red→green)`
- `feat(streaks-frontend): StreakDashboard container on live API`

**Definition of Done → verification.**
- `cd serverless-v2/services/streaks-frontend && npm test` green (component acceptance tests).
- Live: with the API seeded, open `http://localhost:4001` → both counters (flame grows), a populated 30-day heat map with all 5 colors, next-milestone copy, personal best, freeze status, reward history — visibly on-brand (not default MUI).
- `SLICE_REPORTS/slice-6.md` written (include a screenshot/observed-state note).

**Dependencies.** S1–S5 (all read endpoints + seed must exist).
**Top risks.** (1) *Default-MUI look loses the "frontend is the showcase" points* (Pillar 4) → intentional theme + brand re-check is a task, not an afterthought. (2) *RTK Query not exercised in tests* → MSW mocks at the network layer so the slice runs end-to-end against the real `<Provider>` (TECH_STACK.md §2).

---

## Slice S7 — Hardening + docs (core ships here)

**Objective.** Close the core: logging/error-contract pass, the rubric integration test confirmed, README + API_CONTRACT polish, ADRs, full `npm test` green in both packages. Implements PROJECT.md §10 **S7** (NFR-4, NFR-6, NFR-7; SM-4). **After S7 the Must+Should core is shippable.**

**Roadmap target / Runnable result.** README + API_CONTRACT polished, ≥4 ADRs present, integration test green, logging/error pass complete; full `npm test` green.

**Ordered task breakdown.**

1. **Error contract sweep** (NFR-7): a single error-normalizing middleware emits `{error, message}` with the API_CONTRACT.md §3 codes — `BadRequest`/400, `Unauthorized`/401, `Forbidden`/403, `NotFound`/404, `Conflict`/409, `InternalError`/500 (DB-down maps to **500 InternalError** per the wire contract, **not** 503 — see ASSUMPTIONS.md). Add a test per code path.
2. **Logging sweep** (NFR-6): structured `winston` with `playerId` + `correlationId` (generated in middleware, threaded) at every write path — check-in, hand-completed, reward award, freeze consume, admin grant; no `console.log` in committed backend code (`grep` gate). Document the metric hooks (ARCHITECTURE.md §8).
3. **Integration test confirmed** (NFR-4/SM-2): the check-in → streak update → milestone reward flow runs green end-to-end against DynamoDB Local; `npm test` green in **one** command per package.
4. **Docs (SM-4):** README — option C + *why* (frame around the live "$100K Hot Streak Freeroll" promo, RESEARCH.md Q6), setup (`docker compose --profile streaks up`, seed, `git config core.hooksPath .githooks`), implemented-vs-deferred, trade-offs, "what we'd do next" (the Could-Haves). Polish API_CONTRACT.md against the shipped routes. Ensure ≥4 ADRs (ARCHITECTURE.md §11 already has 9). Reconcile the three ASSUMPTIONS.md entries into the docs they correct.
5. **Invariant grep gates** (SM-5): duplicate same-day check-in no double-increment; 2-day gap + 1 freeze resets; milestone once per instance; calendar month = one Query. Capture the four as explicit assertions if not already.

**Planned commit sequence.**
- `feat(streaks-api): error-normalizing middleware + canonical codes`
- `feat(streaks-api): structured winston logging at all write paths`
- `test(streaks-api): confirm check-in→reward integration green`
- `docs: README (Hot Streak framing, setup, trade-offs) + API_CONTRACT polish`

**Definition of Done → verification.**
- `npm test` green in **both** `streaks-api` and `streaks-frontend`.
- `grep -rn 'console.log' src/` (backend) → none; every error response matches `{error, message}` + a documented code.
- A fresh reader runs the README top-to-bottom and reaches a rendered, seeded dashboard.
- `SLICE_REPORTS/slice-7.md` written — **core-shippable checkpoint.**

**Dependencies.** S0–S6.
**Top risks.** (1) *Inconsistent error codes across handlers* → centralized middleware + per-code tests. (2) *README that doesn't actually run* → the verification is to execute it, not read it (docs-align discipline).

---

## Slice S8 — Bonus: backend extras (only after S7 green)

**Objective.** FR-7 push payload (audit/complete), FR-8 admin view-history endpoint, FR-10 scheduled freeze Lambda sharing the lazy-eval consume function. Implements PROJECT.md §10 **S8**.

**Ordered task breakdown.**

1. **FR-7 audit.** Confirm the `notification` payload built in S3 matches API_CONTRACT.md §4.4/§5.5 exactly (`{title, body, deepLink, milestone, type}`), is returned in `milestoneEarned` and `…/rewards`, and is content-only (no delivery, PROJECT.md §8). Add the `deepLink` to the stored Map if missing (API_CONTRACT.md §4.4 note).
2. **FR-8 admin view-history.** **RED** (integration): `GET /api/v1/admin/streaks/players/:playerId/history` with `X-Internal-Secret` → composite `{player, activity, rewards, freezes}` (API_CONTRACT.md §4.8, reusing §4.1/§4.3/§4.4/§4.5 shapes); missing secret → **403** before any lookup; unknown player → **404**. **GREEN:** `src/handlers/admin.ts` history branch composing existing services (no new sub-shapes). Reuses `INTERNAL_API_SECRET` — no new secret (TECH_STACK.md §4).
3. **FR-10 scheduled freeze.** **RED:** `freeze.service` consume is idempotent with the lazy path against the same missed day — running both never double-consumes (guarded by the per-day `streaks-freeze-history` `attribute_not_exists(date)` write, ARCHITECTURE.md §5f step 4). **GREEN:** `src/handlers/scheduled-freeze.ts` — a thin cron entry that pages players (the **one sanctioned** paginated `Scan`, NFR-8 exception) and calls the **same** `freeze.service.consume` the lazy path uses (never a parallel impl, ADR-2). Wire the `serverless.yml` `schedule` event reading `enabled: ${env:FREEZE_CRON_ENABLED, 'false'}` (dormant locally). Locally invoke via `serverless invoke local -f scheduledFreeze`.

**Planned commit sequence.**
- `feat(streaks-api): finalize FR-7 notification payload on reward + wire responses`
- `feat(streaks-api): admin view-history composite endpoint (red→green)`
- `feat(streaks-api): scheduled-freeze cron sharing lazy consume (idempotent)`

**Definition of Done → verification.**
- `npm test` green incl. the admin-history + cron-idempotency tests.
- Live: `serverless invoke local -f scheduledFreeze` consumes a due freeze; running it twice (or alongside a lazy check-in) does **not** double-consume (`GET …/freezes` confirms). Admin history returns the composite with `X-Internal-Secret`, `403` without.
- `SLICE_REPORTS/slice-8.md` written.

**Dependencies.** S3, S4, S7 (core green).
**Top risks.** (1) *Cron double-consuming with lazy eval* → both route through the per-day conditional write; the dual-path idempotency test is the gate (ARCHITECTURE.md §7). (2) *Scan creeping onto a hot path* → the Scan lives only in the cron handler; the NFR-8 grep gate from S5 still holds.

---

## Slice S9 — Bonus: share-card

**Objective.** Branded, read-only streak-card endpoint + a dashboard "Share" affordance. Implements PROJECT.md §10 **S9** (FR-9).

**Ordered task breakdown** (strict scope: `share.service.ts` is a pure `(state) => string` renderer, never inlined in the handler — TECH_STACK.md §3):

1. **RED:** `share.service.test.ts › renders brand SVG` → output is a self-contained `<svg …>` encoding `loginStreak`, `playStreak`, `bestLoginStreak`, the Hijack wordmark + "Hot Streak" tie-in, dark/orange palette (API_CONTRACT.md §4.9). **GREEN:** `src/lib/share-card.ts` SVG string template (zero-dep, TECH_STACK.md §1 locked default — **no** satori/resvg unless PNG is actually built).
2. **RED:** `share.service.test.ts › degrade never throws` → zero-state/new player ⇒ minimal fallback card (0 streaks, no personal best), never an error (API_CONTRACT.md §4.9 degrade). **GREEN:** fallback path.
3. **Handler.** `src/handlers/share-card.ts` (FR-9.2): player auth (`X-Player-Id`), read-only via the same `getPlayer` read, returns `Content-Type: image/svg+xml`; render failure degrades to text/SVG fallback at **200**, never 500 (ARCHITECTURE.md §7). `?format=png` only if the optional rasterizer is built (else ignored/SVG).
4. **Frontend.** Add a "Share" affordance to `StreakDashboard.tsx` (FR-9.2) opening/embedding the card.

**Planned commit sequence.**
- `feat(streaks-api): share-card SVG renderer + degrade fallback (red→green)`
- `feat(streaks-api): share-card endpoint (player auth, image/svg+xml)`
- `feat(streaks-frontend): dashboard Share affordance`

**Definition of Done → verification.**
- `npm test` green incl. renderer + degrade.
- Live: `curl "…/share-card" -H 'X-Player-Id: streak-001'` returns valid SVG; a zero-state player still returns a 200 fallback card; the dashboard "Share" opens it.
- `SLICE_REPORTS/slice-9.md` written.

**Dependencies.** S6, S7.
**Top risks.** (1) *Adding heavy deps for rasterization* → SVG is the locked zero-dep default; satori/resvg stay opt-in and only count against budget if PNG is actually built (TECH_STACK.md §2). (2) *Share render 500-ing the dashboard* → degrade-never-500 is tested.

---

## Slice S10 — Bonus: CI

**Objective.** A GitHub Actions workflow mirroring the local pre-push hook. Implements PROJECT.md §10 **S10** (NFR-10).

**Ordered task breakdown.**

1. `.github/workflows/ci.yml` (ARCHITECTURE.md §10, TECH_STACK.md §1): on push/PR, `actions/setup-node@v4` Node 22; install + `tsc --noEmit` typecheck + `streaks-api` Jest + `streaks-frontend` Vitest. No new npm deps (a workflow file).
2. Ensure parity with the `.githooks/pre-push` from S0 (red CI == red push, CLAUDE.md §4).

**Planned commit sequence.**
- `ci: GitHub Actions — typecheck + backend + frontend test suites`

**Definition of Done → verification.**
- The workflow file is valid; both suites are invoked; locally `act` (or a dry parse) + the real push shows green steps.
- `SLICE_REPORTS/slice-10.md` written.

**Dependencies.** S7.
**Top risks.** (1) *CI green but local red (or vice-versa)* → the workflow runs the same commands as the pre-push hook. (2) *Node version skew in CI* → pin Node 22 to match the docker runtime (TECH_STACK.md §1).

---

## Appendix — FR/NFR → slice coverage (from PROJECT.md §10, re-verified)

FR-1→S0/S1/S2 · FR-2→S3 · FR-3→S4 · FR-4→S6 · FR-5→S1/S4/S5 · FR-6→S2 · FR-7→S3/S8 · FR-8→S8 · FR-9→S9 · FR-10→S8 · NFR-1→S0/S1 · NFR-2→S1/S2 · NFR-3→S0/S2 · NFR-4→S1–S7 · NFR-5→S5 · NFR-6→S7 · NFR-7→S7 · NFR-8→S5 · NFR-9→S0 · NFR-10→S10. Every FR/NFR maps to ≥1 slice. ✓
