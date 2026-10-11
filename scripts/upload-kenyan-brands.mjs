import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'output');

function loadEnv() {
  const out = {};
  for (const line of readFileSync(path.join(PROJECT_ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const env = loadEnv();
const supabase = createClient(env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL, env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY);

const json = readFileSync(path.join(OUT_DIR, 'kenyan-brands.json'), 'utf8');
const data = JSON.parse(json);

const ids = new Set();
for (const q of data.questions) {
  if (ids.has(q.id)) throw new Error(`duplicate id ${q.id}`);
  ids.add(q.id);
  if (q.format !== 'textChoice') throw new Error(`bad format ${q.id}`);
  if (!Array.isArray(q.answers) || q.answers.length < 2) throw new Error(`bad answers ${q.id}`);
  if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.answers.length) {
    throw new Error(`bad correctAnswer ${q.id}`);
  }
}

const uploadPath = 'curricula/kenyan-brands.json';
const { error: upErr } = await supabase.storage
  .from('play-assets')
  .upload(uploadPath, json, { contentType: 'application/json', upsert: true });
if (upErr) throw upErr;
console.log(`Uploaded to play-assets/${uploadPath} (${data.questions.length} questions)`);
