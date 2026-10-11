import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const env = {};
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL, env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY);

let sharp = null;
try { sharp = (await import('sharp')).default; } catch {}
console.log('sharp available:', !!sharp);

for (const slug of ['true-false', 'world-facts', 'football', 'business-studies', 'geography']) {
  const { data } = supabase.storage.from('play-assets').getPublicUrl(`curricula/${slug}.webp`);
  const res = await fetch(data.publicUrl);
  const buf = Buffer.from(await res.arrayBuffer());
  let meta = '';
  if (sharp) { const m = await sharp(buf).metadata(); meta = `${m.width}x${m.height} ${m.format} alpha=${m.hasAlpha}`; }
  console.log(slug, res.status, buf.length + ' bytes', res.headers.get('content-type'), res.headers.get('cache-control'), meta);
}
// Also show an existing JSON's top-level for comparison
const { data: j } = supabase.storage.from('play-assets').getPublicUrl('curricula/football.json');
const fj = await (await fetch(j.publicUrl)).json();
console.log('football keys:', Object.keys(fj), 'tracks:', JSON.stringify(fj.tracks), 'q0:', JSON.stringify(fj.questions[0]));
console.log('local images dir exists:', existsSync(path.join(ROOT, 'scripts', 'output')));
