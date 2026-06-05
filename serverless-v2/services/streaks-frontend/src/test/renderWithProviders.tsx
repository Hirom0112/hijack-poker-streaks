import { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { streaksApi } from '../store/streaksApi';
import { theme } from '../theme';

/** A fresh store per test, including the real auth slice + RTK Query api reducer/middleware. */
export function makeTestStore() {
  return configureStore({
    reducer: {
      auth: (state = { playerId: 'streak-001', isAuthenticated: true }) => state,
      [streaksApi.reducerPath]: streaksApi.reducer,
    },
    middleware: (gdm) => gdm().concat(streaksApi.middleware),
  });
}

export function renderWithProviders(ui: ReactElement) {
  const store = makeTestStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>{ui}</ThemeProvider>
      </Provider>
    ),
  };
}
