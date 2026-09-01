import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, Modal } from 'react-native';
import { supabase, getPlayAssetPublicUrl } from '@/lib/supabase';
import { useTheme, Spacing, Radius, FontFamily } from '@/theme/tokens';
import { Upload, Download, X } from 'lucide-react-native';

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

  async function loadJSZip(): Promise<any> {
    if (typeof window === 'undefined') throw new Error('Not in browser');
    if ((window as any).JSZip) return (window as any).JSZip;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => resolve((window as any).JSZip);
      script.onerror = () => reject(new Error('Failed to load zip library'));
      document.head.appendChild(script);
    });
  }

  async function handleDownloadAll() {
    if (typeof window === 'undefined') return;
    setSaving(true);
    setToast('Preparing zip file with all named sign images…');
    try {
      const JSZip = await loadJSZip();
      const zip = new JSZip();
      let added = 0;

      for (const item of items) {
        if (!item.image_path) continue;
        const url = getPlayAssetPublicUrl(item.image_path);
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          const ext = item.image_path.split('.').pop() || 'webp';
          const safeName = `${item.expectedAnswer.replace(/[/\\?%*:|"<>]/g, '_')}.${ext}`;
          zip.file(safeName, blob);
          added++;
        } catch (e) {
          console.warn(`Failed to bundle image for ${item.expectedAnswer}`, e);
        }
      }

      if (added === 0) {
        throw new Error('No images available to zip');
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `driving_theory_signs_named_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      setToast(`Successfully downloaded ${added} sign images in ZIP!`);
    } catch (err: any) {
      setToast(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

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
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={{ color: colors.onSurface, fontSize: 22, fontFamily: FontFamily.bold }}>
            Signs ({items.length})
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 2, fontFamily: FontFamily.regular }}>
            Targeting "What is this sign called?" questions. Tap any sign to swap or upload.
          </Text>
        </View>

        <Pressable
          onPress={handleDownloadAll}
          style={{
            backgroundColor: colors.surfaceContainerHigh,
            borderWidth: 1,
            borderColor: colors.outlineVariant,
            paddingHorizontal: Spacing.gutter,
            paddingVertical: 10,
            borderRadius: Radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.base,
          }}
        >
          <Download size={17} color={colors.actionBlue} />
          <Text style={{ color: colors.actionBlue, fontSize: 13, fontFamily: FontFamily.semiBold }}>
            Download All (ZIP)
          </Text>
        </Pressable>
      </View>

      {/* Notification Toast */}
      {toast && (
        <View
          style={{
            backgroundColor: colors.primary,
            paddingVertical: Spacing.base,
            paddingHorizontal: Spacing.gutter,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 13, fontFamily: FontFamily.medium }}>
            {toast}
          </Text>
        </View>
      )}

      {/* Main Grid: Images + Expected Answers */}
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, gap: Spacing.sm }}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSwapTarget(item)}
            style={{
              width: 154,
              backgroundColor: colors.surfaceContainer,
              borderRadius: Radius.md,
              padding: Spacing.sm,
              borderWidth: 1,
              borderColor: colors.surfaceContainerHigh,
            }}
          >
            <Image
              source={{ uri: getPlayAssetPublicUrl(item.image_path) }}
              style={{
                width: '100%',
                height: 96,
                borderRadius: Radius.default,
                backgroundColor: colors.black,
              }}
              resizeMode="contain"
            />
            <Text
              style={{
                color: colors.onSurface,
                fontSize: 12,
                marginTop: Spacing.base,
                fontFamily: FontFamily.semiBold,
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', padding: Spacing.gutter }}>
          <View
            style={{
              backgroundColor: colors.surfaceContainer,
              borderRadius: Radius.lg,
              flex: 1,
              padding: Spacing.gutter,
              borderWidth: 1,
              borderColor: colors.surfaceContainerHigh,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.gutter }}>
              <View style={{ flex: 1, paddingRight: Spacing.gutter }}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 11, fontFamily: FontFamily.medium, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Replace image for:
                </Text>
                <Text style={{ color: colors.onSurface, fontSize: 17, fontFamily: FontFamily.bold, marginTop: 2 }}>
                  {swapTarget?.expectedAnswer}
                </Text>
              </View>
              <Pressable
                onPress={() => setSwapTarget(null)}
                style={{
                  padding: Spacing.xs,
                  borderRadius: Radius.sm,
                  backgroundColor: colors.surfaceContainerHigh,
                }}
              >
                <X size={20} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {/* Action Toolbar */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: Spacing.gutter,
                flexWrap: 'wrap',
                gap: Spacing.base,
              }}
            >
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, fontFamily: FontFamily.regular }}>
                Pick a sign graphic or upload a new one:
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.base, alignItems: 'center' }}>
                <Pressable
                  onPress={handleDownloadAll}
                  style={{
                    backgroundColor: colors.surfaceContainerHigh,
                    borderWidth: 1,
                    borderColor: colors.outlineVariant,
                    paddingHorizontal: Spacing.gutter,
                    paddingVertical: Spacing.base,
                    borderRadius: Radius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Download size={15} color={colors.actionBlue} />
                  <Text style={{ color: colors.actionBlue, fontSize: 12, fontFamily: FontFamily.semiBold }}>
                    ZIP
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => swapTarget && handleUpload(swapTarget)}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: Spacing.gutter,
                    paddingVertical: Spacing.base,
                    borderRadius: Radius.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Upload size={15} color={colors.onPrimary} />
                  <Text style={{ color: colors.onPrimary, fontSize: 12, fontFamily: FontFamily.bold }}>
                    Upload from Computer
                  </Text>
                </Pressable>
              </View>
            </View>

            {saving ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{ color: colors.onSurfaceVariant, marginTop: Spacing.sm, fontFamily: FontFamily.medium }}>
                  Processing image…
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.base }}>
                {availableAssets.map((asset) => (
                  <Pressable
                    key={asset.id}
                    onPress={() => swapTarget && handleSwap(swapTarget, asset)}
                    style={{
                      width: 96,
                      height: 80,
                      backgroundColor: colors.black,
                      borderRadius: Radius.default,
                      padding: 6,
                      borderWidth: 1,
                      borderColor: colors.surfaceContainerHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Image
                      source={{ uri: getPlayAssetPublicUrl(asset.image_path) }}
                      style={{ width: '100%', height: '100%', borderRadius: Radius.sm }}
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


