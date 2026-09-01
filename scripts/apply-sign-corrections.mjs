/**
 * Step 3: applies the manual corrections in sign-corrections.json onto
 * questions.linked.json, overwriting the wrong/null sign keys.
 *
 * USAGE (PowerShell, from the play/ directory):
 *   node scripts/apply-sign-corrections.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'output');

const questions = JSON.parse(readFileSync(path.join(OUT_DIR, 'questions.linked.json'), 'utf8'));
const corrections = JSON.parse(readFileSync(path.join(OUT_DIR, 'sign-corrections.json'), 'utf8'));

let imageChoiceFixed = 0;
let imageTextFixed = 0;
let stillNull = 0;

const fixed = questions.map((q) => {
  const copy = { ...q };
  if (q.format === 'imageChoice' && q.pairId && Array.isArray(q.labels) && Array.isArray(q.images)) {
    copy.images = q.labels.map((ref, i) => {
      const pairRef = `${q.pairId}:${ref}`;
      if (corrections[pairRef]) {
        imageChoiceFixed++;
        return corrections[pairRef];
      }
      if (q.images[i] == null) stillNull++;
      return q.images[i];
    });
  } else if (q.format === 'imageTextChoice' && q.pairId && q.signRef) {
    const pairRef = `${q.pairId}:${q.signRef}`;
    if (corrections[pairRef]) {
      copy.image = corrections[pairRef];
      imageTextFixed++;
    } else if (q.image == null) {
      stillNull++;
    }
  }
  return copy;
});

writeFileSync(
  path.join(OUT_DIR, 'questions.corrected.json'),
  JSON.stringify(fixed, null, 2),
);

console.log(`Applied corrections: ${Object.keys(corrections).length} pairRefs in map`);
console.log(`imageChoice slots overwritten: ${imageChoiceFixed}`);
console.log(`imageTextChoice images overwritten: ${imageTextFixed}`);
console.log(`Still null after corrections: ${stillNull}`);
console.log(`Wrote scripts/output/questions.corrected.json`);
