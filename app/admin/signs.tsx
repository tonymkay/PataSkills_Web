import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Modal } from 'react-native';
import { supabase, getPlayAssetPublicUrl } from '@/lib/supabase';

interface SignQuestionItem {
  id: string;
  signDbId?: string; // play_signs.id if present
  signKey: string;
  expectedAnswer: string; // directly from q.answers[q.correctAnswer]
  image_path: string;
}

interface SignAssetOption {
  id: string;
  key: string;
  image_path: string;
}

function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\bsigns?\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function loadSignQuestions(): Promise<{
  items: SignQuestionItem[];
  allSignAssets: SignAssetOption[];
}> {
  const [{ data: curRow }, { data: pairRows }, { data: signRows }] = await Promise.all([
    supabase
      .from('play_curricula')
      .select('json_path')
      .eq('slug', 'driving-theory')
      .eq('is_active', true)
      .single(),
    supabase.from('play_sign_pairs').select('pair_id, key_a, key_b'),
    supabase.from('play_signs').select('id, key, name, image_path'),
  ]);

  const signs = signRows ?? [];

  // Build lookup maps
  const signByKey = new Map<string, { id: string; key: string; image_path: string; name?: string }>();
  for (const s of signs) {
    if (s.key) signByKey.set(s.key, s);
    if (s.image_path) signByKey.set(s.image_path, s);
  }

  const pairKeyByRef = new Map<string, { A: string; B: string }>();
  for (const p of pairRows ?? []) {
    pairKeyByRef.set(p.pair_id, { A: p.key_a, B: p.key_b });
  }

  // Fetch curriculum JSON (fallback to local if remote fails)
  let questions: any[] = [];
  try {
    if (curRow?.json_path) {
      const url = getPlayAssetPublicUrl(curRow.json_path);
      const res = await fetch(url);
      if (res.ok) {
        questions = await res.json();
      }
    }
  } catch {
    // fallback
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    try {
      const fallbackUrl = getPlayAssetPublicUrl('curricula/questions.linked.json');
      const res = await fetch(fallbackUrl);
      if (res.ok) questions = await res.json();
    } catch {
      // ignore
    }
  }

  // Group strictly by expectedAnswer from "What is this sign called?" questions
  // Formula: Strictly unique signs by q.answers[q.correctAnswer]
  const itemsByAnswer = new Map<string, SignQuestionItem>();

  for (const q of questions) {
    const questionText = (q.question || '').toLowerCase();
    if (!questionText.includes('this sign called')) continue;
    if (typeof q.correctAnswer !== 'number' || !Array.isArray(q.answers)) continue;

    const expectedAnswer = q.answers[q.correctAnswer];
    if (!expectedAnswer) continue;

    if (!itemsByAnswer.has(expectedAnswer)) {
      // 1. Try resolving key from question image
      let resolvedKey: string | null = typeof q.image === 'string' ? q.image : null;
      if (!resolvedKey && q.pairId && (q.signRef === 'A' || q.signRef === 'B')) {
        const refs = pairKeyByRef.get(q.pairId);
        resolvedKey = refs ? refs[q.signRef as 'A' | 'B'] : null;
      }

      let matchedSign = resolvedKey ? signByKey.get(resolvedKey) : null;

      // 2. If not matched, try matching by normalized name in signRows
      if (!matchedSign) {
        const normAnswer = normalize(expectedAnswer);
        matchedSign = signs.find((s) => s.name && normalize(s.name) === normAnswer) ?? null;
      }

      itemsByAnswer.set(expectedAnswer, {
        id: matchedSign?.id ?? `custom-${expectedAnswer}`,
        signDbId: matchedSign?.id,
        signKey: matchedSign?.key ?? normalize(expectedAnswer).replace(/\s+/g, '_'),
        expectedAnswer,
        image_path: matchedSign?.image_path ?? '',
      });
    }
  }

  const items = Array.from(itemsByAnswer.values()).sort((a, b) =>
    a.expectedAnswer.localeCompare(b.expectedAnswer)
  );

  return {
    items,
    allSignAssets: signs,
  };
}

