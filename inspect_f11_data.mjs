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
  console.log('count:', data.length);
  for (const r of data) {
    const fd = r.form_data || {};
    const items = fd.items;
    const first = items && Array.isArray(items) && items.length ? items[0] : null;
    const keys = first ? Object.keys(first).join(',') : '(no items)';
    console.log('---', r.serial, '| items:', items?.length ?? 'none', '| keys:', keys);
    if (first) {
      console.log('  first row:', JSON.stringify(first));
    }
    // check legacy keys anywhere in form_data
    if (fd.plan_completion !== undefined || fd.actual_completion !== undefined) {
      console.log('  LEGACY KEYS PRESENT: plan_completion=', JSON.stringify(fd.plan_completion), 'actual_completion=', JSON.stringify(fd.actual_completion));
    }
  }
})();