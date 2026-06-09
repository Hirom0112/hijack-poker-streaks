/**
 * config/badges — the BADGE_LADDER single source of truth. These guard that the
 * cosmetic ladder stays in lock-step with the MILESTONES day list and that the
 * tier sequence + names match the locked §4.10 contract.
 */
import { BADGE_LADDER } from '../../src/config/badges';
import { MILESTONES } from '../../src/config/milestones';

const TIERS = ['tin', 'copper', 'bronze', 'silver', 'gold', 'platinum'];

describe('config/badges — BADGE_LADDER', () => {
  it('both axes mirror the six MILESTONES days, ascending', () => {
    const milestoneDays = MILESTONES.map((m) => m.days);
    expect(BADGE_LADDER.login.map((b) => b.milestone)).toEqual(milestoneDays);
    expect(BADGE_LADDER.play.map((b) => b.milestone)).toEqual(milestoneDays);
  });

  it('tiers ascend tin → platinum on both axes', () => {
    expect(BADGE_LADDER.login.map((b) => b.tier)).toEqual(TIERS);
    expect(BADGE_LADDER.play.map((b) => b.tier)).toEqual(TIERS);
  });

  it('login names match the locked contract', () => {
    expect(BADGE_LADDER.login.map((b) => b.name)).toEqual([
      'Greenhorn',
      'Deputy',
      'Sheriff',
      'Marshal',
      'Ranger Captain',
      'Frontier Legend',
    ]);
  });

  it('play names match the locked contract', () => {
    expect(BADGE_LADDER.play.map((b) => b.name)).toEqual([
      'Anted In',
      'Card Sharp',
      "Dead Man's Hand",
      'Quick Draw',
      'High Roller',
      'Royal Flush',
    ]);
  });
});
