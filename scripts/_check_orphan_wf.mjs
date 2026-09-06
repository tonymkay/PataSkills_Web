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

const { data, error } = await supabase.storage.from('play-assets').download('curricula/world-facts.json');
if (error) { console.error('ERR', error); process.exit(1); }
const text = await data.text();
const json = JSON.parse(text);
console.log('keys:', Object.keys(json));
console.log('num questions:', json.questions?.length);
console.log('tracks:', json.tracks);
console.log('first question:', JSON.stringify(json.questions?.[0], null, 2));
console.log('section sample:', [...new Set((json.questions||[]).map(q=>q.section))].slice(0,10));
