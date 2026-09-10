/**
 * Create Challenge — simplified for Play (no email/nickname invites).
 * Flow: curriculum picker (skipped if only 1) → topic picker → deadline
 * picker → Global toggle → Create.
 */
import { useEffect, useState, useCallback } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Globe, Check } from 'lucide-react-native';
import { IconSize, Radius, Spacing, Typography, useTheme } from '@/theme/tokens';
import { getCurriculaCatalog, type CurriculumCatalogRow } from '@/lib/curriculaCatalog';
import { getChallengeTopics } from '@/lib/challengeQuestions';
import { createChallenge, getMyChallengeStories, type ChallengeStory } from '@/lib/challenges';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Toggle } from '@/components/ui/Toggle';
import { navBack, navReplace } from '@/lib/navDirection';

interface TopicRow { title: string; index: number }

const DEADLINES: { label: string; hours: number | null }[] = [
  { label: 'No deadline', hours: null },
  { label: '1 hour', hours: 1 },
  { label: '24 hours', hours: 24 },
  { label: '48 hours', hours: 48 },
  { label: '1 week', hours: 168 },
];

export default function ChallengeCreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // ── state ──
  const [curricula, setCurricula] = useState<CurriculumCatalogRow[]>([]);
  const [curriculum, setCurriculum] = useState<CurriculumCatalogRow | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topic, setTopic] = useState<TopicRow | null>(null);
  const [deadlineHours, setDeadlineHours] = useState<number | null>(24);
  const [isGlobal, setIsGlobal] = useState(true); // default ON — reward-driven UX
  const [creating, setCreating] = useState(false);

  // ── existing not-yet-started challenge this device already created ──
  // Prevents creating a second one before the first is aborted/started.
  const [pending, setPending] = useState<ChallengeStory | null | undefined>(undefined); // undefined = still checking
  const checkPending = useCallback(() => {
    getMyChallengeStories().then((stories) => {
      setPending(stories.find((s) => s.isCreator && s.status === 'waiting' && !s.isTournament) ?? null);
    });
  }, []);
  useEffect(() => { checkPending(); }, [checkPending]);

  // ── bottom-sheet shim (simple modal) ──
  const [sheetOpen, setSheetOpen] = useState<'curriculum' | 'topic' | 'deadline' | null>(null);

  // Challenge Corner is always the return destination from this screen —
  // both the in-app back arrow and OS/hardware back. Pop the real stack
  // when there's history to pop — lands on the existing Challenge Corner
  // instance underneath with the correct native-stack "pop" animation,
  // instead of stacking a new one via replace(). replace() is only a
  // fallback for when this screen has no history to pop (e.g. a web
  // reload landing directly here).
  const goToChallengeCorner = useCallback(() => {
    if (router.canGoBack()) navBack(router);
    else navReplace(router, '/challenge-corner', 'backward');
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goToChallengeCorner();
      return true;
    });
    return () => sub.remove();
  }, [goToChallengeCorner]);

  // ── load curricula ──
  useEffect(() => {
    let alive = true;
    getCurriculaCatalog().then((rows) => {
      if (!alive) return;
      setCurricula(rows);
      if (rows.length === 1) setCurriculum(rows[0]); // auto-select
    });
    return () => { alive = false; };
  }, []);

  // ── load topics when curriculum changes ──
  useEffect(() => {
    if (!curriculum) return;
    let alive = true;
    setTopicsLoading(true);
    setTopics([]);
    setTopic(null);
    getChallengeTopics(curriculum.slug as CurriculumSlug).then((ts) => {
      if (!alive) return;
      setTopics(ts.map((t, i) => ({ title: t.title, index: i })));
      setTopicsLoading(false);
    });
    return () => { alive = false; };
  }, [curriculum]);

  const canCreate = !!curriculum && !!topic && !creating && !pending;

  const onCreate = useCallback(async () => {
    if (!curriculum || !topic || !canCreate) return;
    setCreating(true);
    try {
      const created = await createChallenge({
        curriculumSlug: curriculum.slug,
        targetTopicCount: topic.index >= 0 ? topic.index : null,
        isGlobal,
        deadlineAt: deadlineHours ? new Date(Date.now() + deadlineHours * 3_600_000) : null,
      });
      if (!created) throw new Error('Check your connection and try again.');
      if (!created.inviteCode) throw new Error('Could not generate a challenge code. Please try again.');
      // Straight into the waiting room — same screen/flow a joiner lands in,
      // just as the creator this time.
      router.replace({
        pathname: '/challenge-online' as any,
        params: { challengeId: created.challengeId, origin: 'create' },
      });
    } catch (e) {
      Alert.alert(
        'Could not create the challenge',
        e instanceof Error ? e.message : 'Check your connection and try again.',
      );
    } finally {
      setCreating(false);
    }
  }, [curriculum, topic, canCreate, isGlobal, deadlineHours, router]);

  // Already have a waiting challenge — go check on it instead of creating
  // a second one.
  const onCheckPending = useCallback(() => {
    if (!pending) return;
    router.replace({
      pathname: '/challenge-online' as any,
      params: { challengeId: pending.challengeId, origin: 'create' },
    });
  }, [pending, router]);

  // ── helpers ──
  const pickerRowStyle = {
    height: 56,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  };

  const deadlineLabel = DEADLINES.find((d) => d.hours === deadlineHours)?.label ?? 'No deadline';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
        <Pressable onPress={goToChallengeCorner} hitSlop={10}>
          <ChevronLeft size={IconSize.header} color={colors.onSurface} strokeWidth={2.5} />
        </Pressable>
        <Text style={[Typography.headlineMd, { color: colors.onSurface, flex: 1 }]} numberOfLines={1}>
          Start a Challenge
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xxl + insets.bottom, gap: Spacing.lg }}
      >
        {/* Curriculum picker — hidden if only one */}
        {curricula.length > 1 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>Select a skill</Text>
            <Pressable onPress={() => setSheetOpen('curriculum')} disabled={creating} style={pickerRowStyle}>
              <Text style={[Typography.bodyLg, { color: curriculum ? colors.onSurface : colors.onSurfaceVariant }]} numberOfLines={1}>
                {curriculum?.title ?? 'Any skill can be a challenge'}
              </Text>
              <ChevronRight size={IconSize.header} color={colors.onSurfaceVariant} strokeWidth={2} />
            </Pressable>
          </View>
        )}

        {/* Topic picker */}
        <View style={{ gap: Spacing.sm }}>
          <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>Select a topic</Text>
          <Pressable
            onPress={() => curriculum && setSheetOpen('topic')}
            disabled={!curriculum || creating || topicsLoading}
            style={[pickerRowStyle, { opacity: curriculum ? 1 : 0.5 }]}
          >
            <Text style={[Typography.bodyLg, { color: topic ? colors.onSurface : colors.onSurfaceVariant }]} numberOfLines={1}>
              {topic
                ? topic.title
                : curriculum
                  ? topicsLoading ? 'Loading topics\u2026' : 'Pick the topic to challenge on'
                  : 'Select a skill first'}
            </Text>
            <ChevronRight size={IconSize.header} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Deadline picker */}
        <View style={{ gap: Spacing.sm }}>
          <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>Deadline</Text>
          <Pressable onPress={() => setSheetOpen('deadline')} disabled={creating} style={pickerRowStyle}>
            <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>{deadlineLabel}</Text>
            <ChevronRight size={IconSize.header} color={colors.onSurfaceVariant} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Global toggle — inline, no bottom sheet */}
        <View style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <Globe size={IconSize.header} color={colors.onSurface} strokeWidth={2} />
              <Text style={[Typography.bodyLg, { color: colors.onSurface }]}>Global Challenge</Text>
            </View>
            <Toggle
              value={isGlobal}
              onValueChange={setIsGlobal}
            />
          </View>
          <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>
            {isGlobal
              ? 'Anyone online doing this skill can join. Global challenges expire after 5 minutes and auto-start when 20 people join.'
              : "Private — only people you share the invite code with can join. They'll enter it under \u201cJoin a Challenge\u201d."}
          </Text>
        </View>

        {/* Already have a waiting challenge — nudge to go check on it */}
        {pending && (
          <View style={{
            padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: colors.surfaceContainerHigh,
            borderWidth: 1, borderColor: colors.outlineVariant, gap: Spacing.xs,
          }}>
            <Text style={[Typography.bodyMd, { color: colors.onSurface, fontWeight: '600' }]}>
              You already have a challenge waiting for players
            </Text>
            <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>
              Abort it from the waiting room before starting a new one.
            </Text>
          </View>
        )}

        {/* Create / check-pending button */}
        <Pressable
          onPress={pending ? onCheckPending : onCreate}
          disabled={pending ? false : !canCreate}
          style={{
            height: 56,
            borderRadius: Radius.lg,
            backgroundColor: (pending || canCreate) ? colors.tealAccent : colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: Spacing.md,
            opacity: creating ? 0.7 : 1,
          }}
        >
          <Text style={[Typography.bodyLg, { color: (pending || canCreate) ? colors.white : colors.onSurfaceVariant, fontWeight: '600' }]}>
            {pending ? 'Check your challenge' : creating ? 'Creating\u2026' : 'Create Challenge'}
          </Text>
        </Pressable>
      </ScrollView>

      <BottomBannerAd />

      {/* ── Bottom-sheet shim: curriculum ── */}
      <PickerSheet
        visible={sheetOpen === 'curriculum'}
        title="Select a skill"
        onClose={() => setSheetOpen(null)}
        colors={colors}
      >
        {curricula.map((c) => (
          <PickerRow
            key={c.slug}
            label={c.title}
            selected={curriculum?.slug === c.slug}
            colors={colors}
            onPress={() => { setCurriculum(c); setSheetOpen(null); }}
          />
        ))}
      </PickerSheet>

      {/* ── Bottom-sheet shim: topic ── */}
      <PickerSheet
        visible={sheetOpen === 'topic'}
        title="Select a topic"
        onClose={() => setSheetOpen(null)}
        colors={colors}
      >
        {topics.length === 0 && !topicsLoading && (
          <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>No topics found for this skill yet.</Text>
        )}
        {topics.map((t) => (
          <PickerRow
            key={t.index}
            label={t.title}
            selected={topic?.index === t.index}
            colors={colors}
            onPress={() => { setTopic(t); setSheetOpen(null); }}
          />
        ))}
      </PickerSheet>

      {/* ── Bottom-sheet shim: deadline ── */}
      <PickerSheet
        visible={sheetOpen === 'deadline'}
        title="Deadline"
        onClose={() => setSheetOpen(null)}
        colors={colors}
      >
        {DEADLINES.map((d) => (
          <PickerRow
            key={d.label}
            label={d.label}
            selected={deadlineHours === d.hours}
            colors={colors}
            onPress={() => { setDeadlineHours(d.hours); setSheetOpen(null); }}
          />
        ))}
      </PickerSheet>
    </View>
  );
}

// ── reusable inline bottom-sheet ──
function PickerSheet({
  visible,
  title,
  onClose,
  colors,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightPercent={0.6}>
      <Text style={[Typography.headlineSm, { color: colors.onSurface, marginBottom: Spacing.md }]}>{title}</Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
        <View style={{ gap: Spacing.sm }}>{children}</View>
      </ScrollView>
    </BottomSheet>
  );
}

function PickerRow({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: selected ? colors.tealAccent : colors.outlineVariant,
        backgroundColor: selected ? colors.surfaceContainerHigh : colors.surfaceContainerLow,
      }}
    >
      <Text style={[Typography.bodyLg, { color: colors.onSurface, flex: 1 }]} numberOfLines={2}>{label}</Text>
      {selected && <Check size={20} color={colors.tealAccent} strokeWidth={2.5} />}
    </Pressable>
  );
}
