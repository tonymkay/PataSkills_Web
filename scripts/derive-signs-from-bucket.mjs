/**
 * Step 1 (revised): the curriculum JSON's image fields are all null right
 * now (it's still questions.sample.json), so there's nothing to derive
 * names from there. Instead this derives the signs list straight from the
 * play-assets/signs/ folder (60 real files) — filename becomes the sign
 * name, cleaned up. Flags anything that looks like a placeholder name
 * (image1.webp, parkraw.webp, etc.) or a likely duplicate for manual
 * review before it goes into play_signs.
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/derive-signs-from-bucket.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BUCKET = 'play-assets';
const FOLDER = 'signs';

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

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

// filename -> best-guess display name
function nameFromFilename(filename) {
  const base = filename.replace(/\.webp$/i, '');
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const titled = cleaned.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return titled;
}

const PLACEHOLDER_PATTERNS = [/^image\d*$/i, /raw$/i, /^untitled/i];
function looksLikePlaceholder(filename) {
  const base = filename.replace(/\.webp$/i, '');
  return PLACEHOLDER_PATTERNS.some((p) => p.test(base.trim()));
}

async function main() {
  const { data: files, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;

  const imageFiles = (files || []).filter((f) => /\.(webp|png|jpe?g)$/i.test(f.name));
  console.log(`Found ${imageFiles.length} image files in ${BUCKET}/${FOLDER}/`);

  const signs = [];
  const flagged = [];
  const nameCount = new Map();

  for (const f of imageFiles) {
    const imagePath = `${FOLDER}/${f.name}`;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
    const name = nameFromFilename(f.name);
    const placeholder = looksLikePlaceholder(f.name);

    nameCount.set(name, (nameCount.get(name) || 0) + 1);

    const entry = { filename: f.name, imagePath, imageUrl: pub?.publicUrl ?? null, name, placeholder };
    signs.push(entry);
    if (placeholder) flagged.push({ ...entry, reason: 'placeholder-looking filename' });
  }

  // Flag duplicate names too (two different files that cleaned to the same name)
  for (const [name, count] of nameCount.entries()) {
    if (count > 1) {
      for (const s of signs) {
        if (s.name === name && !flagged.includes(s)) {
          flagged.push({ ...s, reason: `duplicate name (shared with ${count - 1} other file(s))` });
        }
      }
    }
  }

  const outDir = path.join(PROJECT_ROOT, 'scripts', 'output');
  mkdirSync(outDir, { recursive: true });

  const reviewPath = path.join(outDir, 'signs-derived.json');
  writeFileSync(
    reviewPath,
    JSON.stringify({ totalFiles: signs.length, flaggedCount: flagged.length, signs, flagged }, null, 2),
  );

  const sqlLines = [];
  sqlLines.push('-- Step 2: run this whole file in Supabase SQL Editor.');
  sqlLines.push('create table if not exists play_signs (');
  sqlLines.push('  id uuid primary key default gen_random_uuid(),');
  sqlLines.push('  image_path text not null unique,');
  sqlLines.push('  name text not null,');
  sqlLines.push('  created_at timestamptz not null default now()');
  sqlLines.push(');');
  sqlLines.push('');
  sqlLines.push('insert into play_signs (image_path, name) values');
  const values = signs.map(
    (s, i) =>
      `  ('${sqlEscape(s.imagePath)}', '${sqlEscape(s.name)}')${i === signs.length - 1 ? ';' : ','}`,
  );
  sqlLines.push(...values);
  sqlLines.push('');
  sqlLines.push('-- re-run safety net: change the insert above to end with');
  sqlLines.push('-- "on conflict (image_path) do nothing;" if re-running after edits.');

  const sqlPath = path.join(outDir, 'play_signs.sql');
  writeFileSync(sqlPath, sqlLines.join('\n'));

  console.log(`\nTotal signs: ${signs.length}`);
  console.log(`Flagged for manual review: ${flagged.length}`);
  if (flagged.length) {
    console.log('\nFlagged files:');
    for (const f of flagged) console.log(`  - ${f.filename} -> "${f.name}" (${f.reason})`);
  }
  console.log(`\nWrote:\n  ${reviewPath}\n  ${sqlPath}`);
  if (flagged.length) {
    console.log('\n⚠ Review signs-derived.json / the flagged list above before running the SQL.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
