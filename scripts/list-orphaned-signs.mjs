/**
 * Step 3b: recompute which play_signs keys are still unreferenced by
 * questions.corrected.json (the "orphaned" list may have changed since
 * the corrections filled in cyclist2/cyclist3/u_turn/oncoming_traffic/etc).
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/list-orphaned-signs.mjs
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
const supabase = createClient(
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL,
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY,
);

async function main() {
  const { data: signs, error } = await supabase.from('play_signs').select('key, name, image_path');
  if (error) throw error;

  const questions = JSON.parse(readFileSync(path.join(OUT_DIR, 'questions.corrected.json'), 'utf8'));
  const used = new Set();
  for (const q of questions) {
    if (Array.isArray(q.images)) q.images.forEach((k) => k && used.add(k));
    if (q.image) used.add(q.image);
  }

  const orphaned = signs.filter((s) => !used.has(s.key));
  console.log(`${signs.length} total signs, ${used.size} referenced, ${orphaned.length} orphaned\n`);
  for (const s of orphaned) {
    const url = supabase.storage.from('play-assets').getPublicUrl(s.image_path).data.publicUrl;
    console.log(`${s.key.padEnd(24)} ${s.name.padEnd(28)} ${url}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
