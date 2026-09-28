import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://iouuikteroixnsqazznc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8');

// Count records per form code and flag incomplete-looking empty form_data
const { data, error } = await supabase.from('records').select('form_code, form_data');
if (error) { console.error('ERR', error.message); process.exit(1); }

const byForm = new Map();
let incomplete = 0;
const incompleteList = [];
for (const r of data) {
  const fc = r.form_code || 'NONE';
  if (!byForm.has(fc)) byForm.set(fc, { total: 0, empty: 0 });
  const entry = byForm.get(fc);
  entry.total++;
  const fd = r.form_data;
  if (!fd || (typeof fd === 'object' && Object.keys(fd).length === 0)) {
    entry.empty++;
    incomplete++;
    incompleteList.push(r.form_code + ':' + (r.serial || '?'));
  }
}

console.log('TOTAL RECORDS:', data.length);
console.log('INCOMPLETE (empty form_data):', incomplete);
if (incompleteList.length) console.log('  →', incompleteList.join(', '));
console.log('');
console.log('FORM COUNTS:');
for (const [fc, e] of [...byForm.entries()].sort((a,b) => a[0].localeCompare(b[0]))) {
  console.log(fc.padEnd(8), e.total, e.empty ? '⚠ ' + e.empty + ' EMPTY' : '');
}