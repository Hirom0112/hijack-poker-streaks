import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import CalendarHeatMap from '../components/CalendarHeatMap';
import type { ActivityDay } from '../types/streaks.types';

const days: ActivityDay[] = [
  { date: '2026-04-01', activity: 'none', loginStreak: 0, playStreak: 0 },
  { date: '2026-04-02', activity: 'login_only', loginStreak: 1, playStreak: 0 },
  { date: '2026-04-03', activity: 'played', loginStreak: 2, playStreak: 1 },
  { date: '2026-04-04', activity: 'freeze', loginStreak: 2, playStreak: 1 },
  { date: '2026-04-05', activity: 'broken', loginStreak: 0, playStreak: 0 },
  // unknown enum → treated as `none` (§7)
  { date: '2026-04-06', activity: 'wat' as 'none', loginStreak: 0, playStreak: 0 },
  ...Array.from({ length: 24 }, (_, i) => ({
    date: `2026-04-${String(i + 7).padStart(2, '0')}`,
    activity: 'none' as const,
    loginStreak: 0,
    playStreak: 0,
  })),
];

describe('CalendarHeatMap', () => {
  it('renders one cell per day (~30)', () => {
    renderWithProviders(<CalendarHeatMap month="2026-04" days={days} />);
    const cells = screen.getAllByTestId(/^heatcell-/);
    expect(cells.length).toBe(30);
  });

  it('marks each cell with its activity + a painted icon (4 active states, none = empty)', () => {
    renderWithProviders(<CalendarHeatMap month="2026-04" days={days} />);
    // none → tagged none, no icon
    const none = screen.getByTestId('heatcell-2026-04-01');
    expect(none).toHaveAttribute('data-activity', 'none');
    expect(within(none).queryByRole('img')).toBeNull();
    // the four active states → tagged + carry an icon
    const cases: [string, string][] = [
      ['heatcell-2026-04-02', 'login_only'],
      ['heatcell-2026-04-03', 'played'],
      ['heatcell-2026-04-04', 'freeze'],
      ['heatcell-2026-04-05', 'broken'],
    ];
    for (const [id, activity] of cases) {
      const cell = screen.getByTestId(id);
      expect(cell).toHaveAttribute('data-activity', activity);
      expect(within(cell).getByRole('img')).toBeInTheDocument();
    }
  });

  it('treats an unknown activity value as none (§7)', () => {
    renderWithProviders(<CalendarHeatMap month="2026-04" days={days} />);
    const cell = screen.getByTestId('heatcell-2026-04-06');
    expect(cell).toHaveAttribute('data-activity', 'none');
    expect(within(cell).queryByRole('img')).toBeNull();
  });

  it('wraps each cell in a tooltip carrying date + activity + streak counts', () => {
    renderWithProviders(<CalendarHeatMap month="2026-04" days={days} />);
    const cell = screen.getByTestId('heatcell-2026-04-03');
    // MUI Tooltip exposes its title via aria-label on the child.
    expect(cell).toHaveAttribute('aria-label', expect.stringContaining('2026-04-03'));
    expect(cell).toHaveAttribute('aria-label', expect.stringContaining('Played'));
    expect(cell).toHaveAttribute('aria-label', expect.stringContaining('login 2'));
    expect(within(cell.parentElement ?? cell).queryByText).toBeDefined();
  });
});
