import { type ReactNode } from 'react';
import { Box } from '@mui/material';
import { useIsMobile } from '../hooks/useIsMobile';
import { useScaleToFit } from '../hooks/useScaleToFit';

interface ScaleToFitProps {
  /** The width the content is authored at; it scales from here. */
  designWidth?: number;
  /** Don't blow the layout up past this on very wide monitors. */
  maxScale?: number;
  /** Don't shrink below this (keeps text legible on small windows). */
  minScale?: number;
  children: ReactNode;
}

/**
 * Scales its child as ONE unit to fit the viewport width — the whole dashboard
 * shrinks/grows together instead of reflowing. The content is laid out at a
 * fixed `designWidth` and CSS-`transform: scale()`d to `window.innerWidth`, so
 * the carefully-placed art never rewraps or clips. The outer box takes the
 * SCALED height so the page scrolls correctly.
 *
 * MOBILE: below `md` (≈900px) the fixed-canvas scale-down would render the
 * 1440px desktop layout at a tiny, clipped size on a phone. There we BYPASS
 * scaling entirely and render the children fluid (full width), letting their own
 * responsive breakpoints (the dashboard Grid's `xs`/`sm` columns) stack into a
 * proper mobile layout. Desktop (≥md) is unchanged — same scaled path as before.
 */
export default function ScaleToFit({
  designWidth = 1440,
  maxScale = 1.2,
  minScale = 0.5,
  children,
}: ScaleToFitProps) {
  const fluid = useIsMobile();
  const { inner, scale, height } = useScaleToFit(designWidth, {
    source: 'window',
    minScale,
    maxScale,
  });

  // Phone / small screen: no fixed canvas, no scale — render fluid so the
  // children's own responsive breakpoints take over.
  if (fluid) {
    return <Box sx={{ width: '100%' }}>{children}</Box>;
  }

  return (
    <Box sx={{ width: '100%', height, overflow: 'hidden' }}>
      <Box
        ref={inner}
        sx={{
          width: designWidth,
          mx: 'auto',
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
