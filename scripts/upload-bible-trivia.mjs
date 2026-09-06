/**
 * Uploads scripts/_bible-trivia-payload.json to
 * play-assets/curricula/bible-trivia.json and lists what's currently in
 * play-assets/curricula/ so we can confirm whether the cover image
 * (bible-trivia.webp) has already landed in Storage.
 *
 * Does NOT touch play_curricula (RLS-blocked for anon) — see the printed
 * SQL for the insert to run manually in the Supabase SQL editor.
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

const json = readFileSync(path.join(__dirname, '_bible-trivia-payload.json'), 'utf8');
const uploadPath = 'curricula/bible-trivia.json';

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, json, { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath}`);

const { data: listing, error: listErr } = await supabase.storage
  .from('play-assets')
  .list('curricula');
if (listErr) throw listErr;
console.log('\nplay-assets/curricula/ now contains:');
for (const f of listing) console.log(' -', f.name);
