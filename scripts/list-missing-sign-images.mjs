/**
 * Task 1: Missing sign images (driving-theory)
 *
 * Replays the exact runtime hydration logic (resolvePairedSignImages in
 * lib/curriculum.ts + loadSignAssets/loadSignPairs/hydrateQuestion in
 * lib/signs.ts + utils/hydrateQuestions.ts) against the live DB/bucket,
 * and flags every question whose resolved image(s) end up empty.
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/list-missing-sign-images.mjs
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

const IMAGE_BACKED_FORMATS = new Set(['imageChoice', 'twoImageChoice', 'imageTextChoice', 'singleImageChoice']);

// Recursively list every file path actually present in the play-assets bucket
// (image_path rows can point into subfolders, so a flat one-level list()
// would miss real files and produce false "file not in bucket" reasons).
async function listAllBucketFiles(bucket, prefix = '') {
  const files = new Set();
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  for (const entry of data || []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Folders come back with id === null and no metadata; files have metadata.
    if (entry.id === null && !entry.metadata) {
      for (const f of await listAllBucketFiles(bucket, full)) files.add(f);
    } else {
      files.add(full);
    }
  }
  return files;
}

async function main() {
  // 1. Curriculum JSON
  const { data: curRow, error: curErr } = await supabase
    .from('play_curricula')
    .select('slug, title, cover_image_path, json_path')
    .eq('slug', 'driving-theory')
    .eq('is_active', true)
    .single();
  if (curErr) throw curErr;
  const { data: jsonPub } = supabase.storage.from('play-assets').getPublicUrl(curRow.json_path);
  const res = await fetch(jsonPub.publicUrl);
  if (!res.ok) throw new Error(`curriculum fetch failed: ${res.status}`);
  const body = await res.json();
  const questions = Array.isArray(body) ? body : body.questions;

  // 2. play_signs + play_sign_pairs
  const { data: signsRows, error: signsErr } = await supabase.from('play_signs').select('key, image_path');
  if (signsErr) throw signsErr;
  const { data: pairRows, error: pairErr } = await supabase.from('play_sign_pairs').select('pair_id, key_a, key_b');
  if (pairErr) throw pairErr;

  const signByKey = new Map(signsRows.map((s) => [s.key, s]));
  const pairById = new Map(pairRows.map((p) => [p.pair_id, p]));

  // 3. Real files in the bucket (catches DB row exists but file was never uploaded)
  const bucketFiles = await listAllBucketFiles('play-assets');

  // Resolve a sign key -> { path, existsInBucket } | reason string
  function resolveKey(key) {
    const sign = signByKey.get(key);
    if (!sign) return { reason: 2, detail: `sign key "${key}" has no row in play_signs` };
    if (!sign.image_path) return { reason: 3, detail: `play_signs.image_path is null/empty for key "${key}"` };
    if (!bucketFiles.has(sign.image_path)) {
      return { reason: 4, detail: `image_path "${sign.image_path}" set but file missing from play-assets bucket` };
    }
    return { ok: true };
  }

  const broken = [];

  for (const q of questions) {
    const expectsImage =
      IMAGE_BACKED_FORMATS.has(q.format) ||
      Boolean(q.pairId) ||
      Array.isArray(q.images) ||
      typeof q.image === 'string';
    if (!expectsImage) continue;

    const isTwoImage =
      q.format === 'twoImageChoice' || q.format === 'imageChoice' ||
      (Array.isArray(q.images) && q.images.length >= 2);

    // Case: has a pairId — mirrors resolvePairedSignImages + hydrateQuestion.
    if (q.pairId) {
      const pair = pairById.get(q.pairId);
      if (!pair) {
        broken.push({ ref: q.pairId, id: q.id, text: q.question, reason: 1,
          detail: `pairId "${q.pairId}" has no row in play_sign_pairs` });
        continue;
      }

      if (isTwoImage) {
        const rA = resolveKey(pair.key_a);
        const rB = resolveKey(pair.key_b);
        if (!rA.ok) broken.push({ ref: pair.key_a, id: q.id, text: q.question, reason: rA.reason, detail: rA.detail });
        if (!rB.ok) broken.push({ ref: pair.key_b, id: q.id, text: q.question, reason: rB.reason, detail: rB.detail });
        continue;
      }

      let neededKey = null;
      if (q.signRef === 'A') neededKey = pair.key_a;
      else if (q.signRef === 'B') neededKey = pair.key_b;
      else if (q.format === 'singleImageChoice' || q.format === 'imageTextChoice') {
        neededKey = q.correctAnswer === 1 ? pair.key_b : pair.key_a;
      }
      if (neededKey) {
        const r = resolveKey(neededKey);
        if (!r.ok) broken.push({ ref: neededKey, id: q.id, text: q.question, reason: r.reason, detail: r.detail });
      }
      continue;
    }

    // Case: no pairId — raw image field must itself be a sign key.
    if (typeof q.image === 'string' && q.image.length > 0) {
      if (/^https?:\/\//.test(q.image)) continue; // already a real URL, not a key
      const r = resolveKey(q.image);
      if (!r.ok) {
        const reason = r.reason === 2 ? 5 : r.reason;
        const detail = r.reason === 2
          ? `raw image field "${q.image}" is not a key in play_signs (no pairId/signRef)`
          : r.detail;
        broken.push({ ref: q.image, id: q.id, text: q.question, reason, detail });
      }
      continue;
    }

    // No pairId and no usable image field at all, but format/images marked it as image-backed.
    if (IMAGE_BACKED_FORMATS.has(q.format) || Array.isArray(q.images)) {
      broken.push({ ref: '(none)', id: q.id, text: q.question, reason: 5,
        detail: 'question has no pairId/signRef and no usable image field' });
    }
  }

  console.log(`${questions.length} questions checked, ${broken.length} broken image reference(s) found\n`);
  for (const b of broken) {
    console.log(`Image ${b.ref} missing — question ${b.id} ("${b.text}") — reason: ${b.reason} (${b.detail})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
