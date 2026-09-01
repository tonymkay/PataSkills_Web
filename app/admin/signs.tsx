import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Modal } from 'react-native';
import { supabase, getPlayAssetPublicUrl } from '@/lib/supabase';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { Upload, Download, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react-native';

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

function keyFromAnswer(answer: string): string {
  return normalize(answer).replace(/\s+/g, '_');
}

async function syncPairs(questions: any[], signKeyByAnswer: Map<string, string>) {
  const pairsMap = new Map<string, { key_a?: string; key_b?: string }>();
  for (const q of questions) {
    if (!q.pairId || !q.signRef) continue;
    const isSignQuestion =
      (q.question || '').toLowerCase().includes('this sign called') && Array.isArray(q.answers);
    if (!isSignQuestion) continue;
    const answer = q.answers[q.correctAnswer];
    const key = signKeyByAnswer.get(answer);
    if (!key) continue;

    if (!pairsMap.has(q.pairId)) pairsMap.set(q.pairId, {});
    const p = pairsMap.get(q.pairId)!;
    if (q.signRef === 'A') p.key_a = key;
    if (q.signRef === 'B') p.key_b = key;
  }

  const rowsToUpsert: { pair_id: string; key_a: string; key_b: string }[] = [];
  for (const [pair_id, pair] of pairsMap.entries()) {
    if (pair.key_a && pair.key_b) {
      rowsToUpsert.push({ pair_id, key_a: pair.key_a, key_b: pair.key_b });
    }
  }
  if (rowsToUpsert.length > 0) {
    await supabase.from('play_sign_pairs').upsert(rowsToUpsert, { onConflict: 'pair_id' });
  }
}

async function loadSignQuestions(): Promise<{
  items: SignQuestionItem[];
  allSignAssets: SignAssetOption[];
}> {
  const [{ data: curRow }, { data: signRows }] = await Promise.all([
    supabase
      .from('play_curricula')
      .select('json_path')
      .eq('slug', 'driving-theory')
      .eq('is_active', true)
      .single(),
    supabase.from('play_signs').select('id, key, name, image_path'),
  ]);

  const signs = signRows ?? [];

  // Build lookup maps
  const signByKey = new Map<string, { id: string; key: string; image_path: string; name?: string }>();
  for (const s of signs) {
    if (s.key) signByKey.set(s.key, s);
    if (s.name) signByKey.set(normalize(s.name), s);
  }

  // Fetch curriculum JSON
  let questions: any[] = [];
  try {
    if (curRow?.json_path) {
      const url = getPlayAssetPublicUrl(curRow.json_path);
      const res = await fetch(url);
      if (res.ok) questions = await res.json();
    }
  } catch {}

  if (!Array.isArray(questions) || questions.length === 0) {
    try {
      const fallbackUrl = getPlayAssetPublicUrl('curricula/questions.linked.json');
      const res = await fetch(fallbackUrl);
      if (res.ok) questions = await res.json();
    } catch {}
  }

  // Group strictly by expectedAnswer from "What is this sign called?" questions
  const itemsByAnswer = new Map<string, SignQuestionItem>();
  const signKeyByAnswer = new Map<string, string>();

  for (const q of questions) {
    const questionText = (q.question || '').toLowerCase();
    if (!questionText.includes('this sign called')) continue;
    if (typeof q.correctAnswer !== 'number' || !Array.isArray(q.answers)) continue;

    const expectedAnswer = q.answers[q.correctAnswer];
    if (!expectedAnswer) continue;

    const signKey = keyFromAnswer(expectedAnswer);
    signKeyByAnswer.set(expectedAnswer, signKey);

    if (!itemsByAnswer.has(expectedAnswer)) {
      const matchedSign = signByKey.get(signKey) || signByKey.get(normalize(expectedAnswer));

      itemsByAnswer.set(expectedAnswer, {
        id: matchedSign?.id ?? `custom-${signKey}`,
        signDbId: matchedSign?.id,
        signKey,
        expectedAnswer,
        image_path: matchedSign?.image_path ?? '',
      });
    }
  }

  // Automatically sync pairs to match questions
  void syncPairs(questions, signKeyByAnswer);

  const items = Array.from(itemsByAnswer.values()).sort((a, b) =>
    a.expectedAnswer.localeCompare(b.expectedAnswer)
  );

  return {
    items,
    allSignAssets: signs,
  };
}

export default function AdminSignsScreen() {
  const { colors } = useTheme();
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
      const res = await supabase.from('play_signs').upsert({
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
          const { error: dbErr } = await supabase.from('play_signs').upsert({
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

  const assignedCount = items.filter((i) => !!i.image_path).length;
  const missingCount = items.length - assignedCount;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.onSurface, marginTop: Spacing.sm, fontFamily: FontFamily.medium, fontSize: 14 }}>
          Loading signs from curriculum…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          padding: Spacing.gutter,
          borderBottomWidth: 1,
          borderColor: colors.surfaceContainerHigh,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: Spacing.sm,
        }}
      >
        <View>
          <Text style={{ fontFamily: FontFamily.bold, fontSize: 20, color: colors.onSurface }}>
            Road Signs Manager
          </Text>
          <Text style={{ fontFamily: FontFamily.regular, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 }}>
            {items.length} total signs required by curriculum •{' '}
            <Text style={{ color: StaticColors.successLime }}>{assignedCount} assigned</Text>
            {missingCount > 0 ? (
              <Text style={{ color: '#ef4444' }}> • {missingCount} missing</Text>
            ) : null}
          </Text>
        </View>

        <Pressable
          onPress={load}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 6,
            borderRadius: Radius.sm,
            backgroundColor: colors.surfaceContainer,
          }}
        >
          <RefreshCw size={14} color={colors.onSurface} />
          <Text style={{ fontFamily: FontFamily.medium, fontSize: 12, color: colors.onSurface }}>
            Refresh
          </Text>
        </Pressable>
      </View>

      {/* Toast */}
      {toast && (
        <View
          style={{
            padding: Spacing.sm,
            backgroundColor: colors.surfaceContainerHigh,
            borderBottomWidth: 1,
            borderColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.primary, fontFamily: FontFamily.semiBold, fontSize: 13, textAlign: 'center' }}>
            {toast}
          </Text>
        </View>
      )}

      {/* Signs Table / Grid */}
      <ScrollView contentContainerStyle={{ padding: Spacing.gutter, gap: Spacing.sm }}>
        {items.map((item, idx) => {
          const hasImage = !!item.image_path;
          const imageUrl = hasImage ? getPlayAssetPublicUrl(item.image_path) : null;

          return (
            <View
              key={item.signKey}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: Spacing.md,
                borderRadius: Radius.md,
                backgroundColor: colors.surfaceContainer,
                borderWidth: 1,
                borderColor: hasImage ? colors.surfaceContainerHigh : '#ef4444',
                gap: Spacing.md,
              }}
            >
              {/* Left: Index + Image thumbnail */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 }}>
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 12, color: colors.onSurfaceVariant, width: 24 }}>
                  {idx + 1}
                </Text>

                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: Radius.sm,
                    backgroundColor: colors.surfaceContainerHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  ) : (
                    <AlertCircle size={24} color="#ef4444" />
                  )}
                </View>

                {/* Center: Sign Title & Key */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FontFamily.bold, fontSize: 15, color: colors.onSurface }}>
                    {item.expectedAnswer}
                  </Text>
                  <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: colors.onSurfaceVariant }}>
                    Key: <Text style={{ fontFamily: FontFamily.medium }}>{item.signKey}</Text>
                  </Text>
                  {hasImage ? (
                    <Text style={{ fontFamily: FontFamily.regular, fontSize: 11, color: StaticColors.successLime, marginTop: 2 }}>
                      ✓ {item.image_path}
                    </Text>
                  ) : (
                    <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                      No image attached
                    </Text>
                  )}
                </View>
              </View>

              {/* Right: Actions */}
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                <Pressable
                  onPress={() => handleUpload(item)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 6,
                    borderRadius: Radius.sm,
                    backgroundColor: StaticColors.successLime,
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <Upload size={14} color="#000" />
                  <Text style={{ fontFamily: FontFamily.extraBold, fontSize: 12, color: '#000' }}>
                    {hasImage ? 'Replace' : 'Upload'}
                  </Text>
                </Pressable>

                {availableAssets.length > 0 && (
                  <Pressable
                    onPress={() => setSwapTarget(item)}
                    style={({ pressed }) => ({
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 6,
                      borderRadius: Radius.sm,
                      backgroundColor: colors.surfaceContainerHigh,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Text style={{ fontFamily: FontFamily.medium, fontSize: 12, color: colors.onSurface }}>
                      Pick Existing
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal to pick from existing signs */}
      <Modal visible={!!swapTarget} transparent animationType="fade" onRequestClose={() => setSwapTarget(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: Spacing.gutter,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '80%',
              backgroundColor: colors.surfaceContainer,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: colors.surfaceContainerHigh,
              padding: Spacing.gutter,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <Text style={{ fontFamily: FontFamily.bold, fontSize: 16, color: colors.onSurface }}>
                Pick Image for &quot;{swapTarget?.expectedAnswer}&quot;
              </Text>
              <Pressable onPress={() => setSwapTarget(null)}>
                <X size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {availableAssets.map((asset) => (
                <Pressable
                  key={asset.id}
                  onPress={() => swapTarget && handleSwap(swapTarget, asset)}
                  style={({ pressed }) => ({
                    width: 100,
                    alignItems: 'center',
                    padding: Spacing.xs,
                    borderRadius: Radius.sm,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.surfaceContainerHigh,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Image
                    source={{ uri: getPlayAssetPublicUrl(asset.image_path) }}
                    style={{ width: 64, height: 64 }}
                    resizeMode="contain"
                  />
                  <Text
                    numberOfLines={2}
                    style={{ fontFamily: FontFamily.regular, fontSize: 10, color: colors.onSurface, textAlign: 'center', marginTop: 4 }}
                  >
                    {asset.key}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
