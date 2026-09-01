import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()])
);

const supabase = createClient(
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL,
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY
);

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\bsigns?\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function keyFromAnswer(answer) {
  return normalize(answer).replace(/\s+/g, '_');
}

async function run() {
  console.log('Fetching curriculum questions...');
  const { data: cur } = await supabase
    .from('play_curricula')
    .select('json_path')
    .eq('slug', 'driving-theory')
    .eq('is_active', true)
    .single();

  const pub = supabase.storage.from('play-assets').getPublicUrl(cur.json_path).data.publicUrl;
  const res = await fetch(pub);
  const questions = await res.json();

  const pairsMap = new Map();
  const signKeysSet = new Set();

  for (const q of questions) {
    if (!q.pairId || !q.signRef) continue;
    const isSignQuestion =
      (q.question || '').toLowerCase().includes('this sign called') && Array.isArray(q.answers);
    if (!isSignQuestion) continue;
    const answer = q.answers[q.correctAnswer];
    if (!answer) continue;

    const signKey = keyFromAnswer(answer);
    signKeysSet.add(signKey);

    if (!pairsMap.has(q.pairId)) pairsMap.set(q.pairId, {});
    const p = pairsMap.get(q.pairId);
    if (q.signRef === 'A') p.key_a = signKey;
    if (q.signRef === 'B') p.key_b = signKey;
  }

  const pairRows = [];
  for (const [pair_id, pair] of pairsMap.entries()) {
    if (pair.key_a && pair.key_b) {
      pairRows.push({ pair_id, key_a: pair.key_a, key_b: pair.key_b });
    }
  }

  console.log(`Found ${pairRows.length} pairs across ${questions.length} questions.`);

  console.log('Upserting pairRows to play_sign_pairs...');
  const { error: pairErr } = await supabase.from('play_sign_pairs').upsert(pairRows, { onConflict: 'pair_id' });
  if (pairErr) throw pairErr;

  console.log('Successfully populated play_sign_pairs with all curriculum pairs!');
}

run().catch(console.error);
