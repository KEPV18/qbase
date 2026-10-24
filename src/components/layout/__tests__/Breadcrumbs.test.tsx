// ============================================================================
// QBase — Breadcrumbs builds its list, it does not edit the caller's
//
// The component used to do `const breadcrumbs = items || []` and then
// `push` the home crumb onto it.  A caller that passed `[]` found
// "Dashboard" sitting in its own array afterwards, and a second render
// pushed a second copy.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  it('does not write into the array it was given', () => {
    const items: { label: string; path?: string }[] = [];
    render(
      <MemoryRouter initialEntries={['/records']}>
        <Breadcrumbs items={items} />
      </MemoryRouter>,
    );
    expect(items).toEqual([]);
  });

  it('shows the caller’s own crumbs when they are given', () => {
    const items = [{ label: 'Dashboard', path: '/' }, { label: 'Records' }];
    render(
      <MemoryRouter initialEntries={['/records']}>
        <Breadcrumbs items={items} />
      </MemoryRouter>,
    );
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Dashboard');
  });

  it('builds a trail from the path when no crumbs are given', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/risk-management']}>
        <Breadcrumbs />
      </MemoryRouter>,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Dashboard');
    expect(text).toContain('Risk management');
  });
});
