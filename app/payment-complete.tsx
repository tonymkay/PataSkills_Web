import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { grantBonusKey, setPremium } from '@/lib/keys';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navReplace } from '@/lib/navDirection';
import { Button } from '@/components/ui/Button';

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; count?: string; reference?: string; email?: string; skill?: string; track?: string }>();

  const isKeys = params.type === 'keys' || (!params.type && !!params.count);
  const keysCount = Number(params.count || 20);
  const paystackRef = params.reference || `ref_${Date.now()}`;
  const [userEmail, setUserEmail] = useState<string | null>(params.email || null);

  useEffect(() => {
    if (isKeys) {
      void grantBonusKey(keysCount, 'key_pack_purchase', paystackRef);
    } else {
      void setPremium(true);
    }

    if (!userEmail) {
      AsyncStorage.getItem('@play/user_email').then((stored) => {
        if (stored) setUserEmail(stored);
      }).catch(() => {});
    }
  }, [isKeys, keysCount, paystackRef, userEmail]);

  const handleContinuePlaying = () => {
    // Forward skill/track (when the purchase flow carried them — Bug B
    // fix, §B.2/§C.1 of the multi-skill architecture doc) so app/index.tsx's
    // resume flow resolves the same skill/track this purchase started
    // from, instead of silently falling back to driving-theory.
    navReplace(router, {
      pathname: '/',
      params: {
        resume: 'true',
        ...(params.skill ? { skill: params.skill } : {}),
        ...(params.track ? { track: params.track } : {}),
      },
    });
  };

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.xl) }]}>
      <View style={styles.body}>
        <CheckCircle2 size={72} color={StaticColors.successLime} strokeWidth={2.2} />

        <Text style={[styles.title, { color: colors.onSurface }]}>
          Payment Complete!
        </Text>

        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {isKeys ? `+${keysCount} keys added to your balance.` : 'Unlimited access active.'}
        </Text>

        {isKeys ? (
          <View style={styles.rewardPreview}>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
            <Text style={[styles.rewardCount, { color: StaticColors.achievementAmber }]}>
              +{keysCount} Keys
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
              Unlimited Pass
            </Text>
          </View>
        )}

        {userEmail && (
          <View style={[styles.savedBadge, { backgroundColor: 'rgba(43,217,100,0.12)', borderColor: StaticColors.successLime }]}>
            <ShieldCheck size={16} color={StaticColors.successLime} />
            <Text style={[styles.savedBadgeText, { color: StaticColors.successLime }]}>
              Linked to {userEmail}
            </Text>
          </View>
        )}
      </View>

      {/* Footer CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Button
          label="Continue Playing"
          onPress={handleContinuePlaying}
          backgroundColor={StaticColors.successLime}
          textColor="#000"
        />
      </View>
    </View>
    </ScreenTransition>
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
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    lineHeight: 32,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#1E232B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
  },
  keyImage: {
    width: 36,
    height: 36,
  },
  rewardCount: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  savedBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
  },
});
