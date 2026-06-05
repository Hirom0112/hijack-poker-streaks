# ASSUMPTIONS.md — Hijack Poker Daily Streaks (Option C)

Gaps and **doc conflicts resolved by the precedence order** (CLAUDE.md §Doc precedence:
PROJECT.md > ARCHITECTURE.md > DATA_MODEL.md/API_CONTRACT.md > TECH_STACK.md > CLAUDE.md;
the official `docs/challenge-streaks.md` wins on *functional* behavior). Each entry records the
conflict, the resolution, the precedence/citation used, and the doc that must be corrected.
**Never resolve a conflict silently** — add it here and fix the losing doc (CLAUDE.md). True
blockers go in `BLOCKED.md` instead, not here.

> Seeded during slice planning (2026-06-05). The director-build session maintains this file and
> reconciles each entry into the doc it corrects during **S7** (docs pass).

---

## A-1 — `INTERNAL_API_SECRET` local default value

- **Conflict.** TECH_STACK.md §4 lists the dev default as `local-internal-secret`; API_CONTRACT.md §2.2 and the §8.2 curl examples use `dev-internal-secret`.
- **Resolution.** Use **`dev-internal-secret`**.
- **Precedence.** API_CONTRACT.md (precedence level 3, canonical for the wire/dev-facing contract) outranks TECH_STACK.md (level 4). CLAUDE.md Inv 7 also makes API_CONTRACT canonical for the request surface; the curl block the Unity/dev audience copies must work as written.
- **Action.** Set `INTERNAL_API_SECRET=dev-internal-secret` in `.env.example` + `docker-compose.yml` (S0); **correct TECH_STACK.md §4's value** to `dev-internal-secret` (S7).

## A-2 — Seed player-id convention vs API_CONTRACT examples

- **Conflict.** `scripts/seed-streaks.js` and DATA_MODEL.md §11 use `streak-001..streak-010`; API_CONTRACT.md §8 examples and `docs/local-development.md` use `p1-uuid-0001`.
- **Resolution.** Seed ids stay **`streak-001..streak-010`** (DATA_MODEL.md §11 explicitly says "keep the existing 10 players"). The `p1-uuid-0001` strings in API_CONTRACT.md are illustrative; any non-empty `X-Player-Id` is accepted by the stub. The dashboard's default/dev player id is a real seed id (`streak-001`).
- **Precedence.** DATA_MODEL.md (level 3) is canonical for stored data including the seed; the rewritten seed is a deliberate S5 deliverable. API_CONTRACT examples are non-normative illustrations.
- **Action.** Use `streak-001` as the live demo id in README/curl walkthroughs (S5/S7); optionally note in API_CONTRACT.md that examples are illustrative and the seed uses `streak-NNN` (S7).

## A-3 — HTTP code for an unhandled DynamoDB/database failure

- **Conflict.** ARCHITECTURE.md §7 maps "DynamoDB unavailable" to **503** `{error:"unavailable"}`; API_CONTRACT.md §3 defines **500 `InternalError`** as the unhandled server/database failure code (and lists no 503).
- **Resolution.** Unhandled DB/server failure returns **500 `InternalError`** with `{error, message}`.
- **Precedence.** CLAUDE.md Inv 7 makes API_CONTRACT.md canonical for the wire error shape **and status codes** ("status codes match API_CONTRACT.md exactly"). The §3 catalogue (400/401/403/404/409/500) is the shipped contract; ARCHITECTURE.md §7's 503 is a design-note detail that loses to the explicit wire contract.
- **Action.** Implement the S7 error-normalizing middleware against the §3 codes (500 for DB-down). **Correct ARCHITECTURE.md §7** to say 500 `InternalError` (or note 503 as a future refinement) during the S7 docs pass.

---

## Carried (already-documented in the docs, not conflicts — listed so they aren't re-litigated)

- **Lambda runtime skew** `nodejs20.x` (serverless.yml) vs Node 22 (docker/local) — intentional, accepted (ARCHITECTURE.md §10, TECH_STACK.md §1). Build target `ES2022`/`--target=node20`.
- **`rewardId` = ULID** preferred for sortable rewards Query; timestamp-prefixed string is the zero-dep fallback. Install `ulid` only because pattern H uses `ScanIndexForward=false` (TECH_STACK.md §2). Confirm/record the actual choice in S3.
- **Zero-state `GET /player/streaks`** returns a `200` all-zeros record for any authenticated player rather than `404` (API_CONTRACT.md §4.1 canonical behavior), so the dashboard never errors on a new user.
- **Admin-grant soft cap `99`** on `freezesAvailable`; a grant that would exceed it returns `409 Conflict` — the only documented use of 409 (API_CONTRACT.md §4.7). Confirm in S4.
- **Share-card PNG** is optional; SVG is the guaranteed default. `satori`/`@resvg/resvg-js` stay opt-in and only count against the dep budget if PNG is actually built (TECH_STACK.md §2, S9).
