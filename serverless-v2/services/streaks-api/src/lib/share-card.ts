/**
 * Share-card SVG generator (FR-9.1, API_CONTRACT.md §4.9).
 *
 * A PURE `(state) => string` template: it takes the streak figures from the §4.1
 * aggregate and renders a single, self-contained 1200×630 SVG document on
 * Hijack's dark/orange brand (CLAUDE.md §8 — `#FF9800` orange accent on the
 * near-black `#0D1117` base) carrying the `HIJACK POKER` wordmark and the
 * "Hot Streak" promo tie-in. The card encodes `loginStreak`, `playStreak` and
 * `bestLoginStreak` only — it is a pure projection of the aggregate.
 *
 * Constraints (TECH_STACK §1 / STND-5): ZERO dependencies — no satori, no resvg,
 * no rasterizer. SVG is the guaranteed format. No external asset refs (fonts are
 * the generic `system-ui`/serif stacks; no `<image>`, no remote `href`) so the
 * card renders standalone in any browser tab or `<img src>`.
 *
 * Degrade-never-throw (ARCHITECTURE §7): the whole render is wrapped so any
 * unexpected input (NaN, non-finite, non-numeric, `null`/`undefined` state)
 * collapses to a minimal but valid branded fallback card — this function NEVER
 * throws and ALWAYS returns a string that starts with `<svg`.
 */

/** The streak figures the card projects (a subset of the §4.1 aggregate). */
export interface ShareCardState {
  loginStreak: number;
  playStreak: number;
  bestLoginStreak: number;
}

/** Brand tokens (CLAUDE.md §8). Single orange accent on near-black. */
const BG = '#0D1117';
const ACCENT = '#FF9800';
const FG = '#E6EDF3';
const MUTED = '#8B949E';
const PANEL = '#161B22';

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

/**
 * Build the brand SVG from already-sanitized figures. Kept separate so the
 * public entrypoint can wrap it in the degrade-never-throw guard.
 */
function buildSvg(login: string, play: string, best: string): string {
  // Layout: a hero "Hot Streak" card. Two big stat columns (login / play) over a
  // bottom personal-best strip, wordmark top-left, promo tie-in bottom-right.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Hijack Poker streak card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG}"/>
      <stop offset="1" stop-color="#11161F"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFC246"/>
      <stop offset="1" stop-color="${ACCENT}"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="10" fill="${ACCENT}"/>

  <!-- Wordmark (one contiguous run so "HIJACK POKER" reads as a single string) -->
  <text x="64" y="96" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="700" letter-spacing="4" fill="${ACCENT}">HIJACK POKER</text>
  <text x="66" y="138" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="24" letter-spacing="6" fill="${MUTED}">DAILY STREAKS</text>

  <!-- Login streak panel -->
  <rect x="64" y="190" width="510" height="280" rx="24" fill="${PANEL}" stroke="${ACCENT}" stroke-opacity="0.35"/>
  <text x="104" y="250" font-family="system-ui, sans-serif" font-size="26" letter-spacing="3" fill="${MUTED}">LOGIN STREAK</text>
  <text x="104" y="400" font-family="system-ui, sans-serif" font-size="200" font-weight="800" fill="url(#flame)">${login}</text>
  <text x="430" y="400" font-family="system-ui, sans-serif" font-size="120" fill="${ACCENT}">&#128293;</text>

  <!-- Play streak panel -->
  <rect x="626" y="190" width="510" height="280" rx="24" fill="${PANEL}" stroke="${ACCENT}" stroke-opacity="0.35"/>
  <text x="666" y="250" font-family="system-ui, sans-serif" font-size="26" letter-spacing="3" fill="${MUTED}">PLAY STREAK</text>
  <text x="666" y="400" font-family="system-ui, sans-serif" font-size="200" font-weight="800" fill="${FG}">${play}</text>
  <text x="992" y="400" font-family="system-ui, sans-serif" font-size="120">&#127183;</text>

  <!-- Personal best strip -->
  <text x="64" y="540" font-family="system-ui, sans-serif" font-size="40" font-weight="600" fill="${FG}">Personal best: <tspan fill="${ACCENT}">${best}</tspan> days</text>

  <!-- Promo tie-in -->
  <text x="1136" y="540" text-anchor="end" font-family="system-ui, sans-serif" font-size="32" font-weight="700" letter-spacing="2" fill="${ACCENT}">&#128293; Hot Streak</text>
  <text x="64" y="592" font-family="system-ui, sans-serif" font-size="24" fill="${MUTED}">Keep your streak alive — Hijack Poker Daily Streaks</text>
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
