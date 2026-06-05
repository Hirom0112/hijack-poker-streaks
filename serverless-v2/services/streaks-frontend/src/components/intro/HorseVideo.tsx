import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

/**
 * Beat 1 — the flat-vector horse gallop toward the sun. Native <video>
 * (no JS animation lib): MP4 + WebM sources + a poster, muted/playsInline/
 * autoPlay, object-fit: cover for full-bleed 16:9 desktop framing.
 *
 * On `onEnded` (or the host's watchdog) the sequencer advances to Beat 2.
 * If the video errors, we surface the poster as a static fallback and let the
 * watchdog carry the sequence forward.
 */
export default function HorseVideo({ onEnded }: { onEnded: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errored, setErrored] = useState(false);

  // Best-effort autoplay (some engines need an explicit play() after mount).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => {
      /* autoplay may be deferred; poster covers the gap, watchdog advances */
    });
  }, []);

  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: '#0E0805' }}>
      {!errored ? (
        <video
          ref={videoRef}
          poster="/assets/horse-intro-poster.jpg"
          autoPlay
          muted
          playsInline
          onEnded={onEnded}
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          <source src="/assets/horse-intro.webm" type="video/webm" />
          <source src="/assets/horse-intro.mp4" type="video/mp4" />
        </video>
      ) : (
        <Box
          role="img"
          aria-label="Hijack Poker — horse galloping toward the sunset"
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/assets/horse-intro-poster.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </Box>
  );
}
