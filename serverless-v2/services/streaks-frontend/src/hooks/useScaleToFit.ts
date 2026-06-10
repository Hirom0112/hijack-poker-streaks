import { useLayoutEffect, useRef, useState } from 'react';

interface ScaleOptions {
  /** Where the available width is measured from: the viewport, or this scaler's
   *  own container element (attach the returned `outer` ref for `'container'`). */
  source: 'window' | 'container';
  /** Clamp the computed scale. Defaults: no lower bound, never enlarge past 1×. */
  minScale?: number;
  maxScale?: number;
}

/**
 * Shared measure-and-scale engine behind {@link ScaleToFit} (window-measured) and
 * {@link ScaleToFitContainer} (container-measured). Scales a fixed-`designWidth`
 * child to the available width and reports the SCALED height so the outer box
 * flows correctly with no empty gap beneath.
 *
 * Re-measures on window resize, on the inner element resizing (height, for async
 * art/data), and — for the container source — on the outer element resizing, so a
 * container-width change that doesn't originate from a window resize (a scrollbar
 * appearing, a parent track recomputing) still re-scales. The height write targets
 * the OUTER box but is driven by the inner's height, so there's no write→observe
 * loop on width.
 */
export function useScaleToFit(
  designWidth: number,
  { source, minScale = 0, maxScale = 1 }: ScaleOptions
) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const update = () => {
      const avail = source === 'window' ? window.innerWidth : outer.current?.clientWidth ?? 0;
      const s = Math.min(maxScale, Math.max(minScale, avail / designWidth));
      setScale(s);
      setHeight(el.offsetHeight * s);
    };
    update();
    window.addEventListener('resize', update);
    // Guarded — ResizeObserver is absent in some test (jsdom) environments.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el); // inner: height changes (async art / data load)
    // container source: also watch the outer element so width changes that don't
    // fire a window 'resize' (scrollbar, parent reflow) still re-scale.
    if (outer.current) ro?.observe(outer.current);
    return () => {
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [designWidth, source, minScale, maxScale]);

  return { outer, inner, scale, height };
}
