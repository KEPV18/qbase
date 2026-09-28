// FormCodeRedirect — redirects /records/F/40 → /records/F/40-001
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FORM_SCHEMAS } from '@/data/formSchemas';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';

export default function FormCodeRedirect() {
  const { serial } = useParams<{ serial: string }>();
  const decodedSerial = serial ? decodeURIComponent(serial) : '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const isFormCode = /^F\/\d{1,2}$/.test(decodedSerial);

  useEffect(() => {
    if (!isFormCode) {
      navigate(`/records/${encodeURIComponent(decodedSerial)}`, { replace: true });
      return;
    }

    (async () => {
      try {
        // SINGLE getSession() call — this is the safest pattern:
        // - Returns cached session if valid
        // - Automatically refreshes if expired (via refresh_token)
        // - Returns null session if no auth or refresh failed
        // No race condition between getUser() and getSession()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session?.access_token) {
          // No valid session — redirect to login with return URL
          const returnUrl = encodeURIComponent(`/records/${decodedSerial}`);
          navigate(`/login?returnTo=${returnUrl}`, { replace: true });
          return;
        }

        const headers: Record<string, string> = {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '',
          'Authorization': `Bearer ${session.access_token}`,
        };

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL?.trim()}/rest/v1/records?select=serial&form_code=eq.${encodeURIComponent(decodedSerial)}&deleted_at=is.null&order=serial&limit=1`,
          { headers }
        );

        if (!res.ok) {
          if (res.status === 401) {
            // Token may have been revoked — force re-auth
            const returnUrl = encodeURIComponent(`/records/${decodedSerial}`);
            navigate(`/login?returnTo=${returnUrl}`, { replace: true });
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data && data.length > 0) {
          navigate(`/records/${encodeURIComponent(String(data[0].serial))}`, { replace: true });
        } else {
          const formDef = FORM_SCHEMAS.find(f => f.code === decodedSerial);
          if (formDef) {
            navigate(`/form/${encodeURIComponent(decodedSerial)}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [isFormCode, decodedSerial, navigate]);

  return (
    <AppShell breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: decodedSerial }]}>
      <div className="flex flex-col items-center justify-center py-20">
        {error ? (
          <>
            <p className="text-destructive mb-2">Error: {error}</p>
            <button onClick={() => navigate('/')} className="text-primary underline">Back to Dashboard</button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading {decodedSerial}...</p>
          </>
        )}
      </div>
    </AppShell>
  );
}