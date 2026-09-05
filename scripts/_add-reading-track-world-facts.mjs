/**
 * Adds the universal 'reading' track to world-facts.json's tracks array
 * (it currently only has 'full') and re-uploads to the same storage path,
 * preserving questions/signs untouched.
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

const { data: row, error: rowErr } = await supabase
  .from('play_curricula')
  .select('slug, json_path, is_active')
  .eq('slug', 'world-facts')
  .eq('is_active', true)
  .single();
if (rowErr) throw rowErr;
console.log('Current json_path:', row.json_path);

const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(row.json_path);
const res = await fetch(pub.publicUrl);
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const body = await res.json();

if (Array.isArray(body)) throw new Error('unexpected legacy array shape for world-facts.json');
console.log('Existing tracks:', JSON.stringify(body.tracks));

const alreadyHasReading = (body.tracks ?? []).some((t) => t.id === 'reading');
if (alreadyHasReading) {
  console.log('reading track already present — nothing to do');
  process.exit(0);
}

body.tracks = [
  ...(body.tracks ?? []),
  { id: 'reading', title: 'Reading Only', kind: 'reading' },
];

const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(row.json_path, JSON.stringify(body), { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;

console.log('Uploaded updated world-facts.json with tracks:', JSON.stringify(body.tracks));
console.log('Question count preserved:', body.questions.length);
