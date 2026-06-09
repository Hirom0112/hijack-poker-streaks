/**
 * Badge ladder — the SINGLE source of truth for the cosmetic name/tier mapping
 * behind `GET /api/v1/player/streaks/badges` (API_CONTRACT.md §4.10).
 *
 * Badges are a pure read-only PROJECTION layered on top of the milestone ladder
 * (`config/milestones.ts`). The six rungs here mirror the six MILESTONES days
 * (3/7/14/30/60/90) per axis; this file adds ONLY the presentational
 * `name` + `tier` for each rung. It deliberately does NOT touch points, the
 * `streak_bonus` transaction, or the FR-7 notification contract — those stay
 * owned by `milestones.ts` / `reward.service.ts`. Keep the day list in lock-step
 * with MILESTONES (asserted by the config test).
 */
import type { BadgeTier } from '../domain/types';

/** A single badge rung's static (non-derived) definition. */
export interface BadgeRung {
  milestone: number;
  name: string;
  tier: BadgeTier;
}

/**
 * The 6+6 ladder, milestone-ascending per axis. Western/poker-themed names per
 * the locked contract; tiers ascend tin → platinum across the six rungs.
 */
export const BADGE_LADDER: { readonly login: readonly BadgeRung[]; readonly play: readonly BadgeRung[] } = {
  login: [
    { milestone: 3, name: 'Greenhorn', tier: 'tin' },
    { milestone: 7, name: 'Deputy', tier: 'copper' },
    { milestone: 14, name: 'Sheriff', tier: 'bronze' },
    { milestone: 30, name: 'Marshal', tier: 'silver' },
    { milestone: 60, name: 'Ranger Captain', tier: 'gold' },
    { milestone: 90, name: 'Frontier Legend', tier: 'platinum' },
  ],
  play: [
    { milestone: 3, name: 'Anted In', tier: 'tin' },
    { milestone: 7, name: 'Card Sharp', tier: 'copper' },
    { milestone: 14, name: "Dead Man's Hand", tier: 'bronze' },
    { milestone: 30, name: 'Quick Draw', tier: 'silver' },
    { milestone: 60, name: 'High Roller', tier: 'gold' },
    { milestone: 90, name: 'Royal Flush', tier: 'platinum' },
  ],
};
