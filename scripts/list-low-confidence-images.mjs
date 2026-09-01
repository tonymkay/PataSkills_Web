/**
 * Step 1 (resume plan): prints each low-confidence pairRef next to its
 * currently-matched sign's image URL, PLUS the full play_signs list
 * (key/name/image URL) so corrections can be picked by eye.
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/list-low-confidence-images.mjs
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
const supabase = createClient(
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL,
  env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY,
);

async function main() {
  const report = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, 'scripts/output/sign-mapping-report.json'), 'utf8'),
  );

  const { data: signs, error } = await supabase
    .from('play_signs')
    .select('key, name, image_path');
  if (error) throw error;

  const byKey = new Map(signs.map((s) => [s.key, s]));
  function publicUrl(imagePath) {
    if (!imagePath) return null;
    return supabase.storage.from('play-assets').getPublicUrl(imagePath).data.publicUrl;
  }

  console.log(`\n=== ${report.lowConfidence.length} LOW-CONFIDENCE PAIRREFS ===\n`);
  for (const entry of report.lowConfidence) {
    const sign = byKey.get(entry.mapping?.key ?? entry.matchedSignName ? findKeyByName(signs, entry.matchedSignName) : null);
    const matched = signs.find((s) => s.name === entry.matchedSignName);
    console.log(`${entry.pairRef}`);
    console.log(`  derivedName:      ${entry.derivedName}`);
    console.log(`  currentGuess:     ${entry.matchedSignName ?? '(none)'} (confidence ${entry.confidence?.toFixed?.(2) ?? entry.confidence})`);
    console.log(`  currentGuessImg:  ${matched ? publicUrl(matched.image_path) : '(no match)'}`);
    console.log('');
  }

  console.log(`\n=== FULL play_signs LIST (${signs.length}) ===\n`);
  const sorted = [...signs].sort((a, b) => a.key.localeCompare(b.key));
  for (const s of sorted) {
    console.log(`${s.key.padEnd(28)} ${s.name.padEnd(30)} ${publicUrl(s.image_path)}`);
  }
}

function findKeyByName(signs, name) {
  return signs.find((s) => s.name === name)?.key ?? null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
