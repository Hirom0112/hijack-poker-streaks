import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

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
 */
export default function ScaleToFit({
  designWidth = 1440,
  maxScale = 1.2,
  minScale = 0.5,
  children,
}: ScaleToFitProps) {
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(maxScale, Math.max(minScale, window.innerWidth / designWidth));
      setScale(s);
      setHeight(el.offsetHeight * s);
    };
    update();
    window.addEventListener('resize', update);
    // Track content-height changes (data load, async art) so the outer box keeps
    // up. Guarded — ResizeObserver is absent in some test (jsdom) environments.
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [designWidth, maxScale, minScale]);

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
