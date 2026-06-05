# Slice S6 — Dashboard (React) — SLICE REPORT

**Status:** ✅ DONE (director re-verified host + **real browser render**)
**Date:** 2026-06-05
**Dispatch:** 1 senior frontend engineer (S6-1..S6-11, acceptance-test-driven). Director ran S6-12 with Playwright/Chrome.

## What shipped
The FR-4 dashboard: both streak counters, the 30-day heat map, dual milestone progress, personal best, freeze status, and reward history — RTK Query against the live seeded backend, on the locked dark/orange Hijack brand.

## Definition of Done — evidence

| DoD check | Result | Evidence |
|---|---|---|
| `npm test` (vitest) green | ✅ | **18 passed / 7 files** (StreakCounter 3, CalendarHeatMap 4, MilestoneProgress 3, PersonalBest 1, FreezeStatus 3, RewardHistory 1, StreakDashboard 3) — real Redux `<Provider>` + MSW |
| `npm run build` (`tsc && vite build`) | ✅ | clean, 943 modules, 144.6 kB gzip |
| 6 new dev deps (STND-5) | ✅ | vitest, @testing-library/{react,jest-dom,user-event}, jsdom, msw |
| **Live browser render (SM-1)** | ✅ | Playwright+Chrome screenshot `SLICE_REPORTS/slice-6-dashboard.png`; **zero console errors** |
| Both counters + flame grows | ✅ | LOGIN 2 (flame, Best 17), PLAY 2 (cards, Best 4) |
| 30-day heat map, **all 5 colors** | ✅ | `2026-04` shows gray/light-green/dark-green/**blue (freeze)**/**red (broken)** + legend |
| Milestone copy, both axes | ✅ | "Log in 1 more day to earn 50 bonus points!" / "Play 1 more day to earn 100…" + dual progress bars |
| Personal best / freeze status / reward history | ✅ | Best 17/4; Freezes 0 avail, used 2, history (purchased / free monthly); Reward History list with points |
| On-brand (dark `#0D1117` + orange `#FF9800`) | ✅ | screenshot confirms intentional brand, not default MUI |

## Architecture
- `src/store/streaksApi.ts` — RTK Query `createApi`/`fetchBaseQuery`, `X-Player-Id` via `prepareHeaders`, endpoints streaks/calendar/rewards/freezes + `checkIn` mutation invalidating all tags. `store.ts` keeps the auth slice, adds the api reducer+middleware.
- Components: StreakCounter (`scale(1+min(streak,365)*0.02)`), CalendarHeatMap (CSS grid, 5-state `sx` colors, unknown enum→`none` per §7, MUI Tooltip), MilestoneProgress (dual `LinearProgress`, null→"Max milestone reached"), PersonalBest (props), FreezeStatus + RewardHistory (own fetch), StreakDashboard (wires hooks + check-in, 365 clamp, loading/error states).
- `theme.ts` restructured as a named `themes` map shipping only `hijack-dark` — clean seam for the future BL-2 multi-theme switch.

## Demo configuration
Default player `streak-001` seeded into the auth slice + localStorage (ASSUMPTIONS A-2). `VITE_DEMO_MONTH=2026-04` (in `.env.example`) points the heat map at the month with all 5 states; remove it to default to the current UTC month.

## Findings folded into S7 (from a user-supplied review)
- **404 shape:** `handler.ts` catch-all returns `{error:'Not found'}`, not the canonical `{error:'NotFound', message}` (API_CONTRACT §3) — fixed + tested in **S7-1** (added S7-1 sub-item).
- **`--forceExit`:** backend jest uses `--forceExit` (open-handle warning) — investigate/close handles in **S7** (added S7-8).
- Review's "no frontend tests" finding is **resolved by this slice** (18 vitest tests + `test` script).
- `npm install` flagged dev-only transitive advisories (test toolchain) — not shipped in the bundle; note for S7 docs.

## Commits
- `a7d39d6` build: vitest + RTL + MSW toolchain
- `90bfbcc` feat: RTK Query streaks api slice + types
- `a0d7c8e` feat: StreakCounter + CalendarHeatMap (red→green)
- `9906b0e` feat: MilestoneProgress + PersonalBest + FreezeStatus + RewardHistory
- `aa93353` feat: StreakDashboard wiring + check-in
