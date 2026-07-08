// FormCodeRedirect — redirects /records/F/40 → /records/F/40-001
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FORM_SCHEMAS } from '@/data/formSchemas';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function FormCodeRedirect() {
  const { serial } = useParams<{ serial: string }>();
  const decodedSerial = serial ? decodeURIComponent(serial) : '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const isFormCode = /^F\/\d{1,2}$/.test(decodedSerial);

  useEffect(() => {
    if (!isFormCode) {
      // Not a form code — send to RecordViewPage
      navigate(`/records/${encodeURIComponent(decodedSerial)}`, { replace: true });
      return;
    }

    // Query Supabase directly for first record of this form
    (async () => {
      try {
        const { data, error } = await supabase
          .from('records')
          .select('serial')
          .eq('form_code', decodedSerial)
          .is('deleted_at', null)
          .order('serial', { ascending: true })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          navigate(`/records/${encodeURIComponent(String(data[0].serial))}`, { replace: true });
        } else {
          // No records — go to form template preview
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