# Handoff — Tavern dashboard reskin + visual asset editor
STATUS: OPEN · 2026-06-07 ~21:20 · branch: main · last commit: 17926b4

> Extends (does NOT supersede) `HANDOFF.md` (core S0–S10 + BL COMPLETE, 190 backend
> tests) and `HANDOFFS/2026-06-07-1602-demo-personas-and-pi1.md` (4-persona cast,
> PI-1, theme-switcher removal). This session was **entirely frontend** — a full
> visual reskin of the streaks dashboard into the wood-and-brass "tavern" theme
> plus an in-browser asset editor. Backend service code untouched. **Nothing pushed**
> (branch is 103 commits ahead of origin).

## What was worked on (with evidence)
All committed; tree clean. Frontend: **34/34 vitest pass, typecheck clean** (was 37
before the 3-theme switcher was removed earlier this session). Commits this session,
newest→oldest:

- **`17926b4`** Responsive body + polish. Cards now flow in the MUI grid (no longer
  pinned to viewport-pixel transforms → no clipping; verified at 1100/1280/1440/1680).
  Brighter text (`theme.ts` secondary `#C9B68F`→`#DEC892`, primary→`#F7ECD4`). Calendar
  faint day-numbers + smaller/softer icons. Streak Freezes stacked over Personal Best.
