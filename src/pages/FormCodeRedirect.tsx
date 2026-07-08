// FormCodeRedirect — redirects /records/F/40 → /records/F/40-001
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FORM_SCHEMAS } from '@/data/formSchemas';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://iouuikteroixnsqazznc.supabase.co';
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()) || '';

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/records?select=serial&form_code=eq.${encodeURIComponent(decodedSerial)}&deleted_at=is.null&order=serial&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
            signal: controller.signal,
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
        if ((err as Error).name === 'AbortError') {
          setError('Request timed out');
        } else {
          setError((err as Error).message);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();

    return () => controller.abort();
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