/**
 * Offline Challenge — swipeable companion-owned races (fully client-side,
 * zero DB). Port of pataskillsv2 companion-challenge-room.tsx.
 *
 * Play adaptations: no display-identity lookup (name is always "You"),
 * no Level N subtext (Play has no leveled curriculum), empty state has
 * no /my-skills — just Refresh. Join → wait pulse → challenge-start.
 */
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Users, RefreshCw, Flag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { Avatar } from '@/components/profile/Avatar';
import { AvatarStack } from '@/components/challenge/AvatarStack';
import { StoryCarousel } from '@/components/challenge/StoryCarousel';
import { Button } from '@/components/ui/Button';
import { generateCompanionChallenges, type CompanionChallenge, type CompanionPersona } from '@/lib/challengeCompanions';
import { initCompanionSession } from '@/lib/challengeCompanionSession';
import { buildChallengeQuestions } from '@/lib/challengeQuestions';
import { setPendingChallengeRun } from '@/lib/challengeRuntime';
import {
  BrandGradients,
  IconSize,
  Radius,
  Spacing,
  StaticColors,
  Typography,
  useTheme,
} from '@/theme/tokens';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

function FlagPulse() {
  const { colors } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800 }), -1, false);
  }, [pulse]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.8]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.4, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.5, 1.3]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0]),
  }));

  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring1Style]} />
      <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: colors.primary }, ring2Style]} />
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.surfaceContainerHigh,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          zIndex: 10,
        }}
      >
        <Flag size={36} color={StaticColors.selection.activeBorder} strokeWidth={2.2} fill={StaticColors.selection.activeBorder} />
      </View>
    </View>
  );
}

