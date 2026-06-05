/**
 * Freeze domain logic — the lazy-evaluation DECISION (CLAUDE.md §3 strict scope,
 * Inv 5, ARCHITECTURE §5c).
 *
 * PURE: `evaluateFreeze` takes the loaded player + the axis's last active day +
 * today's UTC date and returns the freeze decision WITHOUT any DynamoDB IO. The
 * check-in / hand-completed flow runs this at the TOP, BEFORE the streak
 * transition, and applies it in the binding order:
 *
 *   (1) grant the monthly free freeze if due  (different YYYY-MM than last grant)
 *   (2) detect a missed day and consume a freeze if it protects (gap===2 + balance)
 *   (3) THEN run the streak transition on the possibly-protected state.
 *
 * Gap semantics (Inv 5): gap = daysBetween(lastDate, today).
 *   gap===1 → consecutive (checked in yesterday) → normal advance, no consume.
 *   gap===2 → exactly ONE missed day → protectable with one freeze.
 *   gap>=3 → TWO or more missed days → a single freeze cannot cover both → reset.
 *
 * A consumed freeze protects EXACTLY one missed day and applies to BOTH streaks
 * (the same decision is applied to the login AND play transitions in a request).
 */
import { daysBetween, yearMonth, yesterday } from '../lib/utc';
import type { PlayerStreak } from '../domain/types';

/** Which balance a consumed freeze came from (DATA_MODEL.md §6). */
export type FreezeSource = 'free_monthly' | 'purchased';

/**
 * The pure freeze decision for one lazy-eval pass.
 *
 * `newFreezesAvailable` / `newFreezesUsedThisMonth` / `newLastFreezeGrantDate`
 * are the POST-decision balances (grant applied, consume applied) the repository
 * persists. `protected` (the missed day was covered) drives whether the streak
 * transition advances (treat `last` as yesterday) or resets.
 */
export interface FreezeDecision {
  /** A monthly free freeze was granted on this pass (different YYYY-MM). */
  grantedMonthly: boolean;
  /** A freeze was consumed to protect the single missed day. */
  freezeConsumed: boolean;
  /** Whether the missed day is protected (drives advance-vs-reset). */
  protected: boolean;
  /** The single missed UTC day a freeze protected (only when `freezeConsumed`). */
  missedDate?: string;
  /** Which balance the consumed freeze came from (only when `freezeConsumed`). */
  freezeSource?: FreezeSource;
  /** Freeze balance after grant + consume. */
  newFreezesAvailable: number;
  /** Freezes-used-this-month after consume. */
  newFreezesUsedThisMonth: number;
  /** `lastFreezeGrantDate` after a possible grant (YYYY-MM | null). */
  newLastFreezeGrantDate: string | null;
}

/**
 * Compute the freeze decision for one axis.
 *
 * @param player   the loaded player aggregate (the shared freeze-balance state).
 * @param lastDate the axis's last active UTC day (`lastLoginDate`/`lastPlayDate`),
 *                 or `null` for a never-active axis.
 * @param today    today's UTC `YYYY-MM-DD`, computed once at the handler edge.
 */
export function evaluateFreeze(
  player: PlayerStreak,
  lastDate: string | null,
  today: string,
): FreezeDecision {
  // (1) Monthly grant — settled FIRST so a just-granted freeze can protect the
  // gap on the same pass. Compared by calendar month, not every 30 days: grant
  // iff the last grant was a DIFFERENT YYYY-MM (or never granted).
  const currentMonth = yearMonth(today);
  const grantedMonthly = player.lastFreezeGrantDate !== currentMonth;

  let available = player.freezesAvailable + (grantedMonthly ? 1 : 0);
  const lastGrantDate = grantedMonthly ? currentMonth : player.lastFreezeGrantDate;
  let usedThisMonth = player.freezesUsedThisMonth;

  // (2) Missed-day detection + consume. Only an EXACT one-missed-day gap (===2)
  // with a positive balance is protectable; gap>=3 (two+ missed days) cannot be
  // covered by one freeze → no protection even with a balance available.
  let freezeConsumed = false;
  let isProtected = false;
  let missedDate: string | undefined;
  let freezeSource: FreezeSource | undefined;

  if (lastDate !== null) {
    const gap = daysBetween(lastDate, today);
    if (gap === 2 && available > 0) {
      freezeConsumed = true;
      isProtected = true;
      missedDate = yesterday(today); // the single missed UTC day
      // Prefer the free monthly grant as the spent source for accounting: if the
      // monthly freeze was granted this very pass, the consumed freeze IS that
      // free_monthly one; otherwise it comes from the purchased balance.
      freezeSource = grantedMonthly ? 'free_monthly' : 'purchased';
      available -= 1;
      usedThisMonth += 1;
    }
  }

  return {
    grantedMonthly,
    freezeConsumed,
    protected: isProtected,
    missedDate,
    freezeSource,
    newFreezesAvailable: available,
    newFreezesUsedThisMonth: usedThisMonth,
    newLastFreezeGrantDate: lastGrantDate,
  };
}
