import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Credentials are read from the environment, falling back to the operator env
// file (~/.config/qbase/backup.env). Values are never printed or logged.
const env = { ...process.env };
const envFile = join(homedir(), '.config', 'qbase', 'backup.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}
const missing = [];
if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (missing.length) {
  console.error('Missing ' + missing.join(' / ') + '. Nothing read.');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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