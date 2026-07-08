// FormCodeRedirect — redirects /records/F/40 → /records/F/40-001
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecords } from '@/hooks/useRecordStorage';
import { FORM_SCHEMAS } from '@/data/formSchemas';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export function FormCodeRedirect() {
  const { serial } = useParams<{ serial: string }>();
  const decodedSerial = serial ? decodeURIComponent(serial) : '';
  const navigate = useNavigate();
  const isFormCode = /^F\/\d{1,2}$/.test(decodedSerial);
  const { data: records, isLoading } = useRecords(isFormCode ? decodedSerial : undefined);

  useEffect(() => {
    if (!isFormCode) {
      // Not a form code — go to RecordViewPage
      navigate(`/records/${encodeURIComponent(decodedSerial)}`, { replace: true });
      return;
    }

    if (!isLoading && records) {
      if (records.length > 0) {
        const sorted = [...records].sort((a, b) =>
          String(a.serial).localeCompare(String(b.serial), undefined, { numeric: true, sensitivity: 'base' })
        );
        navigate(`/records/${encodeURIComponent(String(sorted[0].serial))}`, { replace: true });
      } else {
        // No records — go to form template preview
        const formDef = FORM_SCHEMAS.find(f => f.code === decodedSerial);
        if (formDef) {
          navigate(`/form/${encodeURIComponent(decodedSerial)}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [isFormCode, decodedSerial, records, isLoading, navigate]);

  return (
    <AppShell breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: decodedSerial }]}>
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading {decodedSerial}...</p>
      </div>
    </AppShell>
  );
}