export default function AdminSignsScreen() {
  const [items, setItems] = useState<SignQuestionItem[]>([]);
  const [availableAssets, setAvailableAssets] = useState<SignAssetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [swapTarget, setSwapTarget] = useState<SignQuestionItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: loadedItems, allSignAssets } = await loadSignQuestions();
      setItems(loadedItems);
      setAvailableAssets(allSignAssets);
    } catch (err: any) {
      setToast(`Error loading signs: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSwap(target: SignQuestionItem, replacement: SignAssetOption) {
    setSaving(true);
    let error: any = null;

    if (target.signDbId) {
      const res = await supabase
        .from('play_signs')
        .update({ image_path: replacement.image_path })
        .eq('id', target.signDbId);
      error = res.error;
    } else {
      const res = await supabase
        .from('play_signs')
        .upsert({
          key: target.signKey,
          name: target.expectedAnswer,
          image_path: replacement.image_path,
        });
      error = res.error;
    }

    setSaving(false);
    setSwapTarget(null);

    if (error) {
      setToast(`Swap failed: ${error.message}`);
    } else {
      setToast(`Updated image for "${target.expectedAnswer}"`);
      await load();
    }
    setTimeout(() => setToast(null), 4000);
  }

  async function handleUpload(target: SignQuestionItem) {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSaving(true);
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadPath = `signs/${Date.now()}_${cleanName}`;

        const { error: upErr } = await supabase.storage
          .from('play-assets')
          .upload(uploadPath, file, { contentType: file.type || 'image/webp', upsert: true });

        if (upErr) throw upErr;

        if (target.signDbId) {
          const { error: dbErr } = await supabase
            .from('play_signs')
            .update({ image_path: uploadPath })
            .eq('id', target.signDbId);
          if (dbErr) throw dbErr;
        } else {
          const { error: dbErr } = await supabase
            .from('play_signs')
            .upsert({
              key: target.signKey,
              name: target.expectedAnswer,
              image_path: uploadPath,
            });
          if (dbErr) throw dbErr;
        }

        setToast(`Uploaded & assigned image for "${target.expectedAnswer}"`);
        setSwapTarget(null);
        await load();
      } catch (err: any) {
        setToast(`Upload failed: ${err.message || 'Unknown error'}`);
      } finally {
        setSaving(false);
        setTimeout(() => setToast(null), 4000);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={{ color: '#fff', marginTop: 12, fontSize: 14 }}>Loading signs from curriculum…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      {/* Header */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#222' }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          Signs ({items.length})
        </Text>
        <Text style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
          Targeting "What is this sign called?" questions. Tap any sign to swap or upload its image.
        </Text>
      </View>

      {/* Notification Toast */}
      {toast && (
        <View style={{ backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{toast}</Text>
        </View>
      )}

      {/* Main Grid: Images + Expected Answers */}
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 }}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSwapTarget(item)}
            style={{
              width: 150,
              backgroundColor: '#1a1a1a',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}
          >
            <Image
              source={{ uri: getPlayAssetPublicUrl(item.image_path) }}
              style={{
                width: '100%',
                height: 95,
                borderRadius: 6,
                backgroundColor: '#000',
              }}
              resizeMode="contain"
            />
            <Text
              style={{
                color: '#fff',
                fontSize: 12,
                marginTop: 8,
                fontWeight: '600',
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {item.expectedAnswer}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Visual Image Swap Modal */}
      <Modal visible={!!swapTarget} transparent animationType="fade" onRequestClose={() => setSwapTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', padding: 16 }}>
          <View style={{ backgroundColor: '#181818', borderRadius: 12, flex: 1, padding: 16, borderWidth: 1, borderColor: '#333' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Replace image for:
                </Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                  {swapTarget?.expectedAnswer}
                </Text>
              </View>
              <Pressable
                onPress={() => setSwapTarget(null)}
                style={{ padding: 4, borderRadius: 6, backgroundColor: '#222' }}
              >
                <Text style={{ color: '#aaa', fontSize: 18, paddingHorizontal: 6 }}>✕</Text>
              </Pressable>
            </View>

            {/* Action Toolbar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ color: '#777', fontSize: 12 }}>
                Select a graphic below or upload a new one:
              </Text>
              <Pressable
                onPress={() => swapTarget && handleUpload(swapTarget)}
                style={{
                  backgroundColor: '#2563eb',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  ⬆ Upload from Computer
                </Text>
              </Pressable>
            </View>

            {saving ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={{ color: '#aaa', marginTop: 10 }}>Saving image swap…</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {availableAssets.map((asset) => (
                  <Pressable
                    key={asset.id}
                    onPress={() => swapTarget && handleSwap(swapTarget, asset)}
                    style={{
                      width: 96,
                      height: 80,
                      backgroundColor: '#0a0a0a',
                      borderRadius: 8,
                      padding: 6,
                      borderWidth: 1,
                      borderColor: '#2e2e2e',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      source={{ uri: getPlayAssetPublicUrl(asset.image_path) }}
                      style={{ width: '100%', height: '100%', borderRadius: 4 }}
                      resizeMode="contain"
                    />
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

