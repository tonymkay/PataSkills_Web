/**
 * Uploads scripts/output/true-false.converted.json to
 * play-assets/curricula/true-false.json, overwriting the live true-false
 * curriculum in place. play_curricula's true-false row already points at
 * this exact path (json_path: 'curricula/true-false.json'), so no DB row
 * change is needed - just an upsert of the storage object.
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

const json = readFileSync(path.join(OUT_DIR, 'true-false.converted.json'), 'utf8');
const uploadPath = 'curricula/true-false.json';

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, json, { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath} (${JSON.parse(json).questions.length} questions)`);
