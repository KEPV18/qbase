import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://iouuikteroixnsqazznc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8'
);
(async () => {
  const { data, error } = await supabase
    .from('records')
    .select('serial, form_code, form_data')
    .in('serial', ['F/11-012', 'F/11-013']);
  if (error) { console.error('ERR', error); process.exit(1); }
  for (const r of data) {
    console.log('==========', r.serial);
    console.log(JSON.stringify(r.form_data, null, 2));
  }
})();