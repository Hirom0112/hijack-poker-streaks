/**
 * Share-card SVG generator (FR-9.1, API_CONTRACT.md §4.9).
 *
 * A PURE `(state) => string` template: it renders a single, self-contained
 * 1344×798 SVG — the photoreal "Hot Streak" plate art (HIJACK POKER wordmark,
 * LOGIN/PLAY labels, flame, card and the parlor scene all baked in) embedded as
 * a base64 JPEG, with the live `loginStreak` / `playStreak` / `bestLoginStreak`
 * figures overlaid in a metallic-cream serif on their measured slots. A pure
 * projection of the §4.1 aggregate.
 *
 * Self-contained (TECH_STACK §1 / STND-5): ZERO runtime dependencies — no satori,
 * no resvg, no rasterizer, no fs, no network. The plate is an inline `data:` URI
 * (see {@link HOT_STREAK_PLATE_DATA_URI}), so the SVG renders standalone in any
 * browser tab or `<img src>`. The only `href` is that data URI; no remote refs.
 *
 * Degrade-never-throw (ARCHITECTURE §7): the whole render is wrapped so any
 * unexpected input (NaN, non-finite, non-numeric, `null`/`undefined` state) still
 * yields a valid SVG; a hard failure collapses to the minimal flat-brand
 * {@link fallbackCard}. This function NEVER throws and ALWAYS starts with `<svg`.
 */

import { HOT_STREAK_PLATE_DATA_URI } from './hot-streak-plate';

/** The streak figures the card projects (a subset of the §4.1 aggregate). */
export interface ShareCardState {
  loginStreak: number;
  playStreak: number;
  bestLoginStreak: number;
}

/** Brand tokens (CLAUDE.md §8). Single orange accent on near-black. */
const BG = '#0D1117';
const ACCENT = '#FF9800';
const MUTED = '#8B949E';

/** UI display clamp (FR-1.7): the true streak may exceed 365; the card does not. */
const DISPLAY_CAP = 365;

/**
 * XML-escape arbitrary text before it enters an SVG text node (defensive — the
 * values are numeric/known, but we escape anyway so a slipped-through string can
 * never break the document or inject markup).
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Coerce an unknown into a safe, display-clamped non-negative integer for the
 * card. Non-finite / non-numeric / negative inputs collapse to `0` (degrade,
 * never throw).
 */
function safeCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), DISPLAY_CAP);
}

/** The escaped, clamped string form of a streak number for a text node. */
function fig(value: unknown): string {
  return xmlEscape(String(safeCount(value)));
}

// Plate geometry: the embedded art is a 1344×798 JPEG (the SVG viewBox). The three
// number slots were measured off the art: login number sits left of the flame,
// play number left of the joker card, best number between "Personal best:" & "days".
const PLATE_W = 1344;
const PLATE_H = 798;
const LOGIN_NUM = { x: 478, y: 462 };
const PLAY_NUM = { x: 815, y: 462 };
// The "Personal best:" → "days" gap is narrow (~45px); the best number is small
// and centered in it.
const BEST_NUM = { x: 561, y: 549 };

// The plate is shot at a slight 3D tilt — the card recedes to the right, so the
// baked text leans down to the right. Slant the overlaid numbers to match so
// they sit ON the card plane instead of looking pasted flat. (SVG y-down →
// positive = clockwise = top leans right / falls to the right.)
const TILT = 2.6;
// The streak numbers read a touch squat; stretch them ~12% taller (vertical only)
// so they fill the slot. Scaled around each number's baseline so x/placement holds.
const SY_STREAK = 1.12;
const streakTransform = (x: number, y: number) =>
  `rotate(${TILT} ${x} ${y}) translate(0 ${y}) scale(1 ${SY_STREAK}) translate(0 ${-y})`;

/** Bold serif number, scaled down for 3-digit values so it stays inside its slot. */
function numFontSize(text: string): number {
  return text.length >= 3 ? 90 : 126;
}

