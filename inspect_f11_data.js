const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { homedir } = require('node:os');

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