/**
 * Post-results collect screen for every non-tournament run.
 * Companion grants keys locally via grantBonusKey. Online claim RPC
 * is wired when lib/challenges.ts lands.
 */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift, Trophy } from 'lucide-react-native';
import { BottomBannerAd } from '@/components/ads/BottomBannerAd';
import { Button } from '@/components/ui/Button';
import { BrandGradients, Radius, Spacing, StaticColors, Typography, useTheme } from '@/theme/tokens';
import { clearChallengeRewardSummary, getChallengeRewardSummary } from '@/lib/challengeRuntime';
import { grantBonusKey } from '@/lib/keys';

const KEYS_ICON = require('@/assets/premium/key.webp');
const GREEN = StaticColors.selection.activeBorder;
const AMBER = StaticColors.achievementAmber;

export default function ChallengeRewardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [summary] = useState(() => getChallengeRewardSummary());
  const [collected, setCollected] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const rewardKeys = summary?.rewardKeys ?? 0;
  const earned = rewardKeys > 0;

  const onCollect = async () => {
    if (collecting || collected || !earned) return;
    setCollecting(true);
    try {
      await grantBonusKey(rewardKeys, 'challenge_reward_companion');
      setCollected(true);
    } finally {
      setCollecting(false);
    }
  };

  const onContinue = () => {
    const origin = summary?.origin;
    clearChallengeRewardSummary();
    router.replace(origin === 'challenge-corner' ? '/challenge-corner' : '/(tabs)/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.marginMobile }}>
        {earned ? <Gift size={64} color={GREEN} strokeWidth={2} /> : <Trophy size={64} color={AMBER} strokeWidth={2} />}
        <Text style={[Typography.headlineMd, { color: colors.onSurface, textAlign: 'center' }]}>
          {earned ? 'Reward earned!' : 'No reward this time'}
        </Text>
        {summary && (
          <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
            {summary.activityLabel}: {summary.score}/{summary.total}
          </Text>
        )}

        <BottomBannerAd />

        {earned && !collected && (
          <Pressable
            onPress={onCollect}
            disabled={collecting}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
              borderRadius: Radius.lg, borderWidth: 1.5, borderColor: GREEN,
              backgroundColor: StaticColors.selection.activeTint, paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.xl, opacity: collecting ? 0.6 : 1,
            }}
          >
            <Image source={KEYS_ICON} style={{ width: 20, height: 20 }} contentFit="contain" />
            <Text style={[Typography.bodyMd, { fontWeight: 'bold', color: GREEN }]}>
              Collect {rewardKeys} {rewardKeys === 1 ? 'Key' : 'Keys'}
            </Text>
          </Pressable>
        )}
        {earned && collected && (
          <Text style={[Typography.bodyMd, { color: GREEN, fontWeight: 'bold', textAlign: 'center' }]}>
            Keys collected
          </Text>
        )}

        {!(earned && !collected) && (
          <Button
            label="Finish"
            variant="gradient"
            gradientColors={BrandGradients.discovery.colors}
            gradientStart={BrandGradients.discovery.start}
            gradientEnd={BrandGradients.discovery.end}
            textColor={StaticColors.discoveryText}
            onPress={onContinue}
          />
        )}
      </View>
    </View>
  );
}
