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

const { data, error } = await supabase.from('records').select('id, serial, form_code, status, created_at').eq('form_code', 'TEST');
if (error) { console.error('ERR', error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 2));