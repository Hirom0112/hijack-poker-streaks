import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Activity, ActivityDay } from '../types/streaks.types';
import Panel from './Panel';
import Rule from './Rule';

/**
 * Default (dark-brand) heat-map colors (FR-4.3 / §5.1) — kept as the cell-tint
 * fallback and for back-compat. Each theme overrides these via
 * `theme.palette.heatmap`; the tavern skin layers a painted ICON on top.
 */
export const ACTIVITY_COLORS: Record<Activity, string> = {
  none: '#21262D',
  login_only: '#9BE9A8',
  played: '#2EA043',
  freeze: '#388BFD',
  broken: '#F85149',
};

/**
 * Brighter, more-saturated glow colors for the painted cell icons — the cell-tint
 * palette (`theme.palette.heatmap`) reads too dim behind an icon on tan leather,
 * especially the gold `login_only`. These are tuned to pop as a halo.
 */
const GLOW_COLORS: Record<Activity, string> = {
  none: 'transparent',
  login_only: '#F6C84C', // brighter gold than the tan cell-tint
  played: '#46C172',
  freeze: '#7CC6E8',
  broken: '#F2645C',
};

/** Painted glyph per state (none = empty slot, no icon). */
export const ACTIVITY_ICONS: Partial<Record<Activity, string>> = {
  login_only: '/assets/dashboard/icons/cell-login.png',
  played: '/assets/dashboard/icons/cell-played.png',
  freeze: '/assets/dashboard/icons/cell-freeze.png',
  broken: '/assets/dashboard/icons/cell-broken.png',
};

const KNOWN: ReadonlySet<string> = new Set<Activity>([
  'none',
  'login_only',
  'played',
  'freeze',
  'broken',
]);

/** Tolerate unknown enum values — treat unknown `activity` as `none` (§7). */
function normalize(activity: string): Activity {
  return (KNOWN.has(activity) ? activity : 'none') as Activity;
}

const LABEL: Record<Activity, string> = {
  none: 'No activity',
  login_only: 'Logged in',
  played: 'Played',
  freeze: 'Freeze used',
  broken: 'Streak broken',
};

/** Sunday-first weekday initials for the calendar header. */
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** "2026-04" → "April 2026". */
function fmtMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${name} ${y}`;
}

/** UTC weekday (0=Sun…6=Sat) of a YYYY-MM-DD date. */
function weekday(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

interface CalendarHeatMapProps {
  month: string;
  days: ActivityDay[];
  /** Page to the previous month (disabled past the 90-day look-back). */
  onPrev?: () => void;
  /** Page to the next month (disabled at the current month — no future). */
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

/**
 * FR-4.3: month calendar heat map — a 7-column Sunday→Saturday grid (the first
 * day is offset to its real weekday) filling the panel width. Each day is a dark
 * leather well carrying a painted icon (person / cards / ice / broken-heart), or
 * an empty well for `none`. Each cell keeps its tooltip + testid + aria-label.
 */
export default function CalendarHeatMap({
  month,
  days,
  onPrev,
  onNext,
  canPrev = false,
  canNext = false,
}: CalendarHeatMapProps) {
  const theme = useTheme();
  const colors = theme.palette.heatmap ?? ACTIVITY_COLORS;
  const leadOffset = days.length ? weekday(days[0].date) : 0;

  return (
    <Panel editId="card-calendar" editLabel="Calendar card" innerSx={{ py: 0.5 }}>
      {/* month header with prev/next paging arrows, title centered */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <IconButton
          aria-label="Previous month"
          size="small"
          onClick={onPrev}
          disabled={!canPrev}
          sx={{ color: 'secondary.main' }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ textAlign: 'center', minWidth: 150 }}>
          {fmtMonth(month)}
        </Typography>
        <IconButton
          aria-label="Next month"
          size="small"
          onClick={onNext}
          disabled={!canNext}
          sx={{ color: 'secondary.main' }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
      <Rule my={1} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
        {/* weekday header row (S M T W T F S) */}
        {WEEKDAYS.map((d, i) => (
          <Typography
            key={`wd-${i}`}
            align="center"
            sx={{
              fontFamily: '"Zilla Slab", Georgia, serif',
              fontWeight: 700,
              fontSize: 12,
              color: 'text.secondary',
              pb: 0.25,
            }}
          >
            {d}
          </Typography>
        ))}
        {/* lead blanks so day 1 lands under its real weekday */}
        {Array.from({ length: leadOffset }).map((_, i) => (
          <Box key={`lead-${i}`} sx={{ aspectRatio: '1 / 1' }} />
        ))}
        {days.map((day) => {
          const activity = normalize(day.activity);
          const icon = ACTIVITY_ICONS[activity];
          const title = `${day.date} · ${LABEL[activity]} · login ${day.loginStreak} / play ${day.playStreak}`;
          return (
            <Tooltip key={day.date} title={title} arrow>
              <Box
                data-testid={`heatcell-${day.date}`}
                data-activity={activity}
                aria-label={title}
                sx={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 1,
                  backgroundColor: 'rgba(20,12,6,0.5)',
                  boxShadow:
                    activity === 'none'
                      ? 'inset 0 2px 5px rgba(0,0,0,0.45)'
                      : `inset 0 2px 5px rgba(0,0,0,0.45), inset 0 0 0 1.5px ${colors[activity]}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  transition: 'transform 120ms',
                  '&:hover': { transform: 'scale(1.12)' },
                }}
              >
                {/* faint day-of-month number */}
                <Typography
                  sx={{
                    position: 'absolute',
                    top: 2,
                    left: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: 'rgba(247,236,212,0.9)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {day.date.slice(-2)}
                </Typography>
                {icon && (
                  <Box
                    component="img"
                    src={icon}
                    alt={LABEL[activity]}
                    sx={{
                      width: '64%',
                      height: '64%',
                      objectFit: 'contain',
                      opacity: 0.97,
                      // colored glow keyed to the activity (red heart, blue freeze,
                      // green played, gold login) + a dark contact shadow for depth
                      filter: `drop-shadow(0 0 7px ${GLOW_COLORS[activity]}) drop-shadow(0 0 3px ${GLOW_COLORS[activity]}) drop-shadow(0 1px 1px rgba(0,0,0,0.65))`,
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        {(Object.keys(LABEL) as Activity[]).map((a) => (
          <Box key={a} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: 0.5,
                backgroundColor: 'rgba(20,12,6,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {ACTIVITY_ICONS[a] && (
                <Box
                  component="img"
                  src={ACTIVITY_ICONS[a]}
                  alt=""
                  sx={{ width: '80%', height: '80%', objectFit: 'contain' }}
                />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {LABEL[a]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}
