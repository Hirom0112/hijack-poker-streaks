import { useEffect } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Box } from '@mui/material';
import { TIMELINE } from './useSequencer';

/**
 * Beat 2 — the logo reveal.
 *
 * Wordmark "HIJACK POKER" fades + rises in, then the black HJ chip flies in
 * from the right doing a pseudo-3D rotateY coin-flip and springs onto its mark
 * with a specular highlight sweep. Framer Motion is loaded via LazyMotion +
 * domAnimation + the `m` component (~5KB) so it never enters the dashboard
 * bundle (this whole intro is lazy-split in App.tsx).
 *
 * Choreography (all GPU-composited transform/opacity):
 *   wordmark  opacity 0→1, y 28→0, blur 8→0   | 700ms expo-out, +150ms delay
 *   chip      x 420→0  (expo-out 900ms)
 *             rotateY 540→0 (quint-out 1050ms) — 1.5 turns, decelerating
 *             scale spring (stiffness 260 / damping 14) — overshoot & settle
 *             rotateZ 0→3→0 wobble on the drop
 *   sweep     a diagonal specular gleam crosses "HJ" right after the settle
 *
 * `static` renders the settled end-state with no motion (reduced-motion /
 * the host's static fallback). `onChipSettled` fires at the settle moment so
 * the host can play the chip-clink SFX.
 */
const EXPO_OUT = [0.16, 1, 0.3, 1] as const;
const QUINT_OUT = [0.22, 1, 0.36, 1] as const;

export default function LogoReveal({
  active,
  static: isStatic = false,
  onChipSettled,
}: {
  /** Beat 2 is on-stage — start the enter animations. */
  active: boolean;
  /** Render the settled end-state with no animation. */
  static?: boolean;
  onChipSettled?: () => void;
}) {
  const reduce = useReducedMotion();
  const motionless = isStatic || reduce;

  // Fire the settle callback once the chip would have landed.
  useEffect(() => {
    if (!active || motionless) return;
    const id = window.setTimeout(
      () => onChipSettled?.(),
      TIMELINE.CHIP_SETTLE_AT_MS
    );
    return () => window.clearTimeout(id);
  }, [active, motionless, onChipSettled]);

  // Static path: chip already settled — fire once on mount.
  useEffect(() => {
    if (active && motionless) onChipSettled?.();
  }, [active, motionless, onChipSettled]);

  const animateIn = active && !motionless;

  return (
    <LazyMotion features={domAnimation} strict>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          // Sunset bed so Beat 1 → Beat 2 feels continuous (no hard cut).
          background:
            'radial-gradient(120% 90% at 30% 38%, #E8A23C 0%, #C0431F 42%, #5A140C 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 4, md: 8 },
          overflow: 'hidden',
        }}
      >
        {/* ---- Wordmark (SWAP: final wordmark SVG) ---------------------- */}
        <m.div
          initial={motionless ? false : { opacity: 0, y: 28, filter: 'blur(8px)' }}
          animate={
            animateIn
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 1, y: 0, filter: 'blur(0px)' }
          }
          transition={{
            duration: 0.7,
            ease: EXPO_OUT,
            delay: TIMELINE.WORDMARK_DELAY_MS / 1000,
          }}
          style={{ textAlign: 'center', userSelect: 'none' }}
          data-testid="intro-wordmark"
        >
          <Box
            sx={{
              fontFamily: '"Rye", Georgia, serif',
              fontSize: { xs: 56, md: 96 },
              lineHeight: 1,
              letterSpacing: 2,
              background: 'linear-gradient(180deg, #F1D98C 0%, #D9A441 55%, #9C6B22 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 3px 6px rgba(0,0,0,0.45)',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
            }}
          >
            HIJACK
          </Box>
          <Box
            sx={{
              mt: 1,
              fontFamily: '"Smokum", "Rye", Georgia, serif',
              fontSize: { xs: 22, md: 34 },
              letterSpacing: 10,
              color: '#E8C778',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              textShadow: '0 2px 3px rgba(0,0,0,0.5)',
            }}
          >
            <span aria-hidden>◄</span>
            POKER
            <span aria-hidden>►</span>
          </Box>
        </m.div>

        {/* ---- Chip (perspective parent + rotateY coin-flip) ----------- */}
        <Box
          sx={{
            perspective: '1200px',
            width: { xs: 150, md: 230 },
            height: { xs: 150, md: 230 },
            flexShrink: 0,
          }}
        >
          <m.div
            style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
            initial={
              motionless
                ? false
                : { x: 420, rotateY: 540, scale: 0.6, opacity: 0 }
            }
            animate={
              animateIn
                ? { x: 0, rotateY: 0, scale: 1, opacity: 1, rotateZ: [0, 3, 0] }
                : { x: 0, rotateY: 0, scale: 1, opacity: 1 }
            }
            transition={{
              x: { duration: 0.9, ease: EXPO_OUT, delay: TIMELINE.CHIP_DELAY_MS / 1000 },
              rotateY: { duration: 1.05, ease: QUINT_OUT, delay: TIMELINE.CHIP_DELAY_MS / 1000 },
              opacity: { duration: 0.4, delay: TIMELINE.CHIP_DELAY_MS / 1000 },
              scale: {
                type: 'spring',
                stiffness: 260,
                damping: 14,
                restDelta: 0.001,
                delay: TIMELINE.CHIP_DELAY_MS / 1000,
              },
              rotateZ: {
                duration: 0.18,
                ease: 'easeOut',
                delay: (TIMELINE.CHIP_SETTLE_AT_MS - 120) / 1000,
              },
            }}
          >
            {/* SWAP: final chip asset here (PNG / SVG / spin sprite sheet). */}
            <Box
              component="img"
              src="/assets/chip-hj.svg"
              alt="Hijack Poker HJ chip"
              draggable={false}
              sx={{
                width: '100%',
                height: '100%',
                display: 'block',
                filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.55))',
                backfaceVisibility: 'hidden',
              }}
            />

            {/* Specular gleam sweeping across the chip just after it settles. */}
            <m.div
              aria-hidden
              initial={motionless ? false : { x: '-140%', opacity: 0 }}
              animate={
                animateIn ? { x: '140%', opacity: [0, 0.9, 0] } : { x: '140%', opacity: 0 }
              }
              transition={{
                duration: 0.55,
                ease: 'easeInOut',
                delay: TIMELINE.CHIP_SETTLE_AT_MS / 1000,
              }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background:
                  'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.55) 50%, transparent 62%)',
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }}
            />
          </m.div>
        </Box>
      </Box>
    </LazyMotion>
  );
}
