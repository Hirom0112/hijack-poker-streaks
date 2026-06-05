# Bonus — Login experience + 3 themes (BL-1/2/3) — REPORT

**Status:** ✅ DONE (director re-verified host + real-browser render of login + all 3 themes)
**Date:** 2026-06-05
**Dispatch:** 1 senior frontend engineer. User-requested backlog (captured 2026-06-05), built AFTER the core (S0–S7) shipped — over-scope rule respected.

## What shipped
A pre-dashboard experience: branded intro video → art-deco "High Roller's Lounge" sign-in → dashboard, plus a live 3-theme switcher.

## Evidence

| Check | Result | Evidence |
|---|---|---|
| `npm test` | ✅ | **26 passed / 10 files** (18 core + 8 new: LoginScreen ×3, ThemeSwitcher ×3, IntroScene ×2) |
| `npm run build` | ✅ | `tsc && vite build` clean |
| No new deps (STND-5) | ✅ | package.json diff empty — native `<video>`, MUI, RTK, react-router only |
| Login screen render | ✅ | `bonus-login.png` — uses `login-bg.png` artwork + functional brass Sign In card (player select, Sign In/Sign Up, "Continue as streak-001") |
| 3 distinct themes render | ✅ | `bonus-theme-dark.png` (orange/`#0D1117`), `bonus-theme-lounge.png` (warm brass/parchment), `bonus-theme-neon.png` (charcoal + cyan/magenta) — each fully re-skins the dashboard |
| Stub auth only (Inv 10/12) | ✅ | `login(playerId)` → localStorage → `X-Player-Id`; no credentials/PII; Sign Up mints `player-<rand>`; backend auto-creates zero-state |

## BL-1 — Flow
Routes `/intro` → `/login` → `/` (dashboard behind `RequireAuth`); unauth → intro→login, auth → dashboard. IntroScene: native `<video src="/assets/intro.mp4">`, Skip + auto-advance on end, graceful splash fallback on error. Demo bypass: a stored playerId lands straight on the dashboard (no forced video every reload) + a "Continue as streak-001" button. Logout in the top bar returns to `/login`.

## BL-2 — Themes + switcher
`theme.ts` `themes` map now has 3 real `createTheme`s: `hijack-dark` (Option 1, default brand), `hijack-lounge` (Option 2 — wood `#231711`, brass `#C9A24B`, felt green, parchment, serif, matching the artwork), `hijack-neon` (Option 3 — charcoal + neon cyan/magenta). Each carries its own typed `palette.heatmap` so the 5 calendar states stay distinguishable per skin. A `theme` redux slice persists the choice to `localStorage['themeName']`; `main.tsx` feeds the active theme into `<ThemeProvider>`. Top-corner `1/2/3` switcher on dashboard + login.

## BL-3 — Layout
Dashboard already matched `dashboard-ref.png`'s information layout; added the top-bar logout + switcher, no regression. `dashboard-ref.png` is reference-only — deliberately NOT shipped (untracked).

## Assets shipped
`public/assets/intro.mp4`, `public/assets/login-bg.png` (tracked). `dashboard-ref.png` untracked (reference).

## Notes
- Lone console 404 is the missing `favicon.ico` (cosmetic).
- React Router v7 future-flag warnings in test output (non-failing).
- Bundle ~524 kB (existing MUI weight) — a `manualChunks` pass is a future optimization.

## Commits
- `7bccf6d` feat: intro video scene + art-deco login (stub auth)
- `7561099` feat: three selectable themes + top-corner switcher
- `e4b10c6` feat: dashboard logout + flow routing/guard
