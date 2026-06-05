import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The 3-beat app-open state machine (redesign BL-1+).
 *
 *   video → logo → toLogin → (done)
 *
 * - `video`   : Beat 1, the horse gallop clip plays full-bleed.
 * - `logo`    : Beat 2, wordmark fades/rises + the HJ chip spins in & settles.
 * - `toLogin` : Beat 3, cross-dissolve into the art-deco LoginScreen.
 * - `done`    : the dissolve finished; the host navigates to /login (replace).
 *
 * The hook owns timing only — it does not render. Components subscribe to
 * `phase` and call `onVideoEnded` / `skip` to drive it. A watchdog guarantees
 * we leave `video` even if the <video> `onEnded` never fires (some browsers).
 */
export type Phase = 'video' | 'logo' | 'toLogin' | 'done';

/** Beat-by-beat timeline (ms). Exported so tests/docs reference one source. */
export const TIMELINE = {
  /** Hard cap on Beat 1 if `onEnded` never fires (clip is ~4.04s). */
  VIDEO_WATCHDOG_MS: 4300,
  /** video → logo cross-dissolve. */
  VIDEO_TO_LOGO_MS: 300,
  /** Wordmark enters this long after the logo beat starts. */
  WORDMARK_DELAY_MS: 150,
  /** Chip launches this long after the logo beat starts (just after wordmark). */
  CHIP_DELAY_MS: 300,
  /** Chip travel + rotateY + spring settle window. */
  CHIP_SETTLE_AT_MS: 1350,
  /** Hold the full lockup before dissolving to login. */
  LOGO_HOLD_MS: 2300,
  /** logo → login cross-dissolve. */
  LOGO_TO_LOGIN_MS: 600,
} as const;

/** prefers-reduced-motion: skip the cinematic, show a brief static end-state. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const INTRO_SEEN_KEY = 'introSeen';

/** Returning-user bypass: once seen this session, don't replay the cinematic. */
export function introAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export interface Sequencer {
  phase: Phase;
  reducedMotion: boolean;
  /** Beat 2 has started — drives wordmark/chip enter animations. */
  logoActive: boolean;
  /** Beat 1 → Beat 2 (called from <video> onEnded). */
  onVideoEnded: () => void;
  /** Jump straight to the login dissolve (Skip / Esc). */
  skip: () => void;
  /** Signals the chip has reached its mark (for the settle SFX). */
  onChipSettled: () => void;
  /** Subscribe to the chip-settle moment (audio). Returns an unsubscribe. */
  onSettle: (cb: () => void) => () => void;
}

export function useSequencer(options?: {
  /** Test seam: force-skip the cinematic to the static end-state. */
  forceReducedMotion?: boolean;
  /** Called once when the sequence is fully done (host navigates). */
  onDone?: () => void;
}): Sequencer {
  const reducedMotion = options?.forceReducedMotion ?? prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'logo' : 'video');
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const settleSubs = useRef<Set<() => void>>(new Set());
  const timers = useRef<number[]>([]);
  const onDoneRef = useRef(options?.onDone);
  onDoneRef.current = options?.onDone;

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const toLogin = useCallback(() => {
    setPhase((p) => (p === 'done' ? p : 'toLogin'));
    after(TIMELINE.LOGO_TO_LOGIN_MS, () => {
      setPhase('done');
      markIntroSeen();
      onDoneRef.current?.();
    });
  }, [after]);

  const enterLogo = useCallback(() => {
    setPhase('logo');
    after(TIMELINE.LOGO_HOLD_MS, toLogin);
  }, [after, toLogin]);

  const onVideoEnded = useCallback(() => {
    // Only advance from Beat 1; ignore double-fire (onEnded + watchdog) and
    // any post-skip call. Guard via the phase ref (no side effect in setState).
    if (phaseRef.current !== 'video') return;
    enterLogo();
  }, [enterLogo]);

  const skip = useCallback(() => {
    clearTimers();
    toLogin();
  }, [clearTimers, toLogin]);

  const onChipSettled = useCallback(() => {
    settleSubs.current.forEach((cb) => cb());
  }, []);

  const onSettle = useCallback((cb: () => void) => {
    settleSubs.current.add(cb);
    return () => {
      settleSubs.current.delete(cb);
    };
  }, []);

  // Reduced-motion path: a brief static end-state, then straight to login.
  // Local timer id so this effect's cleanup never clears the dissolve timer.
  useEffect(() => {
    if (!reducedMotion) return;
    const id = window.setTimeout(toLogin, TIMELINE.LOGO_HOLD_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Watchdog: guarantee we leave Beat 1 even if onEnded never fires.
  // Local timer id (not clearTimers) so leaving `video` doesn't wipe the
  // logo-hold / dissolve timers scheduled by onVideoEnded/skip.
  useEffect(() => {
    if (reducedMotion || phase !== 'video') return;
    const id = window.setTimeout(onVideoEnded, TIMELINE.VIDEO_WATCHDOG_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, phase]);

  // Cleanup on unmount.
  useEffect(() => clearTimers, [clearTimers]);

  return {
    phase,
    reducedMotion,
    logoActive: phase === 'logo' || phase === 'toLogin' || phase === 'done',
    onVideoEnded,
    skip,
    onChipSettled,
    onSettle,
  };
}
