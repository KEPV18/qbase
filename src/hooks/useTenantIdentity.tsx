// ============================================================================
// QBase — Tenant Identity Context
// Provides company_name, company_logo_url, theme_color globally.
// Consumed by TopNav, Sidebar, Footer, RecordView, FormRenderer.
// No prop drilling. No hardcoded branding.
// ============================================================================

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { restGet } from '@/services/userService';
import { emitEvent, Events } from '@/services/eventBus';
import { safeEmit } from '@/lib/safeEmit';
import { brandTokens } from '@/config/brandColors';

/**
 * The custom properties the tenant's accent family is written into.
 *
 * The stylesheet reads them with a fallback, so when no tenant colour is
 * configured the tokens fall back to the design system's own blue — the
 * brand overrides are additive, never a replacement for the palette.
 */
const BRAND_VARIABLES = [
  '--brand-fill',
  '--brand-fill-fg',
  '--brand-tint',
  '--brand-tint-dark',
  '--brand-hover',
  '--brand-accent',
  '--brand-accent-dark',
] as const;

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
  /** Display name: company_name if set, fallback to "QBase" */
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
  displayName: 'QBase',
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

interface TenantSettingsRow {
  id: string;
  company_name: string | null;
  company_logo_url: string | null;
  theme_color: string | null;
  updated_at: string | null;
}

async function fetchTenantSettings(): Promise<TenantIdentity> {
  // Raw fetch bypass — supabase.from().select().maybeSingle() can hang on
  // Vercel's edge runtime. tenant_settings is anon-readable, so the anon
  // key alone suffices (no session token required).
  const { data, error } = await restGet<TenantSettingsRow[]>(
    '/rest/v1/tenant_settings?select=id,company_name,company_logo_url,theme_color,updated_at&limit=1',
    { allowAnon: true }
  );

  if (error) {
    // Let React Query retry — don't swallow the error as default identity
    throw new Error(`[tenantIdentity] ${error}`);
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row) {
    return DEFAULT_IDENTITY;
  }

  const companyName = row.company_name || '';
  const companyLogoUrl = row.company_logo_url || '';
  const themeColor = row.theme_color || '';
  const isConfigured = companyName.length > 0;

  return {
    companyName,
    companyLogoUrl,
    themeColor,
    updatedAt: row.updated_at || null,
    isConfigured,
    displayName: isConfigured ? companyName : 'QBase',
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

  // Apply theme_color as the app's accent family.
  //
  // The tenant's colour is written into `--brand-*` variables, and the
  // stylesheet maps the accent tokens onto them.  The family is derived
  // rather than copied, because a colour copied straight into `--primary`
  // left two defects behind: the fill kept a white label it could not
  // carry (the live tenant's green measured 2.33:1), and the accent TEXT
  // stayed the hardcoded blue, so the app showed a green button and blue
  // links — two accents in one view.  See `src/config/brandColors.ts`.
  useEffect(() => {
    const root = document.documentElement;
    const tokens = identity.themeColor ? brandTokens(identity.themeColor) : null;
    if (!tokens) {
      // No tenant colour (or one that carries no accent identity): drop
      // every override so the stylesheet's own tokens come back.
      BRAND_VARIABLES.forEach((name) => root.style.removeProperty(name));
      return;
    }
    root.style.setProperty('--brand-fill', tokens.fill);
    root.style.setProperty('--brand-fill-fg', tokens.fillForeground);
    root.style.setProperty('--brand-tint', tokens.tint);
    root.style.setProperty('--brand-tint-dark', tokens.tintDark);
    root.style.setProperty('--brand-hover', tokens.hover);
    root.style.setProperty('--brand-accent', tokens.accent);
    root.style.setProperty('--brand-accent-dark', tokens.accentDark);
  }, [identity.themeColor]);

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

    // Fetch the singleton row ID dynamically (don't hardcode it) — raw fetch
    const { data: existingRows } = await restGet<{ id: string; company_name?: string }[]>(
      '/rest/v1/tenant_settings?select=id,company_name&limit=1',
      { allowAnon: true }
    );
    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    if (!existing) {
      // No row yet — insert (mutation via supabase client — only the read path hangs)
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

    // Emit tenant event (non-blocking) - use safeEmit for structured error handling
    safeEmit(
      emitEvent(Events.tenantSettingsChanged(
        'companyName',
        existing?.company_name || '',
        updates.companyName || '',
        undefined
      )),
      'emitEvent:tenant.settings.changed'
    );
  };

  return { updateIdentity };
}