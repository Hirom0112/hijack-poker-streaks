import { http, HttpResponse } from 'msw';
import type {
  StreaksResponse,
  CalendarResponse,
  RewardRecord,
  FreezesResponse,
} from '../../types/streaks.types';

const BASE = 'http://localhost:5001/api/v1/player/streaks';

export const mockStreaks: StreaksResponse = {
  loginStreak: 12,
  playStreak: 5,
  bestLoginStreak: 45,
  bestPlayStreak: 22,
  freezesAvailable: 2,
  nextLoginMilestone: { days: 14, reward: 400, daysRemaining: 2 },
  nextPlayMilestone: { days: 7, reward: 300, daysRemaining: 2 },
  lastLoginDate: '2026-04-20',
  lastPlayDate: '2026-04-19',
};

// One month containing all five heat-map states.
export const mockCalendar: CalendarResponse = {
  month: '2026-04',
  days: [
    { date: '2026-04-01', activity: 'none', loginStreak: 0, playStreak: 0 },
    { date: '2026-04-02', activity: 'login_only', loginStreak: 1, playStreak: 0 },
    { date: '2026-04-03', activity: 'played', loginStreak: 2, playStreak: 1 },
    { date: '2026-04-04', activity: 'freeze', loginStreak: 2, playStreak: 1 },
    { date: '2026-04-05', activity: 'broken', loginStreak: 0, playStreak: 0 },
    // An unknown enum value must be tolerated and rendered as `none` (§7).
    { date: '2026-04-06', activity: 'mystery' as 'none', loginStreak: 0, playStreak: 0 },
    ...Array.from({ length: 24 }, (_, i) => ({
      date: `2026-04-${String(i + 7).padStart(2, '0')}`,
      activity: 'none' as const,
      loginStreak: 0,
      playStreak: 0,
    })),
  ],
};

export const mockRewards: RewardRecord[] = [
  {
    rewardId: 'r-002',
    type: 'login_milestone',
    milestone: 7,
    points: 150,
    streakCount: 7,
    createdAt: '2026-04-15T08:15:02Z',
    notification: {
      title: '7-day login streak!',
      body: 'You earned 150 bonus points for a 7-day login streak. 14 days unlocks 400!',
      deepLink: 'hijackpoker://streaks',
      milestone: 7,
      type: 'login_milestone',
    },
  },
  {
    rewardId: 'r-001',
    type: 'play_milestone',
    milestone: 3,
    points: 100,
    streakCount: 3,
    createdAt: '2026-04-10T14:30:01Z',
    notification: {
      title: '3-day play streak!',
      body: 'You earned 100 bonus points for a 3-day play streak. 7 days unlocks 300!',
      deepLink: 'hijackpoker://streaks',
      milestone: 3,
      type: 'play_milestone',
    },
  },
];

export const mockFreezes: FreezesResponse = {
  freezesAvailable: 2,
  freezesUsedThisMonth: 1,
  lastFreezeGrantDate: '2026-04',
  history: [
    { date: '2026-04-04', source: 'free_monthly' },
    { date: '2026-03-27', source: 'purchased' },
  ],
};

export const handlers = [
  http.get(BASE, () => HttpResponse.json(mockStreaks)),
  http.get(`${BASE}/calendar`, () => HttpResponse.json(mockCalendar)),
  http.get(`${BASE}/rewards`, () => HttpResponse.json(mockRewards)),
  http.get(`${BASE}/freezes`, () => HttpResponse.json(mockFreezes)),
  http.post(`${BASE}/check-in`, () =>
    HttpResponse.json({
      playerId: 'streak-001',
      checkedInToday: true,
      streakAdvanced: true,
      freezeConsumed: false,
      streaks: { ...mockStreaks, loginStreak: 13 },
      milestoneEarned: null,
    })
  ),
];
