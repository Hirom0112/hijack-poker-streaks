import type { Transform } from './EditorContext';

/**
 * Bump this whenever the baked layout changes so saved editor overrides from an
 * older version are discarded (otherwise a stale localStorage would mask the new
 * layout). The header below is always re-applied, so bumping never shrinks it.
 */
export const LAYOUT_VERSION = 9;

/** Local identity (avoid importing IDENTITY from EditorContext — circular). */
const I: Transform = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };

/**
 * Baked transforms applied by default (edit mode or not).
 *
 * v4 adds the user's hand-placed **Trophy Shelf** arrangement (shelf, title,
 * subtitle, login banner, and all 12 medallions + labels) on top of the header.
 * These are small CSS-transform nudges/scales relative to the flow layout; the
 * whole dashboard lives inside ScaleToFit (designWidth 1440), so the offsets
 * scale uniformly with the viewport and don't clip on other screens. Any further
 * editor edits layer on top of these.
 */
export const DEFAULT_LAYOUT: Record<string, Transform> = {
  // Header
  shield: { x: -62.25, y: -8.96, rot: 0, sx: 2.04, sy: 1.86 },
  logo: { x: 73.01, y: -12.14, rot: 0, sx: 3, sy: 2.42 },
  'btn-checkin': { x: -172.54, y: -2.19, rot: 0, sx: 1.96, sy: 1.7 },
  'btn-share': { x: -77.32, y: -2.24, rot: 0, sx: 1.6, sy: 1.7 },
  'btn-logout': { x: -43.67, y: -0.32, rot: 0, sx: 1.6, sy: 1.7 },

  // Trophy Shelf — frame, title, subtitle, login banner
  'badge-shelf': { x: -16.19, y: 8.05, rot: 0, sx: 1.04, sy: 1.04 },
  'badge-title': { x: 1.16, y: 46.18, rot: 0, sx: 1.58, sy: 1.58 },
  'badge-subtitle': { x: -8.04, y: 55.97, rot: 0, sx: 1.04, sy: 1.04 },
  'badge-banner-login': { x: 4.75, y: -6.24, rot: 0, sx: 1, sy: 1 },
  // PLAY banner lifted up into the divider wood between the two ledges.
  'badge-banner-play': { x: 0, y: -16, rot: 0, sx: 1, sy: 1 },

  // Trophy Shelf — LOGIN medallions (x evened out to the flow position so the
  // enlarged badges spread across the ledge without overlapping; y = seating).
  'badge-img-login-3': { x: 0, y: -19.25, rot: 0, sx: 1, sy: 1 },
  'badge-img-login-7': { x: 0, y: -18.62, rot: 0, sx: 1, sy: 1 },
  'badge-img-login-14': { x: 0, y: -16.78, rot: 0, sx: 1, sy: 1 },
  'badge-img-login-30': { x: 0, y: -18.03, rot: 0, sx: 1, sy: 1 },
  'badge-img-login-60': { x: 0, y: -16.02, rot: 0, sx: 1, sy: 1 },
  'badge-img-login-90': { x: 0, y: -17.68, rot: 0, sx: 1, sy: 1 },

  // Trophy Shelf — LOGIN labels
  'badge-label-login-3': { x: 0, y: -15.56, rot: 0, sx: 1, sy: 1 },
  'badge-label-login-7': { x: 0, y: -13.71, rot: 0, sx: 1, sy: 1 },
  'badge-label-login-14': { x: 0, y: -14.27, rot: 0, sx: 1, sy: 1 },
  'badge-label-login-30': { x: 0, y: -14.52, rot: 0, sx: 1, sy: 1 },
  'badge-label-login-60': { x: 0, y: -14.99, rot: 0, sx: 1, sy: 1 },
  'badge-label-login-90': { x: 0, y: -14.12, rot: 0, sx: 1, sy: 1 },

  // Trophy Shelf — PLAY medallions
  'badge-img-play-3': { x: 0, y: 27.74, rot: 0, sx: 1, sy: 1 },
  'badge-img-play-7': { x: 0, y: 29.91, rot: 0, sx: 1, sy: 1 },
  'badge-img-play-14': { x: 0, y: 31.69, rot: 0, sx: 1, sy: 1 },
  'badge-img-play-30': { x: 0, y: 30.48, rot: 0, sx: 1, sy: 1 },
  'badge-img-play-60': { x: 0, y: 27.53, rot: 0, sx: 1, sy: 1 },
  'badge-img-play-90': { x: 0, y: 27.52, rot: 0, sx: 1, sy: 1 },

  // Trophy Shelf — PLAY labels
  'badge-label-play-3': { x: 0, y: 29.61, rot: 0, sx: 1, sy: 1 },
  'badge-label-play-7': { x: 0, y: 27.15, rot: 0, sx: 1, sy: 1 },
  'badge-label-play-14': { x: 0, y: 31.93, rot: 0, sx: 1, sy: 1 },
  'badge-label-play-30': { x: 0, y: 32.19, rot: 0, sx: 1, sy: 1 },
  'badge-label-play-60': { x: 0, y: 32.09, rot: 0, sx: 1, sy: 1 },
  'badge-label-play-90': { x: 0, y: 36.17, rot: 0, sx: 1, sy: 1 },
};

/**
 * MOBILE baked layout (applied only below `md`, ≈900px — see EditorContext).
 * Desktop is never affected by anything in here.
 *
 * Starts from the desktop layout, then NEUTRALIZES the header transforms — those
 * scale the wordmark 3× and translate the buttons for the 1440px canvas, which
 * overflows a phone. At identity the header renders at natural sizes inside the
 * mobile (stacked) layout. The Trophy-Shelf entries are kept: the shelf is scaled
 * as a unit on mobile (ScaleToFitContainer at its 1120px design width), so those
 * px nudges still land correctly before the whole shelf shrinks.
 *
 * EDIT THIS via the visual editor on a small screen (Cmd/Ctrl+Shift+E → arrange →
 * "Copy layout"), then paste the exported JSON over this object.
 */
export const DEFAULT_LAYOUT_MOBILE: Record<string, Transform> = {
  ...DEFAULT_LAYOUT,
  // Header — see note above (3× wordmark + button translates overflow a phone).
  shield: I,
  logo: I,
  'btn-checkin': I,
  'btn-share': I,
  'btn-logout': I,
  // Trophy-Shelf title/subtitle/shelf-frame: their desktop transforms translate
  // the title/subtitle DOWNWARD (y +46 / +56) and enlarge them — but these render
  // OUTSIDE the shelf scaler, so on mobile they shoved into the top medallions.
  // Neutralized → title + subtitle sit cleanly above the shelf. The per-medallion
  // and banner nudges stay (they live inside the scaled shelf and seat correctly).
  'badge-title': I,
  'badge-subtitle': I,
  'badge-shelf': I,
};
