/**
 * Un-merges driving-theory's "identification" track (filterRole:
 * ["name","meaning","whereUsed"]) back into three separate standard
 * tracks (names/meanings/whereUsed), matching what the learner should
 * see as three independently selectable learning styles. Overwrites the
 * same storage path in place (curricula/questions.sample.json) — no new
 * upload path, no play_curricula row change needed.
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

const UPLOAD_PATH = 'curricula/questions.sample.json';

const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(UPLOAD_PATH);
const res = await fetch(pub.publicUrl);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const curriculum = await res.json();

const NEW_TRACKS = [
  { id: 'pairs', title: 'Differentiate Pairs', filterRole: 'pair' },
  { id: 'names', title: 'Name a Sign', filterRole: 'name' },
  { id: 'meanings', title: 'Meaning of Signs', filterRole: 'meaning' },
  { id: 'whereUsed', title: 'Where Signs Are Used', filterRole: 'whereUsed' },
  { id: 'reading', title: 'Reading Only', kind: 'reading' },
  { id: 'full', title: 'Questions & Answers', kind: 'full' },
];

console.log('Old tracks:', JSON.stringify(curriculum.tracks, null, 2));
curriculum.tracks = NEW_TRACKS;
console.log('New tracks:', JSON.stringify(curriculum.tracks, null, 2));

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(UPLOAD_PATH, JSON.stringify(curriculum), { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Overwrote play-assets/${UPLOAD_PATH} with un-merged tracks.`);
