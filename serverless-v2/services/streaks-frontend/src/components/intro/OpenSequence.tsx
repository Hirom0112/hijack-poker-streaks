import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import LoginScreen from '../LoginScreen';
import HorseVideo from './HorseVideo';
import LogoReveal from './LogoReveal';
import { useSequencer, TIMELINE } from './useSequencer';
import { useIntroSound } from './useIntroSound';

/**
 * The redesigned 3-beat app-open (Route A, desktop-first).
 *
 *   Beat 1  HorseVideo  (full-bleed gallop)
 *   Beat 2  LogoReveal  (wordmark + HJ chip spin-in)
 *   Beat 3  cross-dissolve into the EXISTING art-deco LoginScreen, then
 *           navigate('/login', { replace }) so the route finalizes invisibly.
 *
 * LoginScreen is rendered UNDER the cinematic the whole time and revealed by
 * fading the intro layers out (option A) — so the hand-off is a true crossfade,
 * not a route flash. Skip (button + Esc) jumps to the login dissolve.
 * prefers-reduced-motion renders the static end-state, then dissolves.
 */
export default function OpenSequence() {
  const navigate = useNavigate();
  const sound = useIntroSound();

  const finish = useCallback(() => {
    sound.stopAll();
    navigate('/login', { replace: true });
  }, [navigate, sound]);

  const seq = useSequencer({ onDone: finish });

  // Audio: gallop bed on Beat 1, chip-clink on the settle moment.
  useEffect(() => {
    if (seq.phase === 'video') sound.playGallop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.phase]);

  useEffect(() => {
    const unsub = seq.onSettle(() => sound.playChipSettle());
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc → skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') seq.skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seq]);

  const showVideo = !seq.reducedMotion && seq.phase === 'video';
  const showLogo = seq.phase === 'logo' || seq.phase === 'toLogin' || seq.reducedMotion;
  // Intro layers fade out during the toLogin dissolve to reveal login beneath.
  const introFadingOut = seq.phase === 'toLogin' || seq.phase === 'done';

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      {/* Beat 3 target rendered underneath the whole time (option A). */}
      <Box sx={{ position: 'absolute', inset: 0 }} aria-hidden={!introFadingOut}>
        <LoginScreen />
      </Box>

      {/* Cinematic layers, cross-dissolved over the login. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: introFadingOut ? 0 : 1,
          transition: `opacity ${TIMELINE.LOGO_TO_LOGIN_MS}ms ease`,
          pointerEvents: introFadingOut ? 'none' : 'auto',
        }}
      >
        {/* Beat 1 */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: showVideo ? 1 : 0,
            transition: `opacity ${TIMELINE.VIDEO_TO_LOGO_MS}ms ease`,
          }}
        >
          {!seq.reducedMotion && <HorseVideo onEnded={seq.onVideoEnded} />}
        </Box>

        {/* Beat 2 */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: showLogo ? 1 : 0,
            transition: `opacity ${TIMELINE.VIDEO_TO_LOGO_MS}ms ease`,
          }}
        >
          {showLogo && (
            <LogoReveal
              active={seq.logoActive}
              static={seq.reducedMotion}
              onChipSettled={seq.onChipSettled}
            />
          )}
        </Box>
      </Box>

      {/* Controls: Skip (top-right) + sound toggle (just left of it). */}
      {!introFadingOut && (
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 10,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Tooltip title={sound.enabled ? 'Sound on' : 'Sound off'}>
            <IconButton
              onClick={sound.toggle}
              aria-label={sound.enabled ? 'Mute intro sound' : 'Unmute intro sound'}
              aria-pressed={sound.enabled}
              sx={{
                color: '#F3E6CC',
                bgcolor: 'rgba(0,0,0,0.25)',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' },
              }}
            >
              {sound.enabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
          </Tooltip>

          <Button
            onClick={seq.skip}
            variant="outlined"
            sx={{
              color: '#F3E6CC',
              borderColor: 'rgba(243,230,204,0.5)',
              backdropFilter: 'blur(4px)',
              '&:hover': { borderColor: '#F3E6CC', bgcolor: 'rgba(0,0,0,0.3)' },
            }}
          >
            Skip
          </Button>
        </Box>
      )}
    </Box>
  );
}
