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

const { data: rows, error } = await supabase
  .from('play_curricula')
  .select('slug, title, json_path, is_active')
  .order('slug');
if (error) { console.error('DB ERROR', error); process.exit(1); }
console.log('ROWS:', JSON.stringify(rows, null, 2));

const wf = rows.find(r => r.slug === 'world-facts' && r.is_active);
if (!wf) { console.log('No active world-facts row found'); process.exit(0); }

const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(wf.json_path);
console.log('json url:', pub.publicUrl);
const res = await fetch(pub.publicUrl);
const body = await res.json();
console.log('has tracks?', Array.isArray(body) ? 'ARRAY-LEGACY-NO-TRACKS' : (body.tracks ? JSON.stringify(body.tracks) : 'NO tracks key'));
console.log('question count:', Array.isArray(body) ? body.length : body.questions?.length);
