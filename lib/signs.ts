import { supabase } from './supabase';

export interface SignPair {
  keyA: string;
  keyB: string;
  urlA: string;
  urlB: string;
}

/**
 * Fetches every play_signs row and resolves each to its public storage URL.
 * DB-only: no cache, no local fallback. Throws on any failure — the caller
 * is responsible for surfacing that as a failed download step.
 */
export async function loadSignAssets(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('play_signs').select('key, image_path');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('play_signs returned no rows');

  const assets: Record<string, string> = {};
  for (const row of data as { key: string; image_path: string }[]) {
    const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(row.image_path);
    if (!pub?.publicUrl) throw new Error(`could not resolve public URL for sign key "${row.key}"`);
    assets[row.key] = pub.publicUrl;
  }
  return assets;
}

/**
 * Fetches every play_sign_pairs row and resolves each pair's A/B keys
 * against the given asset map (from loadSignAssets). DB-only: no cache,
 * no local fallback. Throws if a pair references a key missing from
 * `assets` — that's a data-integrity error, not something to paper over.
 */
export async function loadSignPairs(assets: Record<string, string>): Promise<Record<string, SignPair>> {
  const { data, error } = await supabase.from('play_sign_pairs').select('pair_id, key_a, key_b');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('play_sign_pairs returned no rows');

  const pairs: Record<string, SignPair> = {};
  for (const row of data as { pair_id: string; key_a: string; key_b: string }[]) {
    const urlA = assets[row.key_a];
    const urlB = assets[row.key_b];
    if (!urlA) throw new Error(`sign pair "${row.pair_id}" references unknown key_a "${row.key_a}"`);
    if (!urlB) throw new Error(`sign pair "${row.pair_id}" references unknown key_b "${row.key_b}"`);
    pairs[row.pair_id] = { keyA: row.key_a, keyB: row.key_b, urlA, urlB };
  }
  return pairs;
}
