/**
 * Step 1: reads the live driving-theory curriculum JSON from Supabase and
 * derives a deduped list of every unique sign image + its name, by pulling
 * the answer to each "What is this sign called?" question.
 *
 * Read-only: only needs the anon key already in .env. Writes two files to
 * scripts/output/:
 *   - signs-derived.json   review this first — flags conflicts/gaps
 *   - play_signs.sql       CREATE TABLE + INSERT, paste into Supabase
 *                           SQL Editor for step 2 (no service-role key
 *                           needed — that's Editor-only, run by hand)
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/derive-signs.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Minimal .env parser (no dotenv dependency needed for a one-off script).
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY;
const DEFAULT_SLUG = 'driving-theory';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_PATASKILLS_SUPABASE_URL / _ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

async function main() {
  const { data: row, error } = await supabase
    .from('play_curricula')
    .select('slug, title, json_path')
    .eq('slug', DEFAULT_SLUG)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  if (!row) throw new Error(`no active play_curricula row for slug "${DEFAULT_SLUG}"`);

  const { data: jsonPub } = supabase.storage.from('play-assets').getPublicUrl(row.json_path);
  if (!jsonPub?.publicUrl) throw new Error('could not resolve json_path public URL');

  console.log(`Fetching curriculum JSON from ${jsonPub.publicUrl}`);
  const res = await fetch(jsonPub.publicUrl);
  if (!res.ok) throw new Error(`curriculum fetch failed: ${res.status}`);
  const questions = await res.json();
  console.log(`Loaded ${questions.length} questions`);

  // Group questions by pairId so we can resolve each signRef ('A'/'B') to
  // both an image URL and a name within the same pair.
  const byPair = new Map();
  for (const q of questions) {
    if (!q.pairId) continue;
    if (!byPair.has(q.pairId)) byPair.set(q.pairId, []);
    byPair.get(q.pairId).push(q);
  }

  // key: imageUrl -> { imageUrl, names: Set, pairs: [{pairId, signRef}], questionIds: [] }
  const byImage = new Map();
  const unresolved = []; // signRef questions we couldn't find an image or a name for

  for (const [pairId, group] of byPair.entries()) {
    const pairImageQ = group.find(
      (q) => q.format === 'imageChoice' || q.format === 'twoImageChoice',
    );
    const pairImages = Array.isArray(pairImageQ?.images) ? pairImageQ.images : [null, null];

    for (const q of group) {
      if (!q.signRef && !q.image) continue; // not a single-sign question
      const label = (q.question || '').toLowerCase();
      const isNameQuestion = label.includes('what is this sign called');

      const imageUrl =
        q.image ??
        (q.signRef === 'A' ? pairImages[0] : q.signRef === 'B' ? pairImages[1] : null);

      if (!imageUrl) {
        unresolved.push({ id: q.id, pairId, signRef: q.signRef, reason: 'no image URL resolved' });
        continue;
      }

      if (!byImage.has(imageUrl)) {
        byImage.set(imageUrl, { imageUrl, names: new Set(), pairs: [], questionIds: [] });
      }
      const entry = byImage.get(imageUrl);
      entry.pairs.push({ pairId, signRef: q.signRef ?? null });
      entry.questionIds.push(q.id);

      if (isNameQuestion && typeof q.correctAnswer === 'number' && Array.isArray(q.answers)) {
        const name = q.answers[q.correctAnswer];
        if (name) entry.names.add(name);
      }
    }
  }

  const signs = [];
  const conflicts = [];
  const missingNames = [];

  for (const entry of byImage.values()) {
    const names = [...entry.names];
    if (names.length === 0) {
      missingNames.push(entry);
      continue;
    }
    if (names.length > 1) {
      conflicts.push({ ...entry, names });
    }
    signs.push({
      imageUrl: entry.imageUrl,
      name: names[0], // first-seen name; conflicts are also listed separately for review
      allNames: names,
      usedByPairs: entry.pairs,
      usedByQuestionIds: entry.questionIds,
    });
  }

  const outDir = path.join(PROJECT_ROOT, 'scripts', 'output');
  mkdirSync(outDir, { recursive: true });

  const reviewPath = path.join(outDir, 'signs-derived.json');
  writeFileSync(
    reviewPath,
    JSON.stringify(
      {
        totalUniqueImages: signs.length,
        conflictCount: conflicts.length,
        missingNameCount: missingNames.length,
        signs,
        conflicts,
        missingNames,
        unresolved,
      },
      null,
      2,
    ),
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
      `  ('${sqlEscape(s.imageUrl)}', '${sqlEscape(s.name)}')${i === signs.length - 1 ? ';' : ','}`,
  );
  sqlLines.push(...values);
  sqlLines.push('');
  sqlLines.push('-- on conflict (image_path) do nothing safety net if re-running:');
  sqlLines.push('-- change the insert above to: insert into play_signs (image_path, name) values (...) on conflict (image_path) do nothing;');

  const sqlPath = path.join(outDir, 'play_signs.sql');
  writeFileSync(sqlPath, sqlLines.join('\n'));

  console.log(`\nUnique signs found: ${signs.length}`);
  console.log(`Conflicts (same image, different names — needs manual review): ${conflicts.length}`);
  console.log(`Missing names (image with no "What is this sign called?" answer found): ${missingNames.length}`);
  console.log(`Unresolved signRefs (no image found at all): ${unresolved.length}`);
  console.log(`\nWrote:\n  ${reviewPath}\n  ${sqlPath}`);
  if (conflicts.length || missingNames.length || unresolved.length) {
    console.log('\n⚠ Review signs-derived.json before running the SQL — some entries need a manual name/image fix.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
