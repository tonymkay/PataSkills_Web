import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const out = {};
  for (const line of readFileSync(path.join(PROJECT_ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = loadEnv();
const supabase = createClient(env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL, env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY);

const { data, error } = await supabase.from('play_curricula').select('*');
if (error) { console.error('ERR', error); process.exit(1); }
console.log(JSON.stringify(data, null, 2));

const { data: listing, error: listErr } = await supabase.storage.from('play-assets').list('curricula');
if (listErr) { console.error('LIST ERR', listErr); process.exit(1); }
console.log('\nplay-assets/curricula/ contains:');
for (const f of listing) console.log(' -', f.name);
