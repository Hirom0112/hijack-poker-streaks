import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { DEFAULT_LAYOUT, DEFAULT_LAYOUT_MOBILE, LAYOUT_VERSION } from './defaultLayout';

/** Per-asset visual transform (applied as a CSS transform, non-destructive). */
export interface Transform {
  x: number; // translate px
  y: number;
  rot: number; // degrees
  sx: number; // scaleX (width)
  sy: number; // scaleY (length/height)
}

export const IDENTITY: Transform = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };

interface EditorState {
  active: boolean;
  overrides: Record<string, Transform>;
  selectedId: string | null;
  registered: string[];
  toggle: () => void;
  select: (id: string | null) => void;
  register: (id: string) => void;
  update: (id: string, patch: Partial<Transform>) => void;
  resetOne: (id: string) => void;
  resetAll: () => void;
  exportJson: () => string;
}

const Ctx = createContext<EditorState | null>(null);
export const useEditor = () => useContext(Ctx);

const LS_OVERRIDES = 'editorOverrides';
const LS_ACTIVE = 'editorActive';
/** Mobile edits persist under a separate key so the two layouts never mix. */
const lsKey = (mobile: boolean) => LS_OVERRIDES + (mobile ? '_m' : '');

/**
 * Load the baked layout for this breakpoint, then layer any same-version local
 * edits on top. Mobile (≤md) and desktop have independent baked sets + storage,
 * so editing one never touches the other.
 */
function loadOverrides(mobile: boolean): Record<string, Transform> {
  const base = mobile ? DEFAULT_LAYOUT_MOBILE : DEFAULT_LAYOUT;
  let stored: Record<string, Transform> = {};
  try {
    if (localStorage.getItem('editorLayoutVersion') === String(LAYOUT_VERSION)) {
      stored = JSON.parse(localStorage.getItem(lsKey(mobile)) || '{}');
    } else {
      localStorage.setItem('editorLayoutVersion', String(LAYOUT_VERSION));
      localStorage.removeItem(lsKey(false));
      localStorage.removeItem(lsKey(true));
    }
  } catch {
    stored = {};
  }
  return { ...base, ...stored };
}

export function EditorProvider({ children }: { children: ReactNode }) {
  // The breakpoint that selects which baked layout + storage key is live — the
  // same `useIsMobile` (theme's down('md')) every responsive component reads, so
  // the editor's mobile/desktop swap can never drift from the layouts.
  const isMobile = useIsMobile();
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).has('edit')) return true;
    return localStorage.getItem(LS_ACTIVE) === '1';
  });
  const [overrides, setOverrides] = useState<Record<string, Transform>>(() =>
    loadOverrides(isMobile)
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registered, setRegistered] = useState<string[]>([]);

  // Crossing the breakpoint swaps to the other layout set (and its saved edits).
  useEffect(() => {
    setOverrides(loadOverrides(isMobile));
    setSelectedId(null);
  }, [isMobile]);

  useEffect(() => {
    localStorage.setItem(lsKey(isMobile), JSON.stringify(overrides));
  }, [overrides, isMobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActive((a) => {
          const next = !a;
          localStorage.setItem(LS_ACTIVE, next ? '1' : '0');
          if (!next) setSelectedId(null);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const register = useCallback((id: string) => {
    setRegistered((r) => (r.includes(id) ? r : [...r, id]));
  }, []);
  const update = useCallback((id: string, patch: Partial<Transform>) => {
    setOverrides((o) => ({ ...o, [id]: { ...IDENTITY, ...o[id], ...patch } }));
  }, []);
  const resetOne = useCallback((id: string) => {
    setOverrides((o) => {
      const next = { ...o };
      delete next[id];
      return next;
    });
  }, []);
  const resetAll = useCallback(
    () => setOverrides({ ...(isMobile ? DEFAULT_LAYOUT_MOBILE : DEFAULT_LAYOUT) }),
    [isMobile]
  );
  const exportJson = useCallback(() => JSON.stringify(overrides, null, 2), [overrides]);

  return (
    <Ctx.Provider
      value={{
        active,
        overrides,
        selectedId,
        registered,
        toggle: () => setActive((a) => !a),
        select: setSelectedId,
        register,
        update,
        resetOne,
        resetAll,
        exportJson,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
