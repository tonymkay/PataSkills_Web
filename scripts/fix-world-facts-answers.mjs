/**
 * Re-converts the True/False trivia source into world-facts.json, fixing a
 * bug in whatever produced the currently-uploaded file: `answers` was
 * written as options[].text.join(' ') (one flattened string) instead of
 * a JSON array, which types/quiz.ts's TextChoiceQuestion.answers: string[]
 * can't consume. See json-conversion.md for the field-mapping spec this
 * follows (same rules: textChoice format, 0-indexed correctAnswer,
 * multi-select questions excluded -- no app support for them).
 *
 * Usage: node scripts/fix-world-facts-answers.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'output');
mkdirSync(OUT_DIR, { recursive: true });

// Source content export -- same file json-conversion.md describes.
const SOURCE_PATH = 'C:\\Users\\LENOVO\\Desktop\\True_False_Trivia_1.0.0.json';

function loadEnv() {
  const out = {};
  for (const line of readFileSync(path.join(PROJECT_ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));

const questions = [];
let sequence = 0;
let excludedMulti = 0;

for (const level of source.levels) {
  for (const chapter of level.chapters) {
    for (const topic of chapter.topics) {
      for (const q of topic.questions) {
        if (q.type !== 'single') {
          excludedMulti += 1;
          continue;
        }
        const correctIndex = q.options.findIndex((o) => o.correct === true);
        sequence += 1;
        questions.push({
          id: q.id,
          format: 'textChoice',
          question: q.question,
          answers: q.options.map((o) => o.text), // the actual fix: array, not joined string
          correctAnswer: correctIndex,
          explanation: q.explanation ?? '',
          section: chapter.title,
          sequence,
        });
      }
    }
  }
}

console.log(`Converted ${questions.length} single-answer questions (excluded ${excludedMulti} multi-select).`);

const output = { questions, signs: [] };
const outPath = path.join(OUT_DIR, 'world-facts.corrected.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);

const env = loadEnv();
const supabase = createClient(env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL, env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY);

const uploadPath = 'curricula/world-facts.json';
const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, JSON.stringify(output), { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath}`);

const { data: row, error: rowErr } = await supabase
  .from('play_curricula')
  .select('slug, json_path, is_active')
  .eq('slug', 'world-facts')
  .single();
if (rowErr) throw rowErr;
console.log('play_curricula row (unchanged, confirmed pointing at same path):', row);