function ChallengeSlide({
  challenge,
  onJoin,
}: {
  challenge: CompanionChallenge;
  onJoin: () => void;
}) {
  const { colors } = useTheme();
  const participants: CompanionPersona[] = [challenge.creatorPersona, ...challenge.waitingCompanions];
  return (
    <View style={{ flex: 1, paddingHorizontal: Spacing.marginMobile }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg }}>
        <AvatarStack members={participants.map((p) => ({ id: p.id, name: p.name }))} maxVisible={4} size={40} />
        <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center', fontWeight: 'bold' }]}>
          {challenge.topicTitle}
        </Text>
        <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant }]}>
          {challenge.curriculumTitle}
        </Text>
      </View>
      <View style={{ marginBottom: Spacing.xl }}>
        <Pressable onPress={onJoin} style={{ borderRadius: Radius.default, overflow: 'hidden' }}>
          <LinearGradient
            colors={BrandGradients.discovery.colors}
            start={BrandGradients.discovery.start}
            end={BrandGradients.discovery.end}
            style={{ paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={[Typography.buttonText, { color: StaticColors.discoveryText, fontWeight: 'bold' }]}>
              Join Challenge
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export default function ChallengeOfflineScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string }>();
  const filterSlug = params.slug as CurriculumSlug | undefined;

  const [challenges, setChallenges] = useState<CompanionChallenge[]>([]);
  const [joinedChallenge, setJoinedChallenge] = useState<CompanionChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(true);
  const [batchId, setBatchId] = useState(0);
  const myDisplayName = 'You';

  const loadChallenges = async () => {
    setLoading(true);
    const list = await generateCompanionChallenges(3, filterSlug);
    setChallenges(list);
    setLoading(false);
    setBatchId((n) => n + 1);
  };

  useEffect(() => {
    const delay = 5000 + Math.random() * 3000;
    const t = setTimeout(() => setPreparing(false), delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const list = await generateCompanionChallenges(3, filterSlug);
      if (!alive) return;
      setChallenges(list);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [filterSlug]);

  useEffect(() => {
    if (!joinedChallenge) return;

    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;

      try {
        const questions = await buildChallengeQuestions(
          joinedChallenge.curriculumSlug,
          joinedChallenge.seed,
          joinedChallenge.questionCount,
          joinedChallenge.topicIndex,
        );

        if (!active) return;

        if (questions.length === 0) {
          setJoinedChallenge(null);
          return;
        }

        await initCompanionSession(
          joinedChallenge.creatorPersona,
          myDisplayName,
          questions.length,
          joinedChallenge.waitingCompanions,
        );

        if (!active) return;

        setPendingChallengeRun({
          isCompanion: true,
          curriculumSlug: joinedChallenge.curriculumSlug,
          curriculumTitle: joinedChallenge.curriculumTitle,
          questions,
          origin: 'challenge-corner',
          difficulty: joinedChallenge.creatorPersona.difficulty,
        });

        router.replace('/challenge-start');
      } catch (err) {
        console.warn('[challenge-offline] failed to start race:', err);
        if (active) setJoinedChallenge(null);
      }
    }, 2800);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [joinedChallenge, router]);

  const onBack = () => {
    setJoinedChallenge(null);
    router.back();
  };

  const showingCarousel = !loading && !preparing && !joinedChallenge && challenges.length > 0;
  const backButton = (
    <Pressable onPress={onBack} hitSlop={10}>
      <X size={IconSize.header} color={colors.onSurface} strokeWidth={2.5} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {!showingCarousel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.gutter, paddingHorizontal: Spacing.marginMobile, paddingVertical: Spacing.sm }}>
          {backButton}
          {joinedChallenge && (
            <View style={{ flex: 1 }}>
              <Text style={[Typography.headlineSm, { color: colors.onSurface }]}>Challenge Room</Text>
            </View>
          )}
        </View>
      )}

      {joinedChallenge ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xxl, paddingHorizontal: Spacing.marginMobile, paddingBottom: Spacing.xl }}>
          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <FlagPulse />
            <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold', marginTop: Spacing.md }]}>
              Waiting to start
            </Text>
            <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
              {joinedChallenge.creatorPersona.name} will begin the challenge soon
            </Text>
          </View>

          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[Typography.caption, { color: colors.onSurfaceVariant, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' }]}>
              Players
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs }}>
              {[
                { name: myDisplayName, isYou: true, isHost: false },
                { name: joinedChallenge.creatorPersona.name, isYou: false, isHost: true },
                ...joinedChallenge.waitingCompanions.map((wc) => ({ name: wc.name, isYou: false, isHost: false })),
              ].slice(0, 4).map((p, idx) => {
                let ringColor = colors.outlineVariant;
                if (p.isYou) ringColor = StaticColors.selection.youRing;
                else if (p.isHost) ringColor = StaticColors.selection.activeBorder;

                return (
                  <View
                    key={idx}
                    style={{
                      marginLeft: idx === 0 ? 0 : -14,
                      zIndex: 10 - idx,
                      borderWidth: 2.5,
                      borderColor: colors.background,
                      borderRadius: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ borderWidth: 2, borderColor: ringColor, borderRadius: 28, padding: 2 }}>
                      <Avatar name={p.name} size={48} imageUrl={null} />
                    </View>
                    {p.isHost && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: -6,
                          backgroundColor: StaticColors.selection.activeBorder,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: Radius.sm,
                          zIndex: 20,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.white }}>HOST</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {(1 + 1 + joinedChallenge.waitingCompanions.length) > 4 && (
                <View
                  style={{
                    marginLeft: -14,
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    borderWidth: 2.5,
                    borderColor: colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surfaceContainerHigh,
                    zIndex: 5,
                  }}
                >
                  <Text style={[Typography.bodyLg, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    +{1 + 1 + joinedChallenge.waitingCompanions.length - 4}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (loading || preparing) ? (
        <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', gap: Spacing.md, paddingTop: '34%', paddingBottom: Spacing.xxl }}>
          <FlagPulse />
          <Text style={[Typography.headlineSm, { color: colors.onSurface, fontWeight: 'bold' }]}>Preparing a challenge…</Text>
        </View>
      ) : challenges.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.marginMobile }}>
          <Users size={48} color={colors.onSurfaceVariant} strokeWidth={1.5} />
          <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            No companion challenges available right now.
          </Text>
          <Button label="Refresh" variant="outline" onPress={() => void loadChallenges()} textColor={colors.onSurface} />
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <StoryCarousel
              key={batchId}
              items={challenges}
              keyExtractor={(c) => c.challengeId}
              onExit={() => { void loadChallenges(); }}
              ctaZoneHeight={130}
              leading={backButton}
              renderItem={(c) => (
                <ChallengeSlide
                  challenge={c}
                  onJoin={() => setJoinedChallenge(c)}
                />
              )}
            />
          </View>
          <Pressable onPress={loadChallenges} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md }}>
            <RefreshCw size={14} color={colors.onSurfaceVariant} />
            <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant }]}>Refresh</Text>
          </Pressable>
        </>
      )}
      <View style={{ alignItems: 'center', paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
        <BottomBannerAd />
      </View>
    </View>
  );
}
