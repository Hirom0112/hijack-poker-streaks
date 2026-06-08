import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { ReactElement } from 'react';
import { Box } from '@mui/material';
import type { RootState } from './store';
import StreakDashboard from './components/StreakDashboard';
import LoginScreen from './components/LoginScreen';

/**
 * The redesigned cinematic open lives in its own lazy chunk so Framer Motion
 * (LazyMotion + domAnimation, ~5KB) never lands in the dashboard bundle.
 */
const OpenSequence = lazy(() => import('./components/intro/OpenSequence'));

/**
 * BL-1 routing + guard.
 * - The dashboard has its own URL: `/dashboard`.
 * - Auth is persisted (localStorage), so a REFRESH on /dashboard stays put.
 * - The normal flow (intro → login → dashboard) uses `replace`, so Back doesn't
 *   loop you through the cinematic. A direct/refreshed /intro still replays it.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/intro" replace />;
}

/** App root `/`: send authed players to the dashboard, newcomers to the intro. */
function RootRedirect() {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/dashboard' : '/intro'} replace />;
}

/** Black hold while the intro chunk loads (no flash before the cinematic). */
function IntroFallback() {
  return <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000' }} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/intro"
          element={
            // A direct/refreshed /intro always plays — refresh = restart.
            <Suspense fallback={<IntroFallback />}>
              <OpenSequence />
            </Suspense>
          }
        />
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <StreakDashboard />
            </RequireAuth>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
