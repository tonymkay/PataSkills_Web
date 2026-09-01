import { supabase } from './supabase';

export interface SignPair {
  keyA: string;
  keyB: string;
  urlA: string;
  urlB: string;
}

/**
 * Fetches every play_signs row and resolves each to its public storage URL.
 * Returns map of sign key -> storage public URL.
 */
export async function loadSignAssets(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('play_signs').select('key, image_path');
  if (error) throw error;

  const assets: Record<string, string> = {};
  for (const row of (data || []) as { key: string; image_path: string }[]) {
    if (!row.image_path) continue;
    const { data: pub } = supabase.storage.from('play-assets').getPublicUrl(row.image_path);
    if (pub?.publicUrl) {
      assets[row.key] = pub.publicUrl;
    }
  }
  return assets;
}

/**
 * Fetches play_sign_pairs rows and resolves them against the asset map.
 * Gracefully resolves available images without crashing if some signs are still being uploaded.
 */
export async function loadSignPairs(assets: Record<string, string>): Promise<Record<string, SignPair>> {
  const { data, error } = await supabase.from('play_sign_pairs').select('pair_id, key_a, key_b');
  if (error) throw error;

  const pairs: Record<string, SignPair> = {};
  for (const row of (data || []) as { pair_id: string; key_a: string; key_b: string }[]) {
    const urlA = assets[row.key_a] || '';
    const urlB = assets[row.key_b] || '';
    pairs[row.pair_id] = { keyA: row.key_a, keyB: row.key_b, urlA, urlB };
  }
  return pairs;
}
