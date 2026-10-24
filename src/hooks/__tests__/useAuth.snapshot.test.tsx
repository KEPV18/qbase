// ============================================================================
// QBase — The RBAC snapshot AuthProvider owes recordStorage
//
// `recordStorage` decides the approval workflow from a module-level
// snapshot of the signed-in user.  That snapshot used to be written by
// the WRONG FUNCTION: `useAuth.tsx` imported `setCurrentUserSnapshot`
// and then declared a React state setter with the same name, which
// shadowed the import for the whole provider body.  Every call went to
// React's `useState` setter, so the module snapshot stayed `null` for
// the life of the session.
//
// The consequences were silent and total: `approveRecord` answered
// "Unauthorized: please sign in" for every record, every new record was
// stamped `pending_review` whatever its author's role, and the employee
// edit guard never fired.
//
// This test pins the write down.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getCurrentUserSnapshot, clearCurrentUserSnapshot } from '@/services/recordStorage';

const { loginMock, logoutMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
}));

vi.mock('../useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    login: loginMock,
    logout: logoutMock,
    register: vi.fn(),
    resetPassword: vi.fn(),
    syncUserProfile: vi.fn(),
  }),
}));

vi.mock('../useUserManagement', () => ({
  useUserManagement: () => ({
    reloadUsers: vi.fn(),
    addUser: vi.fn(),
    updateUser: vi.fn(),
    removeUser: vi.fn(),
    changePassword: vi.fn(),
  }),
}));

import { AuthProvider, useAuth } from '../useAuth';

function Probe() {
  const { login, logout } = useAuth();
  return (
    <>
      <button onClick={() => void login('owner@vezloo.ai', 'secret')}>sign in</button>
      <button onClick={() => logout()}>sign out</button>
    </>
  );
}

const APP_USER = {
  id: 'u-1',
  name: 'Owner',
  email: 'owner@vezloo.ai',
  password: '',
  role: 'admin' as const,
  department: 'Management',
  active: true,
};

describe('AuthProvider — the RBAC snapshot recordStorage reads', () => {
  beforeEach(() => {
    loginMock.mockReset();
    logoutMock.mockReset();
    clearCurrentUserSnapshot();
  });

  it('writes the snapshot when a sign-in succeeds', async () => {
    loginMock.mockResolvedValue({
      ok: true, code: 'ok', message: '', user: APP_USER, backend: 'supabase',
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    screen.getByText('sign in').click();

    await waitFor(() => {
      expect(getCurrentUserSnapshot()).not.toBeNull();
    });

    const snapshot = getCurrentUserSnapshot()!;
    expect(snapshot.userId).toBe('u-1');
    expect(snapshot.email).toBe('owner@vezloo.ai');
    // The storage layer knows three roles; an admin keeps its authority.
    expect(snapshot.role).toBe('admin');
    expect(snapshot.department).toBe('Management');
  });

  it('maps a role the storage layer does not know to an employee', async () => {
    loginMock.mockResolvedValue({
      ok: true, code: 'ok', message: '',
      user: { ...APP_USER, role: 'manager', department: 'Quality' },
      backend: 'supabase',
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    screen.getByText('sign in').click();

    await waitFor(() => expect(getCurrentUserSnapshot()).not.toBeNull());
    // 'manager' is not one of the storage layer's three roles, and it must
    // not be promoted to 'admin' by the mapping.
    expect(getCurrentUserSnapshot()!.role).toBe('employee');
    expect(getCurrentUserSnapshot()!.department).toBe('Quality');
  });

  it('clears the snapshot on sign-out', async () => {
    loginMock.mockResolvedValue({
      ok: true, code: 'ok', message: '', user: APP_USER, backend: 'supabase',
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    screen.getByText('sign in').click();
    await waitFor(() => expect(getCurrentUserSnapshot()).not.toBeNull());

    screen.getByText('sign out').click();
    await waitFor(() => expect(getCurrentUserSnapshot()).toBeNull());
  });
});
