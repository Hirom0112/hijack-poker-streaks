/**
 * share-card SVG generator unit tests (S9, FR-9, API_CONTRACT.md §4.9).
 *
 * Strict-scope-style TDD for `lib/share-card.ts`: a PURE
 * `(state: ShareCardState) => string` that renders a self-contained, zero-dep
 * 1200×630 SVG on Hijack's dark/orange brand (`#0D1117` bg, `#FF9800` accent),
 * encoding `loginStreak` / `playStreak` / `bestLoginStreak`, the `HIJACK POKER`
 * wordmark, and the "Hot Streak" promo tie-in (CLAUDE.md §8). No DynamoDB IO.
 *
 * Degrade-never-throw (ARCHITECTURE §7): a zero-state / new player still yields a
 * minimal but valid branded SVG at all times — the function MUST NOT throw.
 */
import { renderShareCard } from '../../src/lib/share-card';

describe('share-card › renders brand SVG', () => {
  const svg = renderShareCard({
    loginStreak: 12,
    playStreak: 5,
    bestLoginStreak: 45,
  });

  it('is a self-contained SVG document', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('has no external asset references (fully standalone)', () => {
    // No <image href>, no url(http…), no external fonts/links.
    expect(svg).not.toMatch(/<image\b/);
    expect(svg).not.toMatch(/href="https?:/);
    expect(svg).not.toMatch(/xlink:href/);
  });

  it('encodes the three streak numbers', () => {
    expect(svg).toContain('12'); // loginStreak
    expect(svg).toContain('5'); // playStreak
    expect(svg).toContain('45'); // bestLoginStreak
  });

  it('carries the HIJACK POKER wordmark + Hot Streak tie-in', () => {
    expect(svg).toContain('HIJACK POKER');
    expect(svg).toMatch(/Hot Streak/i);
  });

  it('uses the dark/orange brand palette', () => {
    expect(svg).toContain('#0D1117'); // near-black bg
    expect(svg).toContain('#FF9800'); // orange accent
  });

  it('display-clamps streaks at 365 (FR-1.7)', () => {
    const big = renderShareCard({
      loginStreak: 999,
      playStreak: 911,
      bestLoginStreak: 742,
    });
    expect(big).toContain('365');
    // The raw over-cap figures must not leak as streak values. (We probe with
    // figures that don't collide with the fixed SVG layout literals.)
    expect(big).not.toContain('999');
    expect(big).not.toContain('911');
    expect(big).not.toContain('742');
  });
});

describe('share-card › degrade never throws', () => {
  it('renders a minimal valid fallback for a zero-state new player', () => {
    const svg = renderShareCard({
      loginStreak: 0,
      playStreak: 0,
      bestLoginStreak: 0,
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns');
    expect(svg).toContain('HIJACK POKER');
    expect(svg).toContain('#0D1117');
    // zero counters render as 0, not as a crash.
    expect(svg).toContain('0');
  });

  it('never throws on hostile / NaN / non-finite input', () => {
    // Defensive: even garbage values must yield a valid branded SVG, never throw.
    const cases: unknown[] = [
      { loginStreak: NaN, playStreak: Infinity, bestLoginStreak: -1 },
      { loginStreak: undefined, playStreak: null, bestLoginStreak: undefined },
      {},
      null,
      undefined,
    ];
    for (const input of cases) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = renderShareCard(input as any);
      expect(typeof out).toBe('string');
      expect(out.startsWith('<svg')).toBe(true);
      expect(out).toContain('HIJACK POKER');
    }
  });

  it('never injects raw markup from a hostile string streak value', () => {
    // Force a string slip-through. A non-numeric value degrades to the safe `0`
    // (it can never reach a text node as markup), so the document stays valid
    // and no raw `<script>` is ever emitted. The XML-escape helper is the
    // belt-and-braces second line of defence behind that numeric coercion.
    const svg = renderShareCard({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loginStreak: '<script>alert(1)</script>' as any,
      playStreak: 5,
      bestLoginStreak: 45,
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('alert(1)');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });
});