/**
 * Build the brand share card: the photoreal "Hot Streak" plate art (embedded as a
 * self-contained base64 JPEG — no fs, no network) with the live login / play /
 * best numbers overlaid in a metallic cream serif over their measured slots. The
 * labels, flame, card and scene are all baked into the plate; only the figures
 * are dynamic.
 */
function buildSvg(login: string, play: string, best: string): string {
  const NUM_FONT = "Georgia, 'Times New Roman', 'Zilla Slab', serif";
  // LOGIN + PLAY streak numbers are a bronze-metallic vertical gradient (engraved
  // look); the PERSONAL BEST number is a bright gold that GLOWS (soft amber halo).
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PLATE_W}" height="${PLATE_H}" viewBox="0 0 ${PLATE_W} ${PLATE_H}" role="img" aria-label="Hijack Poker Hot Streak card — login ${login}, play ${play}, best ${best} days">
  <defs>
    <filter id="emb" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
    </filter>
    <linearGradient id="bz" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#EAC892"/>
      <stop offset="0.42" stop-color="#B5824A"/>
      <stop offset="0.72" stop-color="#8A5E30"/>
      <stop offset="1" stop-color="#6B4720"/>
    </linearGradient>
    <filter id="glow" x="-120%" y="-120%" width="340%" height="340%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FFB733" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#FFE19A" flood-opacity="0.55"/>
    </filter>
  </defs>

  <!-- photoreal plate art (labels, flame, card, scene baked in) -->
  <image href="${HOT_STREAK_PLATE_DATA_URI}" x="0" y="0" width="${PLATE_W}" height="${PLATE_H}" preserveAspectRatio="xMidYMid slice"/>

  <!-- live figures overlaid on the measured number slots -->
  <text x="${LOGIN_NUM.x}" y="${LOGIN_NUM.y}" transform="${streakTransform(LOGIN_NUM.x, LOGIN_NUM.y)}" text-anchor="middle" font-family="${NUM_FONT}" font-size="${numFontSize(login)}" font-weight="700" fill="url(#bz)" filter="url(#emb)">${login}</text>
  <text x="${PLAY_NUM.x}" y="${PLAY_NUM.y}" transform="${streakTransform(PLAY_NUM.x, PLAY_NUM.y)}" text-anchor="middle" font-family="${NUM_FONT}" font-size="${numFontSize(play)}" font-weight="700" fill="url(#bz)" filter="url(#emb)">${play}</text>
  <text x="${BEST_NUM.x}" y="${BEST_NUM.y}" transform="rotate(${TILT} ${BEST_NUM.x} ${BEST_NUM.y})" text-anchor="middle" font-family="${NUM_FONT}" font-size="32" font-weight="800" fill="#FFE9A8" filter="url(#glow)">${best}</text>
</svg>`;
}

/**
 * Render the brand share card for a player's streak figures. Pure; never throws.
 * Any failure path collapses to {@link fallbackCard}.
 */
export function renderShareCard(state: ShareCardState): string {
  try {
    const s = (state ?? {}) as Partial<ShareCardState>;
    return buildSvg(fig(s.loginStreak), fig(s.playStreak), fig(s.bestLoginStreak));
  } catch {
    // Degrade, never 500 (ARCHITECTURE §7): a guaranteed-valid minimal card.
    return fallbackCard();
  }
}

/**
 * The minimal valid fallback card — brand wordmark, zero streaks, no personal
 * best detail. Used when the main render hits an error of any kind. It is itself
 * a plain literal so it cannot fail.
 */
export function fallbackCard(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Hijack Poker streak card">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="1200" height="10" fill="${ACCENT}"/>
  <text x="64" y="96" font-family="Georgia, serif" font-size="48" font-weight="700" letter-spacing="4" fill="${ACCENT}">HIJACK POKER</text>
  <text x="64" y="360" font-family="system-ui, sans-serif" font-size="160" font-weight="800" fill="${ACCENT}">0</text>
  <text x="64" y="430" font-family="system-ui, sans-serif" font-size="32" fill="${MUTED}">Start your streak today.</text>
  <text x="1136" y="540" text-anchor="end" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="${ACCENT}">&#128293; Hot Streak</text>
</svg>`;
}
