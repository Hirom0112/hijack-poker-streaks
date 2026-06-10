import { type ReactNode } from 'react';
import { Box } from '@mui/material';
import { useScaleToFit } from '../hooks/useScaleToFit';

interface ScaleToFitContainerProps {
  /** The width the child is authored at; it scales down from here. */
  designWidth: number;
  children: ReactNode;
}

/**
 * Container-based scaler. Unlike {@link ScaleToFit} (which keys off the window and
 * is bypassed on mobile), this scales its child down to the measured width of its
 * OWN container, capped at 1× so it never enlarges. It exists for blocks whose
 * internal geometry is fixed-pixel and cannot reflow — the Trophy Shelf, whose
 * medallions sit at hand-tuned positions on the wooden-shelf art — so on a phone
 * the whole shelf shrinks together (art intact) instead of the medallions
 * overflowing and overlapping. The shared engine reports the SCALED height so the
 * page flows correctly with no empty gap beneath.
 */
export default function ScaleToFitContainer({
  designWidth,
  children,
}: ScaleToFitContainerProps) {
  const { outer, inner, scale, height } = useScaleToFit(designWidth, {
    source: 'container',
    maxScale: 1,
  });

  return (
    <Box ref={outer} sx={{ width: '100%', height, overflow: 'hidden' }}>
      <Box
        ref={inner}
        sx={{ width: designWidth, transformOrigin: 'top left', transform: `scale(${scale})` }}
      >
        {children}
      </Box>
    </Box>
  );
}
