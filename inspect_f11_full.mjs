import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://iouuikteroixnsqazznc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8'
);
(async () => {
  const { data, error } = await supabase
    .from('records')
    .select('serial, form_code, form_data')
    .eq('form_code', 'F/11')
    .order('serial', { ascending: true });
  if (error) { console.error('ERR', error); process.exit(1); }
  for (const r of data) {
    const fd = r.form_data || {};
    const items = fd.items || [];
    const bad = items.filter(it =>
      (typeof it.plan_date === 'string' && /^\d{1,2}$/.test(it.plan_date.trim())) ||
      (typeof it.actual_date === 'string' && /^\d{1,2}$/.test(it.actual_date.trim())) ||
      (String(it.plan_size||'').includes('/')) ||
      (String(it.actual_qty||'').includes('/'))
    );
    if (bad.length) {
      console.log('=== ' + r.serial + ' (bad rows: ' + bad.length + '/' + items.length + ')');
      for (const it of items) {
        console.log(JSON.stringify(it));
      }
    }
  }
  console.log('DONE');
})();