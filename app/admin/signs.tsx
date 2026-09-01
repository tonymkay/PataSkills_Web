import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Modal } from 'react-native';
import { supabase, getPlayAssetPublicUrl } from '@/lib/supabase';

interface SignRow {
  id: string;
  key: string;
  name: string;
  image_path: string;
}

// Derives a human-meaning label per sign key from the curriculum's own
// "What is this sign called?" answer text — NOT the filename. Falls back
// to play_signs.name (filename-derived) only if no question uses it.
async function deriveMeaningsByKey(): Promise<Map<string, string[]>> {
  const [{ data: curRow }, { data: pairRows }] = await Promise.all([
    supabase
      .from('play_curricula')
      .select('json_path')
      .eq('slug', 'driving-theory')
      .eq('is_active', true)
      .single(),
    supabase.from('play_sign_pairs').select('pair_id, key_a, key_b'),
  ]);
  if (!curRow) return new Map();

  // pairId -> { A: key_a, B: key_b }, so signRef-based questions can be
  // resolved to an actual play_signs.key even when q.image is null.
  const pairKeyByRef = new Map<string, { A: string; B: string }>();
  for (const p of pairRows ?? []) {
    pairKeyByRef.set(p.pair_id, { A: p.key_a, B: p.key_b });
  }

  const url = getPlayAssetPublicUrl(curRow.json_path);
  const res = await fetch(url);
  const questions = await res.json();

  const byKey = new Map<string, string[]>();
  for (const q of questions) {
    const label = (q.question || '').toLowerCase();
    if (!label.includes('this sign called')) continue;
    if (typeof q.correctAnswer !== 'number' || !Array.isArray(q.answers)) continue;
    const meaning = q.answers[q.correctAnswer];

    // Resolve the sign key: prefer a direct q.image string (older format),
    // otherwise resolve pairId + signRef ('A'/'B') via play_sign_pairs.
    let key: string | null = typeof q.image === 'string' ? q.image : null;
    if (!key && q.pairId && (q.signRef === 'A' || q.signRef === 'B')) {
      const refs = pairKeyByRef.get(q.pairId);
      key = refs ? refs[q.signRef as 'A' | 'B'] : null;
    }

    if (!meaning || !key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(meaning);
  }
  return byKey;
}

function pickMeaning(names: string[] | undefined, fallback: string): string {
  if (!names || names.length === 0) return fallback;
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export default function AdminSignsScreen() {
  const [signs, setSigns] = useState<SignRow[]>([]);
  const [meanings, setMeanings] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [swapTarget, setSwapTarget] = useState<SignRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: signRows }, meaningsByKey] = await Promise.all([
      supabase.from('play_signs').select('id, key, name, image_path').order('name'),
      deriveMeaningsByKey(),
    ]);
    setSigns(signRows ?? []);
    setMeanings(meaningsByKey);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSwap(target: SignRow, replacement: SignRow) {
    setSaving(true);
    const { error } = await supabase
      .from('play_signs')
      .update({ image_path: replacement.image_path })
      .eq('id', target.id);
    setSaving(false);
    setSwapTarget(null);
    if (error) {
      setToast(`Swap failed: ${error.message}`);
    } else {
      setToast(`Updated "${target.name}" to use ${replacement.image_path}`);
      await load();
    }
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: '#fff', marginTop: 8 }}>Loading signs…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#333' }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Signs ({signs.length})</Text>
        <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
          Tap a sign to swap its image. Changes apply everywhere instantly.
        </Text>
      </View>

      {toast && (
        <View style={{ backgroundColor: '#1d4ed8', padding: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>{toast}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 }}>
        {signs.map((sign) => {
          const meaning = pickMeaning(meanings.get(sign.key), sign.name);
          return (
            <Pressable
              key={sign.id}
              onPress={() => setSwapTarget(sign)}
              style={{ width: 140, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#333' }}
            >
              <Image
                source={{ uri: getPlayAssetPublicUrl(sign.image_path) }}
                style={{ width: '100%', height: 90, borderRadius: 6, backgroundColor: '#000' }}
                resizeMode="contain"
              />
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 6, fontWeight: '600' }} numberOfLines={2}>
                {meaning}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={!!swapTarget} transparent animationType="fade" onRequestClose={() => setSwapTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', padding: 16 }}>
          <View style={{ backgroundColor: '#1a1a1a', borderRadius: 12, flex: 1, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                Replace image for "{swapTarget ? pickMeaning(meanings.get(swapTarget.key), swapTarget.name) : ''}"
              </Text>
              <Pressable onPress={() => setSwapTarget(null)}>
                <Text style={{ color: '#999', fontSize: 20 }}>✕</Text>
              </Pressable>
            </View>
            <Text style={{ color: '#777', fontSize: 12, marginBottom: 12 }}>
              Pick the correct image below. This updates the sign everywhere it's used.
            </Text>
            {saving ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {signs.map((candidate) => (
                  <Pressable
                    key={candidate.id}
                    onPress={() => swapTarget && handleSwap(swapTarget, candidate)}
                    style={{ width: 100, backgroundColor: '#000', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: '#333' }}
                  >
                    <Image
                      source={{ uri: getPlayAssetPublicUrl(candidate.image_path) }}
                      style={{ width: '100%', height: 60, borderRadius: 4 }}
                      resizeMode="contain"
                    />
                    <Text style={{ color: '#999', fontSize: 9, marginTop: 4 }} numberOfLines={2}>
                      {pickMeaning(meanings.get(candidate.key), candidate.name)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
