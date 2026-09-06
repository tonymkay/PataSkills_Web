/**
 * jsons/football.json is 5 concatenated JSON objects (one per set S1-S5,
 * 25 questions each), not one valid JSON document. This merges them into
 * the single {tracks, questions, signs} shape lib/curriculum.ts's
 * loadRemoteCurriculum() expects (see json-conversion.md), renumbering
 * `sequence` as one global 1-based counter across the merged file.
 * Mirrors scripts/convert-true-false-v2.mjs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(PROJECT_ROOT, 'jsons', 'football.json');
const OUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'output');
const OUT = path.join(OUT_DIR, 'football.converted.json');

const raw = readFileSync(SRC, 'utf8');

// Split on a newline immediately followed by a column-0 "{" (block boundary).
// Nested object braces are always indented, so this only matches top-level
// block starts.
const blocks = raw.split(/\n(?=\{)/).map(s => s.trim()).filter(Boolean);
console.log(`Found ${blocks.length} concatenated block(s) in ${path.basename(SRC)}`);

let tracks = null;
const questions = [];
const seenIds = new Set();
const topicIdCounts = new Map();

for (const [i, block] of blocks.entries()) {
  let parsed;
  try {
    parsed = JSON.parse(block);
  } catch (e) {
    console.error(`Block ${i + 1} failed to parse:`, e.message);
    process.exit(1);
  }
  if (!tracks) {
    // Source blocks carried over "All True/False" as the full-track title
    // (copy-paste leftover from the true-false template) — fix it up for
    // this skill.
    tracks = parsed.tracks.map(t =>
      t.id === 'full' ? { ...t, title: 'All Football' } : t
    );
  }
  for (const q of parsed.questions) {
    if (seenIds.has(q.id)) {
      console.error(`Duplicate question id across blocks: ${q.id}`);
      process.exit(1);
    }
    seenIds.add(q.id);
    topicIdCounts.set(q.topicId, (topicIdCounts.get(q.topicId) || 0) + 1);
    questions.push(q);
  }
}

// Global 1-based sequence across the merged file (json-conversion.md convention).
questions.forEach((q, i) => { q.sequence = i + 1; });

const output = { tracks, questions, signs: [] };

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, JSON.stringify(output, null, 2));

console.log(`Merged ${questions.length} questions, ${seenIds.size} unique ids, ${topicIdCounts.size} distinct topicIds`);
console.log(`Tracks header:`, JSON.stringify(tracks));
console.log(`Wrote ${OUT}`);
