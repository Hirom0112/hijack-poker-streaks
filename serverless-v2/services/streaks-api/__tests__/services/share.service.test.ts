/**
 * share-card SVG generator unit tests (S9, FR-9, API_CONTRACT.md §4.9).
 *
 * Strict-scope-style TDD for `lib/share-card.ts`: a PURE
 * `(state: ShareCardState) => string` that renders a self-contained 1344×798 SVG
 * — the photoreal "Hot Streak" plate art embedded as a base64 JPEG data URI with
 * the live `loginStreak` / `playStreak` / `bestLoginStreak` figures overlaid on
 * their measured slots. Self-contained = no network refs (the only `href` is a
 * `data:` URI). No DynamoDB IO.
 *
 * Degrade-never-throw (ARCHITECTURE §7): hostile / zero / non-finite input still
 * yields a valid SVG — the function MUST NOT throw.
 */
import { renderShareCard, fallbackCard } from '../../src/lib/share-card';

/** Strip the embedded base64 plate so substring assertions probe only the overlay. */
function overlayOf(svg: string): string {
  return svg.replace(/data:image\/jpeg;base64,[^"]*/g, 'PLATE');
}

describe('share-card › renders the Hot Streak plate', () => {
  const svg = renderShareCard({
    loginStreak: 12,
    playStreak: 5,
    bestLoginStreak: 45,
  });
  const overlay = overlayOf(svg);

  it('is a self-contained SVG document (1344×798)', () => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="1344"');
    expect(svg).toContain('height="798"');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('embeds the plate art as a base64 data URI, with NO network references', () => {
    expect(svg).toMatch(/<image\b[^>]*href="data:image\/jpeg;base64,/);
    expect(svg).not.toMatch(/href="https?:/);
    expect(svg).not.toMatch(/xlink:href/);
  });

  it('overlays the three live streak numbers', () => {
    expect(overlay).toContain('>12<'); // loginStreak
    expect(overlay).toContain('>5<'); // playStreak
    expect(overlay).toContain('>45<'); // bestLoginStreak
  });

  it('carries the HIJACK POKER + Hot Streak identity (accessible label)', () => {
    expect(overlay).toMatch(/HIJACK POKER/i);
    expect(overlay).toMatch(/Hot Streak/i);
  });

  it('display-clamps streaks at 365 (FR-1.7) without leaking the raw figures', () => {
    const big = overlayOf(
      renderShareCard({ loginStreak: 999, playStreak: 911, bestLoginStreak: 742 })
    );
    expect(big).toContain('>365<');
    expect(big).not.toContain('>999<');
    expect(big).not.toContain('>911<');
    expect(big).not.toContain('>742<');
  });
});

describe('share-card › degrade never throws', () => {
  it('renders a valid card for a zero-state new player', () => {
    const svg = renderShareCard({ loginStreak: 0, playStreak: 0, bestLoginStreak: 0 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns');
    expect(overlayOf(svg)).toContain('>0<'); // zero counters render as 0, not a crash
  });

  it('never throws on hostile / NaN / non-finite input', () => {
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
      expect(out.trimEnd().endsWith('</svg>')).toBe(true);
    }
  });

  it('never injects raw markup from a hostile string streak value', () => {
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

  it('exposes a minimal brand fallback (still dark/orange, never throws)', () => {
    const svg = fallbackCard();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('HIJACK POKER');
    expect(svg).toContain('#0D1117'); // near-black bg
    expect(svg).toContain('#FF9800'); // orange accent
  });
});
