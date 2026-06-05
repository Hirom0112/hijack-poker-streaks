import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Audio gating for the intro. Browsers block autoplay with sound, so:
 *  - default OFF; a small toggle (remembered in localStorage) opts in;
 *  - when ON, the gallop bed plays on Beat 1 and a chip-clink fires on settle;
 *  - enabling mid-sequence kicks the gallop bed immediately (user gesture).
 *
 * Audio NEVER auto-blares — playback only ever follows the user's stored
 * preference, and the first enable is itself a click (a valid gesture).
 */
const SOUND_KEY = 'introSound';

function readPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on';
  } catch {
    return false;
  }
}

export interface IntroSound {
  enabled: boolean;
  toggle: () => void;
  /** Start the looping/long gallop bed (Beat 1). Safe to call repeatedly. */
  playGallop: () => void;
  /** Fire the chip-settle clink (Beat 2 settle). */
  playChipSettle: () => void;
  /** Stop everything (skip / unmount). */
  stopAll: () => void;
}

export function useIntroSound(): IntroSound {
  const [enabled, setEnabled] = useState<boolean>(readPref);
  const gallopRef = useRef<HTMLAudioElement | null>(null);
  const chipRef = useRef<HTMLAudioElement | null>(null);

  // Lazily construct the <audio> elements (client only).
  useEffect(() => {
    gallopRef.current = new Audio('/assets/audio/horse-gallop.mp3');
    gallopRef.current.preload = 'auto';
    chipRef.current = new Audio('/assets/audio/chip-settle.mp3');
    chipRef.current.preload = 'auto';
    return () => {
      gallopRef.current?.pause();
      chipRef.current?.pause();
      gallopRef.current = null;
      chipRef.current = null;
    };
  }, []);

  const playGallop = useCallback(() => {
    if (!enabled || !gallopRef.current) return;
    gallopRef.current.currentTime = 0;
    void gallopRef.current.play().catch(() => {
      /* autoplay/gesture rejection — silently ignore */
    });
  }, [enabled]);

  const playChipSettle = useCallback(() => {
    if (!enabled || !chipRef.current) return;
    chipRef.current.currentTime = 0;
    void chipRef.current.play().catch(() => {});
  }, [enabled]);

  const stopAll = useCallback(() => {
    gallopRef.current?.pause();
    chipRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        /* non-fatal */
      }
      if (!next) {
        gallopRef.current?.pause();
        chipRef.current?.pause();
      } else {
        // Enabling is a user gesture — kick the gallop bed now.
        if (gallopRef.current) {
          gallopRef.current.currentTime = 0;
          void gallopRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  return { enabled, toggle, playGallop, playChipSettle, stopAll };
}
