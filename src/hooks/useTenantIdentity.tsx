// ============================================================================
// QMS Forge — Tenant Identity Context
// Provides company_name, company_logo_url, theme_color globally.
// Consumed by TopNav, Sidebar, Footer, RecordView, FormRenderer.
// No prop drilling. No hardcoded branding.
// ============================================================================

import React, { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { emitEvent, Events } from '@/services/eventBus';

// ============================================================================
// Types
// ============================================================================

export interface TenantIdentity {
  companyName: string;
  companyLogoUrl: string;
  themeColor: string;
  updatedAt: string | null;
  /** Whether settings have been configured (company_name is non-empty) */
  isConfigured: boolean;
  /** Display name: company_name if set, fallback to "QMS Forge" */
  displayName: string;
  /** Logo URL if set, null if not configured */
  logoUrl: string | null;
}

const DEFAULT_IDENTITY: TenantIdentity = {
  companyName: '',
  companyLogoUrl: '',
  themeColor: '',
  updatedAt: null,
  isConfigured: false,
  displayName: 'QMS Forge',
  logoUrl: null,
};

// ============================================================================
// Context
// ============================================================================

const TenantIdentityContext = createContext<TenantIdentity>(DEFAULT_IDENTITY);

export function useTenantIdentity(): TenantIdentity {
  return useContext(TenantIdentityContext);
}

// ============================================================================
// Query Key
// ============================================================================

const TENANT_KEY = ['tenant-settings'] as const;

// ============================================================================
// Fetcher
// ============================================================================

async function fetchTenantSettings(): Promise<TenantIdentity> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    // Let React Query retry — don't swallow the error as default identity
    throw new Error(`[tenantIdentity] ${error.message}`);
  }

  if (!data) {
    return DEFAULT_IDENTITY;
  }

  const companyName = data.company_name || '';
  const companyLogoUrl = data.company_logo_url || '';
  const themeColor = data.theme_color || '';
  const isConfigured = companyName.length > 0;

  return {
    companyName,
    companyLogoUrl,
    themeColor,
    updatedAt: data.updated_at || null,
    isConfigured,
    displayName: isConfigured ? companyName : 'QMS Forge',
    logoUrl: companyLogoUrl.length > 0 ? companyLogoUrl : null,
  };
}

// ============================================================================
// Provider
// ============================================================================

export function TenantIdentityProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: TENANT_KEY,
    queryFn: fetchTenantSettings,
    staleTime: 60_000,       // 1 minute — branding doesn't change often
    gcTime: 30 * 60_000,     // 30 minutes
    retry: 3,                 // Retry on auth lock timeouts
    refetchOnWindowFocus: true,
    placeholderData: DEFAULT_IDENTITY,
  });

  const identity = useMemo(() => data || DEFAULT_IDENTITY, [data]);

  return (
    <TenantIdentityContext.Provider value={identity}>
      {children}
    </TenantIdentityContext.Provider>
  );
}

// ============================================================================
// Cache Invalidation Hook
// Call this after updating tenant settings to force UI refresh
// ============================================================================

export function useInvalidateTenantIdentity() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: TENANT_KEY });
    // Also refetch immediately for instant UI update
    queryClient.refetchQueries({ queryKey: TENANT_KEY });
  };
}

// ============================================================================
// Update Hook
// ============================================================================

export function useUpdateTenantIdentity() {
  const invalidate = useInvalidateTenantIdentity();

  const updateIdentity = async (updates: {
    companyName?: string;
    companyLogoUrl?: string;
    themeColor?: string;
  }) => {
    const row: Record<string, string | null> = {};
    if (updates.companyName !== undefined) row.company_name = updates.companyName;
    if (updates.companyLogoUrl !== undefined) row.company_logo_url = updates.companyLogoUrl;
    if (updates.themeColor !== undefined) row.theme_color = updates.themeColor;

    // Fetch the singleton row ID dynamically (don't hardcode it)
    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!existing) {
      // No row yet — insert
      const { error } = await supabase.from('tenant_settings').insert(row);
      if (error) throw new Error(`Failed to create tenant settings: ${error.message}`);
    } else {
      const { error } = await supabase
        .from('tenant_settings')
        .update(row)
        .eq('id', existing.id);
      if (error) throw new Error(`Failed to update tenant settings: ${error.message}`);
    }

    // Invalidate cache to force UI refresh
    invalidate();

    // Emit tenant event (non-blocking)
    emitEvent(Events.tenantSettingsChanged(
      'companyName',
      existing?.company_name || '',
      updates.company_name || '',
      undefined
    )).catch(() => {});
  };

  return { updateIdentity };
}