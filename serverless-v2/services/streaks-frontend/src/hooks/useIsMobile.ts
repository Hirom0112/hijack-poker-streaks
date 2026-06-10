import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Single source of "is this a phone-sized screen?" — true below the `md`
 * breakpoint (≈900px). Every responsive branch (ScaleToFit bypass, the mobile
 * dashboard/login layouts, the breakpoint-aware editor overrides) reads this so
 * the threshold is defined in exactly one place and stays tied to the theme.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(useTheme().breakpoints.down('md'));
}
