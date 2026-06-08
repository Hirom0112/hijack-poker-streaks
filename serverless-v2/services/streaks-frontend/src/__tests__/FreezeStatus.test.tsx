import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import FreezeStatus from '../components/FreezeStatus';

describe('FreezeStatus (MSW-backed)', () => {
  it('shows the freeze count and last-used history from /freezes', async () => {
    renderWithProviders(<FreezeStatus />);
    expect(await screen.findByText(/2 freezes available/i)).toBeInTheDocument();
    expect(await screen.findByText(/Used this month: 1/)).toBeInTheDocument();
    expect(await screen.findByText('2026-04-04')).toBeInTheDocument();
    expect(await screen.findByText(/free monthly/)).toBeInTheDocument();
  });

  it('shows an "active today" freeze status when today is a freeze day', async () => {
    renderWithProviders(<FreezeStatus todayActivity="freeze" />);
    expect(await screen.findByText(/Freeze status: Active today/i)).toBeInTheDocument();
  });

  it('shows "none active" on a non-freeze day', async () => {
    renderWithProviders(<FreezeStatus todayActivity="played" />);
    expect(await screen.findByText(/Freeze status: None active/i)).toBeInTheDocument();
    expect(screen.queryByText(/Active today/i)).not.toBeInTheDocument();
  });
});
