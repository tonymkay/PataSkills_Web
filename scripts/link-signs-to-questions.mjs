/**
 * Steps 1-3: builds the question -> sign linkage that doesn't exist yet.
 *
 * Step 1: linking key = play_signs.key (stable slug), not a URL.
 * Step 2: derives each pairId+signRef -> sign name from the "What is this
 *         sign called?" question's correct answer text, then fuzzy-matches
 *         that name against play_signs.name to find the play_signs.key.
 * Step 3: writes a migrated curriculum JSON where every imageChoice pair's
 *         images[] and every imageTextChoice's image are replaced with
 *         sign_id references (play_signs.key), plus a mapping report
 *         flagging anything that didn't match confidently for manual review.
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/link-signs-to-questions.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
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

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/\bsigns?\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Levenshtein-ish word overlap score: fraction of normalized-name words
// found in the candidate, plus exact-match bonus. Good enough for ~60
// short sign names.
function score(a, b) {
  if (a === b) return 1;
  const aw = new Set(a.split(' ').filter(Boolean));
  const bw = new Set(b.split(' ').filter(Boolean));
  if (aw.size === 0 || bw.size === 0) return 0;
  let overlap = 0;
  for (const w of aw) if (bw.has(w)) overlap++;
  return overlap / Math.max(aw.size, bw.size);
}

function bestMatch(name, signs) {
  const n = normalize(name);
  let best = null;
  let bestScore = 0;
  for (const s of signs) {
    const sc = score(n, normalize(s.name));
    if (sc > bestScore) {
      bestScore = sc;
      best = s;
    }
  }
  return { sign: best, confidence: bestScore };
}

async function main() {
  const { data: signs, error: signsErr } = await supabase
    .from('play_signs')
    .select('id, key, name, image_path');
  if (signsErr) throw signsErr;
  console.log(`Loaded ${signs.length} play_signs rows`);

  const { data: curRow, error: curErr } = await supabase
    .from('play_curricula')
    .select('slug, json_path')
    .eq('slug', 'driving-theory')
    .eq('is_active', true)
    .single();
  if (curErr) throw curErr;

  const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(curRow.json_path);
  const res = await fetch(pub.publicUrl);
  const questions = await res.json();
  console.log(`Loaded ${questions.length} questions from ${curRow.json_path}`);

  // pairId+signRef -> derived name from "What is this sign called?" answers
  const nameByPairRef = new Map();
  for (const q of questions) {
    if (!q.pairId || !q.signRef) continue;
    const label = (q.question || '').toLowerCase();
    if (!label.includes('this sign called')) continue;
    if (typeof q.correctAnswer !== 'number' || !Array.isArray(q.answers)) continue;
    const name = q.answers[q.correctAnswer];
    if (name) nameByPairRef.set(`${q.pairId}:${q.signRef}`, name);
  }
  console.log(`Derived ${nameByPairRef.size} pairId:signRef -> name entries`);

  // Match each derived name to a play_signs row.
  const CONFIDENCE_THRESHOLD = 0.5;
  const mapping = new Map(); // "pairId:signRef" -> { key, name, confidence, derivedName }
  const lowConfidence = [];

  for (const [pairRef, derivedName] of nameByPairRef.entries()) {
    const { sign, confidence } = bestMatch(derivedName, signs);
    mapping.set(pairRef, {
      key: sign?.key ?? null,
      matchedSignName: sign?.name ?? null,
      derivedName,
      confidence,
    });
    if (!sign || confidence < CONFIDENCE_THRESHOLD) {
      lowConfidence.push({ pairRef, derivedName, matchedSignName: sign?.name ?? null, confidence });
    }
  }

  console.log(`Matched: ${mapping.size - lowConfidence.length} confident, ${lowConfidence.length} low-confidence/unmatched`);

  // Rewrite: for each imageChoice question, set images[0]/[1] to the
  // matched sign_id (key) for signRef A/B of that pairId. For each
  // imageTextChoice question (which is itself a signRef'd question),
  // set image to its own matched sign_id.
  let imagePairsFilled = 0;
  let singleImagesFilled = 0;
  let skippedNoMatch = 0;

  const migrated = questions.map((q) => {
    const copy = { ...q };
    if (q.format === 'imageChoice' && q.pairId && Array.isArray(q.labels)) {
      copy.images = q.labels.map((ref) => {
        const m = mapping.get(`${q.pairId}:${ref}`);
        if (m?.key) {
          imagePairsFilled++;
          return m.key; // sign_id reference (play_signs.key)
        }
        skippedNoMatch++;
        return null;
      });
    } else if (q.format === 'imageTextChoice' && q.pairId && q.signRef) {
      const m = mapping.get(`${q.pairId}:${q.signRef}`);
      if (m?.key) {
        copy.image = m.key;
        singleImagesFilled++;
      } else {
        skippedNoMatch++;
      }
    }
    return copy;
  });

  console.log(`\nFilled ${imagePairsFilled} imageChoice slots, ${singleImagesFilled} imageTextChoice images`);
  console.log(`Skipped (no confident match): ${skippedNoMatch}`);

  const outDir = path.join(PROJECT_ROOT, 'scripts', 'output');
  mkdirSync(outDir, { recursive: true });

  const mappingPath = path.join(outDir, 'sign-mapping-report.json');
  writeFileSync(
    mappingPath,
    JSON.stringify(
      {
        totalPairRefs: mapping.size,
        confidentCount: mapping.size - lowConfidence.length,
        lowConfidenceCount: lowConfidence.length,
        mapping: Object.fromEntries(mapping),
        lowConfidence,
      },
      null,
      2,
    ),
  );

  const migratedPath = path.join(outDir, 'questions.linked.json');
  writeFileSync(migratedPath, JSON.stringify(migrated, null, 2));

  console.log(`\nWrote:\n  ${mappingPath}\n  ${migratedPath}`);
  if (lowConfidence.length) {
    console.log(`\n⚠ ${lowConfidence.length} sign(s) need manual review before uploading — see sign-mapping-report.json "lowConfidence".`);
    for (const l of lowConfidence) {
      console.log(`  - ${l.pairRef}: "${l.derivedName}" -> best guess "${l.matchedSignName}" (confidence ${l.confidence.toFixed(2)})`);
    }
  } else {
    console.log('\n✅ All sign refs matched confidently. Review questions.linked.json, then upload to replace curricula/questions.sample.json (or a new path) in Supabase Storage.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
