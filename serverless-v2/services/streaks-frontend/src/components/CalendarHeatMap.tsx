import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import type { Activity, ActivityDay } from '../types/streaks.types';
import Panel from './Panel';

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

interface CalendarHeatMapProps {
  month: string;
  days: ActivityDay[];
}

/**
 * FR-4.3: 30-day calendar heat map. A CSS grid of one inset "slot" per day; each
 * slot is a dark leather well faintly ringed by the activity color and carrying a
 * painted icon (person / cards / ice / broken-heart), or an empty well for
 * `none`. Each cell keeps its tooltip + testid + aria-label.
 */
export default function CalendarHeatMap({ month, days }: CalendarHeatMapProps) {
  const theme = useTheme();
  const colors = theme.palette.heatmap ?? ACTIVITY_COLORS;
  return (
    <Panel innerSx={{ py: 0.5 }}>
      <Typography variant="h6" gutterBottom>
        Activity — {month}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.75,
        }}
      >
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
                {icon && (
                  <Box
                    component="img"
                    src={icon}
                    alt={LABEL[activity]}
                    sx={{ width: '74%', height: '74%', objectFit: 'contain' }}
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
