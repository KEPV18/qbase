// ============================================================================
// QBase — PageHeader renders what it is given
//
// `actions`, `onBack` and `iconClassName` used to be declared on the
// props and then never rendered.  A caller that asked for a "Refresh"
// button silently got no button at all: the Audit page's Sync, the
// Notifications page's Mark All Read / Clear All and the Compliance
// Report's Refresh were all invisible.
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../PageHeader';

const inRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PageHeader', () => {
  it('renders one button per action, with its label', () => {
    const onClick = vi.fn();
    inRouter(
      <PageHeader
        title="Audit Dashboard"
        actions={[{ label: 'Sync', onClick }]}
      />,
    );
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a back link when onBack is given', () => {
    inRouter(<PageHeader title="Audit Dashboard" onBack="/" />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('renders no back link when onBack is absent', () => {
    inRouter(<PageHeader title="Audit Dashboard" />);
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });

  it('applies the icon class to the icon', () => {
    const { container } = inRouter(
      <PageHeader title="Risk" icon={AlertTriangle} iconClassName="text-destructive-tint" />,
    );
    // The icon is the only svg inside the header's icon plate.
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-destructive-tint');
  });

  it('disables an action that asks to be disabled', () => {
    inRouter(
      <PageHeader
        title="Audit"
        actions={[{ label: 'Sync', onClick: vi.fn(), disabled: true }]}
      />,
    );
    expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled();
  });
});
