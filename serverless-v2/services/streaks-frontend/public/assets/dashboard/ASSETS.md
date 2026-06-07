# Tavern Dashboard — Asset Manifest

Target look: the wood-and-brass poker-parlor concept art (`Gemini_Generated_Image_…png`).
This file is the single source of truth for **every asset** the reskin needs, the
**exact filename** to use, and **where it goes**.

## Where to drop assets

1. **Drop raw high-res originals** (whatever Gemini/your tool exports — big PNGs, no
   need to resize) into:  **`~/Desktop/HIJACK_ASSETS/dashboard/`**
2. Use the **filenames in the tables below** (or close — tell me and I'll map them).
3. I then web-optimize + vendor each into this repo folder
   (`public/assets/dashboard/{bg,frames,icons,deco}/`) and wire it into the UI.

**Transparency matters:** anything marked "transparent PNG" must have a real alpha
channel (cut out, no baked background). Export as PNG-32. (We've been bitten before
by previews that *look* transparent but ship a black box — see the login work.)

Priority: **MUST** = needed to hit the look · **SHOULD** = strong polish ·
**DECOR** = nice scatter, fully optional. If you only do the MUSTs, it already reads
as the tavern.

---

## 1. Background & surface  →  `dashboard/bg/`

| Priority | Filename | What it is | Format / size | Notes |
|---|---|---|---|---|
| MUST | `bg-wood.jpg` | The dark wood-plank backdrop (whole page) | JPG, **2560×1440** (or tileable 512×512) | The brown the whole app sits on. Can be one big image or a seamless tile. |
| SHOULD | `panel-leather.png` | Burnished leather/wood fill for inside panels | PNG, tileable 512×512 | If omitted I use a CSS brown gradient. |
| DECOR | `bg-vignette.png` | Soft dark edge vignette overlay | transparent PNG 2560×1440 | Adds depth; I can also do this in CSS. |

## 2. Panel frames (the ornate riveted gold corners)  →  `dashboard/frames/`

Every card (Login Streak, Play Streak, Next milestone, Streak freezes, calendar,
Reward history) sits in one of these. Best delivered as a **9-slice** frame so it
stretches to any card size without distorting the corners.

| Priority | Filename | What it is | Format / size | Notes |
|---|---|---|---|---|
| MUST | `frame-panel.png` | One ornate metal-corner + gold-edge frame, **transparent center** | transparent PNG, ~**900×600**, even border inset (e.g. 64px) | The hero asset. I 9-slice it. Keep corners identical so mirroring is clean. |
| SHOULD | `frame-toast.png` | The dark blue "Milestone reached!" banner background | transparent PNG ~700×120 | Else CSS. |
| DECOR | `frame-corner.png` | A single corner bracket (if you'd rather not do a full frame) | transparent PNG ~200×200 | Alternative to `frame-panel` — I mirror it 4×. |

## 3. Icons (motifs)  →  `dashboard/icons/`

### Hero icons (big, inside the streak cards)
| Priority | Filename | What it is | Format / size | Notes |
|---|---|---|---|---|
| MUST | `icon-fire.png` | Flaming brazier/cauldron = **login streak** | transparent PNG, **512×512** | The orange fire-bowl in the art. |
| MUST | `icon-cards.png` | Fanned hand of cards (aces) = **play streak** | transparent PNG, **512×512** | The dark-blue card fan. |

### Calendar cell icons (small, one per heat-map state)
The "Last 30 days" grid draws a tiny icon in each cell. **64×64**, transparent PNG.
| Priority | Filename | State | Notes |
|---|---|---|---|
| MUST | `cell-login.png` | login only | bronze person/bust silhouette |
| MUST | `cell-played.png` | played | bronze fanned-cards glyph |
| MUST | `cell-freeze.png` | freeze used | blue flame / ice |
| MUST | `cell-broken.png` | streak broken | red broken-heart |
| — | (no asset) | no activity | empty dark slot — drawn in CSS |

### UI glyphs
| Priority | Filename | What it is | Format / size | Notes |
|---|---|---|---|---|
| SHOULD | `icon-freeze.png` | Blue snowflake/ice-flame for the Streak-freezes card + toast | transparent PNG 128×128 | Can reuse `cell-freeze` upscaled. |
| SHOULD | `badge-new.png` | Gold "NEW" badge for reward rows | transparent PNG ~96×48 | Else CSS pill. |
| DECOR | `icon-keys.png` | Crossed-keys brand emblem (header) | transparent PNG 128×128 | The little keys medallion. |

## 4. Decorative scatter  →  `dashboard/deco/`  (all DECOR / optional)

These are the props sprinkled in the margins. All transparent PNGs. Skip entirely if
you want a cleaner board.

| Filename | What it is | Size |
|---|---|---|
| `chips-red.png` | Stack of red poker chips | ~256×256 |
| `chips-green.png` | Stack of green poker chips | ~256×256 |
| `chips-black.png` | Stack of black/navy poker chips | ~256×256 |
| `coins.png` | Pile of gold coins | ~256×256 |
| `cards-fan-deco.png` | Loose fanned cards (corner) | ~300×220 |
| `crossed-keys.png` | Crossed keys / cue prop | ~300×220 |

## 5. Fonts  →  (already wired, no action needed unless you want exact faces)

The headings use **Cinzel** and body uses **Spectral**, both loaded from Google
Fonts in `index.html` — they're a close match to the engraved tavern signage, so
**you don't need to provide font files**. If you have the *exact* faces from the
mockup and want them instead, drop `.woff2` into `public/assets/fonts/` and tell me.

---

## Quick checklist (the 9 MUST-haves to send first)
- [ ] `bg/bg-wood.jpg`
- [ ] `frames/frame-panel.png`
- [ ] `icons/icon-fire.png`
- [ ] `icons/icon-cards.png`
- [ ] `icons/cell-login.png`
- [ ] `icons/cell-played.png`
- [ ] `icons/cell-freeze.png`
- [ ] `icons/cell-broken.png`
- [ ] (that's the core; everything else is polish/decor)

Drop them in `~/Desktop/HIJACK_ASSETS/dashboard/` and tell me they're there — I'll
optimize, vendor, and wire the full reskin.
