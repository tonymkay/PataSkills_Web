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
const supabase = createClient(env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL, env.EXPO_PUBLIC_PATASKILLS_SUPABASE_ANON_KEY);

// Direct download (bypasses public CDN URL caching) to check the real stored bytes
const { data, error } = await supabase.storage.from('play-assets').download('curricula/world-facts.json');
if (error) { console.error('download error', error); process.exit(1); }
const text = await data.text();
const body = JSON.parse(text);
console.log('tracks (direct download):', JSON.stringify(body.tracks));

const { data: pub } = supabase.storage.from('play-assets').getPublicUrl('curricula/world-facts.json');
const res2 = await fetch(pub.publicUrl + '?cachebust=' + Date.now());
const body2 = await res2.json();
console.log('tracks (public url, cachebust):', JSON.stringify(body2.tracks));
console.log('cache-control header:', res2.headers.get('cache-control'));
