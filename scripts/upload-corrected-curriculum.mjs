/**
 * Step 4b: uploads scripts/output/questions.corrected.json to
 * play-assets/curricula/questions.linked.json and repoints the
 * driving-theory row's json_path at it.
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

const json = readFileSync(path.join(OUT_DIR, 'questions.corrected.json'), 'utf8');
const uploadPath = 'curricula/questions.linked.json';

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, json, { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath}`);

const { data, error: dbErr } = await supabase
  .from('play_curricula')
  .update({ json_path: uploadPath })
  .eq('slug', 'driving-theory')
  .eq('is_active', true)
  .select();
if (dbErr) throw dbErr;
console.log('Updated play_curricula row:', data);
