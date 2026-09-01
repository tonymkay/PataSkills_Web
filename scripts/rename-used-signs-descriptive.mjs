/**
 * Renames play_signs.name to descriptive, human-readable values so the
 * admin sign library is actually usable when manually picking/verifying
 * images for a question (was: "Cyclist 2", "Image 1", "30km" etc).
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
  cyclist2: 'Cycle route (mandatory)',
  cyclist3: 'Cycle route (informational)',
  image1: 'Pedestrian crossing (location)',
  pedestrian: 'Pedestrian crossing (ahead)',
  bump: 'Series of road humps',
  end_of_dual_carriage: 'Dual carriageway ends',
  lane_ends_merge: 'Lane merges from the left',
  double_bend: 'Double bend (first left)',
  oncoming_traffic: 'Give priority to oncoming traffic',
  u_turn: 'U-turn permitted',
  '30km': 'Minimum speed limit (30)',
  max_speed: 'Maximum speed limit (90)',
  recommended_speed: 'Recommended speed plate (90)',
  end_30: 'End of minimum speed limit (30)',
};

for (const [key, name] of Object.entries(renames)) {
  const { error } = await supabase.from('play_signs').update({ name }).eq('key', key);
  if (error) console.error(`FAILED ${key}:`, error.message);
  else console.log(`renamed ${key} -> "${name}"`);
}
