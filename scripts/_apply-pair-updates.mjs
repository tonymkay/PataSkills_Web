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
const updates = JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'scripts/output/pair-updates.json'), 'utf8'));

let ok = 0, failed = 0, noRowMatched = 0;
for (const [pairId, patch] of Object.entries(updates)) {
  const { data, error } = await supabase.from('play_sign_pairs').update(patch).eq('pair_id', pairId).select();
  if (error) { console.log('ERROR', pairId, error.message); failed++; continue; }
  if (!data || data.length === 0) { console.log('NO ROW MATCHED', pairId); noRowMatched++; continue; }
  console.log('OK', pairId, JSON.stringify(data[0]));
  ok++;
}
console.log(`\ndone: ${ok} ok, ${failed} failed, ${noRowMatched} no-row-matched`);
