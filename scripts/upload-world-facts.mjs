/**
 * Uploads scripts/output/world-facts.json (converted from World_Facts_1_0_0.json,
 * see json-conversion.md) to play-assets/curricula/world-facts.json,
 * replacing the previous (placeholder-quality) World Facts content in place.
 * Repoints the 'world-facts' play_curricula row's json_path if needed.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'output');

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

const json = readFileSync(path.join(OUT_DIR, 'world-facts.json'), 'utf8');
const uploadPath = 'curricula/world-facts.json';

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, json, { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath}`);

const { data, error: dbErr } = await supabase
  .from('play_curricula')
  .update({ json_path: uploadPath })
  .eq('slug', 'true-false')
  .eq('is_active', true)
  .select();
if (dbErr) throw dbErr;
console.log('Updated play_curricula row:', data);
