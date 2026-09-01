/**
 * Downloads preview images using the ACTUAL image_path column from
 * play_signs — never a filename guessed from the key/name.
 *
 * USAGE: node scripts/dl-by-image-path.mjs key1 key2 key3 ...
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PREVIEW_DIR = path.join(PROJECT_ROOT, 'scripts', 'output', 'preview2');

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

const keys = process.argv.slice(2);

async function main() {
  mkdirSync(PREVIEW_DIR, { recursive: true });
  const { data: signs, error } = await supabase
    .from('play_signs')
    .select('key, name, image_path')
    .in('key', keys);
  if (error) throw error;

  for (const s of signs) {
    const url = supabase.storage.from('play-assets').getPublicUrl(s.image_path).data.publicUrl;
    console.log(`${s.key} -> image_path="${s.image_path}" -> ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  FAILED (${res.status})`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(PREVIEW_DIR, `${s.key}.webp`);
    writeFileSync(outPath, buf);
    console.log(`  saved -> ${outPath}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
