/**
 * Step 4a: rename the remaining orphaned play_signs rows to accurate
 * display names (based on their real image_path content, verified
 * earlier). None of these are referenced by any question, so this is
 * purely cosmetic for the /admin/signs list.
 */
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

const renames = {
  stop_police: 'No Vehicles (Alt)',
  stop_police2: 'No Vehicles (Alt 2)',
  uneven_surface: 'No Pedestrians (Duplicate)',
  without_a_gate: 'No Pedestrians (Duplicate 2)',
  turn_right_mandatory: 'No Stopping (Duplicate)',
  '30_end': 'End Of No Overtaking (Duplicate)',
  '30_max': 'No Overtaking (Duplicate)',
  image2: 'Pedestrian Crossing (Duplicate)',
  image4: 'Yield',
};

for (const [key, name] of Object.entries(renames)) {
  const { error } = await supabase.from('play_signs').update({ name }).eq('key', key);
  if (error) console.error(`FAILED ${key}:`, error.message);
  else console.log(`renamed ${key} -> "${name}"`);
}
