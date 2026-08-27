import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://iouuikteroixnsqazznc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8');

const { data, error } = await supabase.from('records').select('id, serial, form_code, status, created_at').eq('form_code', 'TEST');
if (error) { console.error('ERR', error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 2));