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
const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
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