- **`e3d760a`/`60a5fe0`/`6f3103d`** Baked the user's editor layout into
  `editor/defaultLayout.ts` (applied as default transforms). **As of `17926b4` only the
  HEADER is baked** (shield/logo/3 buttons sizes — the user's, kept intact); cards were
  removed from the baked set so they're responsive.
- **`fb34f6a`** Centered Next Milestone / Streak Freezes / Personal Best content.
- **`edae0ad`/`4951c96`** The **visual asset editor**: `editor/{EditorContext,Editable,
  EditorToolbar}.tsx`. Toggle **Cmd/Ctrl+Shift+E** (or `?edit`). Click an asset → drag to
  move; toolbar does rotation / width(scaleX) / length(scaleY) / X / Y / Flip. "Copy
  layout" exports JSON. 14 editable ids: shield, logo, btn-checkin/share/logout, card-flame,
  card-cards, brazier, ace, card-milestone, card-calendar, card-rewards, card-freezes,
  card-personalbest. Non-destructive CSS transforms; inert when off (normal clicks work).
- **`df53176`** v2 reward parchment. **`aeec90d`** (superseded) old slider EditMode + lighter
  bg. **`9e933da`** branded header (shield + HIJACK wordmark + 3 copper `ImageButton`s).
  **`b3e7330`** dark 4K table bg. **`71adc4c`** pot+flame brazier (flame grows with login
  streak: `flameScale()` in `StreakCounter.tsx`). **`ecbf452`** card layout + ladder
  milestone bars + weekday calendar + Zilla Slab fonts. **`a4831d8`/`fe62b09`/`fd06d82`/
  `c837941`/`8e370d5`** leather panels, icon calendar, parchment ledger, HD bg + brazier,
  single tavern theme.
- Earlier this session (pre-reskin): **`e045417`** 4-persona demo cast (date-stable),
  **`0657c04`** PI-1 fix, **`7223942`** prior handoff. (See the 1602 handoff.)
- **Multi-agent team consult** (read-only, this session) on levels-vs-badges + UX:
  recommendation = **Badges, NOT levels** (streak length already IS the level; a level bar
  would compete with the milestone bar and fall on a bad day). Every badge maps to data the
  frontend already loads (`best*`, `rewards[]`, freeze history) → **zero backend**. Suggested
  home: evolve the redundant `PersonalBest` card into a "Trophy Rack". Top UX wins:
  "streak ends today" urgency (from `lastLoginDate`, currently unused) + a real check-in
  celebration (vs the corner snackbar). Asset plan: a 6-tier rank-medallion ladder + 1 badge
  frame; rings/meters/locks are CSS.

## What's still needed — and WHY
- **PUSH + deliver.** Nothing pushed; deliverable is one clean PR vs the skeleton's `main`.
  WHY not done: outward-facing, needs user go-ahead. NOTE: this skeleton's only remote is
  `origin` = github.com/hijack-poker/tech-assignment — the standing "push to both remotes"
  memory does NOT apply here.
- **Focal-point polish (streak as hero) — NOT done on purpose.** WHY: an earlier attempt to
  enlarge the brazier squeezed the streak card's text/number; reverted. Needs a careful pass
  (likely widen the streak cards, not just scale the art).
- **Rank/Badge "Trophy Rack" (the levels/badges feature the user asked about).** WHY not done:
  it's the next feature, not yet started; the team designed it (zero backend) but it wants
  art (rank medallions). Build когда the user is ready + sends `rank-*` art.
- **Check-in "at-risk" + celebration UX.** WHY: highest-engagement lever per the UX review,
  but a bigger build; deferred to focus on the visual reskin the user was actively iterating.
- **Docs drift.** WHY it matters: README/doc-suite describe the backend feature, not the new
  tavern reskin, the asset editor, or `public/assets/dashboard/*`. A docs-align pass is owed
  before delivery.
- **Vendor `~/Desktop/HIJACK_ASSETS` + gitignore at project end** (standing, memory
  `[[hijack-poker-asset-sources]]`). Raw originals still live on the Desktop.

## Next actions (exact)
1. If the user wants more visual polish: the focal-point pass — in
   `components/StreakCounter.tsx`, give the login/play cards more width (e.g. grid `md={4}`
   in `StreakDashboard.tsx`) BEFORE enlarging `FlameMotif`, so the number doesn't crowd.
   Verify the login number still reads "12" (re-seed first; see gotcha).
2. If "build the badges/ranks": evolve `components/PersonalBest.tsx` into a Trophy Rack —
   a `deriveBadges(streaks, rewards, freezes)` selector + `rankFor(streak)` helper, all from
   data already on the wire (`types/streaks.types.ts`). Needs `public/assets/dashboard/ranks/`
   art (6 medallions) — ask the user to drop them in `~/Desktop/HIJACK_ASSETS/dashboard/`.
3. If "deliver": confirm remote, then `git push origin main` (pre-push hook runs tsc+tests via
   `core.hooksPath .githooks`; never `--no-verify`). Then a docs-align pass.

## Gotchas / environment state
- **Stack must be running:** `docker compose --profile streaks up` (dynamodb:8000, api:5001,
  frontend:4001). **Re-seed after any check-in:** `node scripts/seed-streaks.js`.
- **The "Check in today" button RESETS the streak in this demo.** WHY: it computes the gap
  from the persona's stored `lastLoginDate` (April, date-stable seed) to the real UTC day →
  huge gap → reset to 1. A stray check-in during headless testing reset streak-001 to 1 this
  session; re-seeding restored it to 12. **Don't click check-in on camera** (or build the
  "frozen today" override — see the 1602 handoff's open caveat).
- **Asset editor internals:** toggle Cmd/Ctrl+Shift+E. Persists in `localStorage`
  (`editorOverrides`, `editorActive`, `editorLayoutVersion`). `editor/defaultLayout.ts` is the
  baked layout + `LAYOUT_VERSION` (currently **3**). On load, if the stored version ≠
  LAYOUT_VERSION, old `editorOverrides` are DISCARDED and `DEFAULT_LAYOUT` (header) applies.
  **Bump LAYOUT_VERSION whenever you change the baked layout** so the user's stale localStorage
  doesn't mask it — and KEEP the header entries in DEFAULT_LAYOUT or bumping will shrink the
  logo/buttons (this exact mistake happened + was reverted this session; the user was firm:
  **do not change the header sizes**).
- **To bake a user's editor design:** they hit "Copy layout" → paste JSON → you diff it into
  `defaultLayout.ts` and bump LAYOUT_VERSION.
- **Assets:** vendored web-ready in `public/assets/dashboard/{bg,frames,icons,ui}`; raw
  originals in `~/Desktop/HIJACK_ASSETS/dashboard/`. pot.png + flames.png are separate layers
  (flame scales with streak). Leather panel is a 9-slice (`Panel.tsx` border-image).
- **Headless verification:** playwright at `/Users/hirom/.npm/_npx/5e2e484947874241/node_modules/
  playwright`; chromium `channel:'chrome'` + `--autoplay-policy=no-user-gesture-required`.
  Login flow: /login → pick persona (MUI Select aria-label "Demo player") → Sign In. Reload
  loses auth (store starts logged-out) → redirects to /intro; toggle edit via keyboard, don't
  navigate `?edit` through a reload.
- **Image-preview trap (still true):** the Read tool composites alpha on black — verify
  transparency with an ffmpeg composite-over-magenta before declaring a PNG opaque.

## Pointers
- TODO.md: core S0–S10 `[x]`; the area in play is the **BL frontend reskin** (not formally
  tracked in TODO — it grew organically from the dossier mockups this session).
- Memory: `[[hijack-poker-demo-personas]]`, `[[hijack-poker-login-themes-backlog]]` (theme
  switcher removed; tavern is the single look), `[[hijack-poker-asset-sources]]`,
  `[[hijack-poker-streaks]]`.
- Prior handoffs: `HANDOFF.md` (core-complete), `HANDOFFS/2026-06-07-1602-...` (personas/PI-1/
  theme-removal + the check-in-date stub decision). This handoff extends both.
- Concept art the reskin targets: `~/Desktop/HIJACK_ASSETS/dashboard/_REFERENCE-dashboard-
  mockup.png` and `~/Desktop/Unknown-1.jpeg`.
