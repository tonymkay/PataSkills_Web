/**
 * Uploads the five universal track illustrations from assets/driving/
 * to play-assets/track-icons/, renamed to match play_track_defaults'
 * track_id values (pairs/names/meanings/whereUsed/reading — the real
 * StandardTrack ids from lib/curriculum.ts). Run once, then run
 * supabase/play_track_defaults.sql in the SQL editor to point the DB
 * rows at these paths.
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

const FILES = [
  { local: 'assets/driving/differenciate.webp', remote: 'track-icons/pairs.webp' },
  { local: 'assets/driving/name.webp', remote: 'track-icons/names.webp' },
  { local: 'assets/driving/meaning.webp', remote: 'track-icons/meanings.webp' },
  { local: 'assets/driving/usage.webp', remote: 'track-icons/whereUsed.webp' },
  { local: 'assets/driving/reading.webp', remote: 'track-icons/reading.webp' },
];

for (const { local, remote } of FILES) {
  const bytes = readFileSync(path.join(PROJECT_ROOT, local));
  const { error } = await supabase.storage
    .from('play-assets')
    .upload(remote, bytes, { contentType: 'image/webp', upsert: true });
  if (error) throw error;
  console.log(`Uploaded ${local} -> play-assets/${remote}`);
}
