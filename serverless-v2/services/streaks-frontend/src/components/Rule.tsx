import { Box } from '@mui/material';

interface RuleProps {
  /** Vertical margin (theme spacing units). */
  my?: number;
}

/**
 * A thin engraved gold divider line — the section separator used across the
 * tavern panels (e.g. between the Login and Play blocks of Next Milestone, or
 * under a panel header). Drawn entirely in CSS, no asset.
 */
export default function Rule({ my = 1.25 }: RuleProps) {
  return (
    <Box
      sx={{
        my,
        height: '4px',
        width: '100%',
        borderRadius: 2,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(214,176,92,0.85) 15%, rgba(233,201,128,0.95) 50%, rgba(214,176,92,0.85) 85%, transparent 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,190,0.4)',
      }}
    />
  );
}
