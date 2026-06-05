# Slice S10 — Bonus: CI (NFR-10) — SLICE REPORT

**Status:** ✅ DONE — **ALL slices (S0–S10 + BL) complete.**
**Date:** 2026-06-05 · **Dispatch:** 1 engineer (S10-1/2). Director ran S10-3.

## What shipped
`.github/workflows/streaks-ci.yml` — CI parity with the local pre-push hook (red CI == red push), and the pre-push hook extended to guard the frontend.

## DoD — evidence
| Check | Result | Evidence |
|---|---|---|
| Workflow YAML valid | ✅ | both `streaks-ci.yml` + `ci.yml` parse (ruby YAML) |
| Both suites invoked | ✅ | `streaks-api`: install → create 4 tables → `npm run typecheck` → `npm test`. `streaks-frontend`: install → `npm run build` (tsc) → `npm test` (vitest) |
| Node 22 | ✅ | `actions/setup-node@v4`, `node-version: 22` |
| DynamoDB Local in CI | ✅ | `services: amazon/dynamodb-local` (:8000) + a create-tables step (frozen key schema, Inv 11) so the FULL suite (incl. integration) runs green |
| Hook parity (S10-2) | ✅ | `.githooks/pre-push` `PACKAGES` now includes streaks-frontend; same commands as CI; `bash -n` OK |
| Existing `ci.yml` intact | ✅ | separate workflow file added; `ci.yml` unmodified |
| No new deps | ✅ | no package.json changes |

## Decision
Added a SEPARATE `streaks-ci.yml` rather than editing the skeleton's `ci.yml` (whose `test-streaks-api` job runs only `npm test`, no typecheck/no Dynamo) — avoids breaking existing jobs and keeps the NFR-10 streaks CI self-contained.

## Out-of-scope finding (logged to backlog PI-1)
`scripts/init-dynamodb.sh` is stale — creates only `streaks-players` + `streaks-activity`, missing `streaks-rewards` + `streaks-freeze-history`. Not used by CI or docker-compose (both have the full set), but a standalone run yields an incomplete local DB. Trivial fix; logged, not blocking.

## Commits
- `eb87dac` ci: GitHub Actions — typecheck + jest + vitest on push/PR (node 22)
- `f43ebf1` chore: pre-push hook parity — guard streaks-frontend
