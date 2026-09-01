import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { grantBonusKey, setPremium } from '@/lib/keys';

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; count?: string; reference?: string }>();

  const isKeys = params.type === 'keys' || (!params.type && !!params.count);
  const keysCount = Number(params.count || 20);

  useEffect(() => {
    if (isKeys) {
      void grantBonusKey(keysCount, 'key_pack_purchase', params.reference);
    } else {
      void setPremium(true);
    }
  }, [isKeys, keysCount, params.reference]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.xl) }]}>
      <View style={styles.body}>
        <CheckCircle2 size={80} color={StaticColors.successLime} strokeWidth={2.2} />

        <Text style={[styles.title, { color: colors.onSurface }]}>
          Payment Complete!
        </Text>

        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {isKeys
            ? `Your ${keysCount} Keys have been credited. You are ready to start playing.`
            : 'Your Unlimited Pass is now active. Enjoy playing road signs sessions without key limits.'}
        </Text>

        {isKeys ? (
          <View style={styles.rewardPreview}>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
            <Text style={[styles.rewardCount, { color: StaticColors.achievementAmber }]}>
              +{keysCount} Keys Added
            </Text>
          </View>
        ) : (
          <View style={styles.rewardPreview}>
            <Image
              source={require('@/assets/premium/crown.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
            <Text style={[styles.rewardCount, { color: colors.primary }]}>
              Unlimited Active
            </Text>
          </View>
        )}
      </View>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: StaticColors.successLime },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.continueButtonText}>CONTINUE PLAYING</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: Spacing.gutter,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.base,
    maxWidth: 320,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  keyImage: {
    width: 36,
    height: 36,
  },
  rewardCount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
  },
  continueButton: {
    minHeight: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  continueButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
