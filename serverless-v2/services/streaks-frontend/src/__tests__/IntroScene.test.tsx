import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OpenSequence from '../components/intro/OpenSequence';
import { TIMELINE } from '../components/intro/useSequencer';
import { makeTestStore } from '../test/renderWithProviders';
import { theme } from '../theme';

/**
 * BL-1 (redesigned): the 3-beat OpenSequence.
 * jsdom doesn't play <video>/<audio>, so we drive Skip and the timeline via
 * the watchdog/timers (fake timers) and assert the phase hand-offs.
 */
function renderSequence() {
  const store = makeTestStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/intro']}>
          <Routes>
            <Route path="/intro" element={<OpenSequence />} />
            <Route path="/login" element={<div>LOGIN ROUTE</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

describe('OpenSequence (redesigned BL-1)', () => {
  beforeEach(() => {
    setReducedMotion(false);
    sessionStorage.clear();
    localStorage.removeItem('introSound');
    // jsdom has no real <video>/<audio> playback.
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renders Skip and a sound toggle', () => {
    renderSequence();
    expect(screen.getByRole('button', { name: /Skip/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /intro sound/i })
    ).toBeInTheDocument();
  });

  it('advances video → logo → login on the timeline', async () => {
    vi.useFakeTimers();
    try {
      renderSequence();
      // Watchdog leaves Beat 1 -> Beat 2.
      act(() => {
        vi.advanceTimersByTime(TIMELINE.VIDEO_WATCHDOG_MS + 50);
      });
      // Wordmark of Beat 2 is now on stage.
      expect(screen.getByTestId('intro-wordmark')).toBeInTheDocument();
      // Hold + dissolve carries us to /login (navigate replace).
      act(() => {
        vi.advanceTimersByTime(
          TIMELINE.LOGO_HOLD_MS + TIMELINE.LOGO_TO_LOGIN_MS + 50
        );
      });
      expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Skip jumps straight to /login', async () => {
    const user = userEvent.setup();
    renderSequence();
    await user.click(screen.getByRole('button', { name: /Skip/i }));
    expect(await screen.findByText('LOGIN ROUTE')).toBeInTheDocument();
  });

  it('reduced-motion renders the static end-state (no video), then advances', () => {
    setReducedMotion(true);
    vi.useFakeTimers();
    try {
      renderSequence();
      // Static end-state shows the wordmark immediately, no horse <video>.
      expect(screen.getByTestId('intro-wordmark')).toBeInTheDocument();
      expect(document.querySelector('video')).toBeNull();
      act(() => {
        vi.advanceTimersByTime(
          TIMELINE.LOGO_HOLD_MS + TIMELINE.LOGO_TO_LOGIN_MS + 50
        );
      });
      expect(screen.getByText('LOGIN ROUTE')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('sound toggle persists the preference to localStorage', async () => {
    const user = userEvent.setup();
    renderSequence();
    const toggle = screen.getByRole('button', { name: /intro sound/i });
    expect(localStorage.getItem('introSound')).not.toBe('on');
    await user.click(toggle);
    await waitFor(() =>
      expect(localStorage.getItem('introSound')).toBe('on')
    );
    await user.click(toggle);
    await waitFor(() =>
      expect(localStorage.getItem('introSound')).toBe('off')
    );
  });
});
