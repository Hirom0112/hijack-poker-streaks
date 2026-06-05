import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { streaksApi } from './store/streaksApi';
import { DEFAULT_THEME, themes, type ThemeName } from './theme';

/** Demo default player (ASSUMPTIONS A-2): the login screen pre-fills `streak-001`. */
export const DEFAULT_PLAYER_ID = 'streak-001';

interface AuthState {
  playerId: string | null;
  isAuthenticated: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  // Start logged OUT so the app always opens at the beginning:
  // localhost:4001 → /intro (cinematic) → login → "Continue as streak-001" → dashboard.
  initialState: {
    playerId: null,
    isAuthenticated: false,
  } as AuthState,
  reducers: {
    login(state, action: PayloadAction<string>) {
      state.playerId = action.payload;
      state.isAuthenticated = true;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('playerId', action.payload);
      }
    },
    logout(state) {
      state.playerId = null;
      state.isAuthenticated = false;
    },
  },
});

export const { login, logout } = authSlice.actions;

/** Theme slice (BL-2): the active theme name, persisted to localStorage. */
const THEME_KEY = 'themeName';
function isThemeName(v: string | null): v is ThemeName {
  return v !== null && v in themes;
}
const storedTheme =
  typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
const initialThemeName: ThemeName = isThemeName(storedTheme)
  ? storedTheme
  : DEFAULT_THEME;

const themeSlice = createSlice({
  name: 'theme',
  initialState: { name: initialThemeName } as { name: ThemeName },
  reducers: {
    setTheme(state, action: PayloadAction<ThemeName>) {
      state.name = action.payload;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THEME_KEY, action.payload);
      }
    },
  },
});

export const { setTheme } = themeSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    theme: themeSlice.reducer,
    [streaksApi.reducerPath]: streaksApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(streaksApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
