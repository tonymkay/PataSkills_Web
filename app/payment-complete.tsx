import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { grantBonusKey, setPremium } from '@/lib/keys';
import { supabase } from '@/lib/supabase';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navReplace } from '@/lib/navDirection';
import { Button } from '@/components/ui/Button';

// Local guard so revisiting this screen (back button, hot reload, a second
// poll tick racing the first) never grants the same purchase twice. This is
// NOT a security boundary -- play_purchases writes are already service-role
// only (see supabase/play_purchases.sql) -- it just keeps the client from
// calling grantBonusKey/setPremium more than once for the same reference.
const CLAIMED_REFS_KEY = '@play/claimed_purchase_refs';

async function isClaimed(ref: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_REFS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(ref);
  } catch {
    return false;
  }
}

async function markClaimed(ref: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_REFS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(ref)) {
      await AsyncStorage.setItem(CLAIMED_REFS_KEY, JSON.stringify([...list, ref].slice(-50)));
    }
  } catch {
    /* best effort */
  }
}

type PurchaseRow = { keys: number | null; is_premium: boolean | null };

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; count?: string; reference?: string; email?: string; skill?: string; track?: string; expiresAt?: string }>();

  const isKeys = params.type === 'keys' || (!params.type && !!params.count);
  const keysCount = Number(params.count || 20);
  const paystackRef = params.reference || `ref_${Date.now()}`;
  const [userEmail, setUserEmail] = useState<string | null>(params.email || null);

  // Native (Play Billing) purchases are confirmed by the OS before we ever
  // route to this screen, so we grant immediately, as before. Web
  // (Paystack) purchases are NOT confirmed at this point -- the popup
  // closing only means the user finished the checkout form, not that the
  // charge cleared -- so on web we poll play_purchases for the row that
  // only paystack-webhook (server-side, signature-verified) can write,
  // instead of trusting these route params directly.
  const isWeb = Platform.OS === 'web';
  const [status, setStatus] = useState<'checking' | 'success' | 'pending'>(isWeb ? 'checking' : 'success');
  const [isRetrying, setIsRetrying] = useState(false);
  const grantedRef = useRef(false);

  useEffect(() => {
    if (!userEmail) {
      AsyncStorage.getItem('@play/user_email').then((stored) => {
        if (stored) setUserEmail(stored);
      }).catch(() => {});
    }
  }, [userEmail]);

  const grantFromRow = useCallback(async (row: PurchaseRow) => {
    if (grantedRef.current || (await isClaimed(paystackRef))) {
      setStatus('success');
      return;
    }
    grantedRef.current = true;
    if (row.keys && row.keys > 0) {
      await grantBonusKey(row.keys, 'key_pack_purchase', paystackRef);
    }
    if (row.is_premium) {
      await setPremium(true, params.expiresAt);
    }
    await markClaimed(paystackRef);
    setStatus('success');
  }, [paystackRef, params.expiresAt]);

  const checkOnce = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase
      .from('play_purchases')
      .select('keys, is_premium')
      .eq('paystack_ref', paystackRef)
      .maybeSingle();
    if (data) {
      await grantFromRow(data as PurchaseRow);
      return true;
    }
    return false;
  }, [paystackRef, grantFromRow]);

  useEffect(() => {
    if (!isWeb) {
      // Native: grant locally, same behavior as before this change.
      if (isKeys) {
        void grantBonusKey(keysCount, 'key_pack_purchase', paystackRef);
      } else {
        void setPremium(true, params.expiresAt);
      }
      return;
    }

    let alive = true;
    let attempts = 0;
    const poll = async () => {
      const found = await checkOnce();
      if (!alive || found) return;
      attempts += 1;
      if (attempts >= 10) {
        setStatus('pending');
        return;
      }
      setTimeout(poll, 2000);
    };
    void poll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional run-once poll loop
  }, [isWeb]);

  const handleCheckAgain = async () => {
    setIsRetrying(true);
    try {
      const found = await checkOnce();
      if (!found) setStatus('pending');
    } finally {
      setIsRetrying(false);
    }
  };

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

  if (status === 'checking' || status === 'pending') {
    return (
      <ScreenTransition>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.xl) }]}>
          <ActivityIndicator size="large" color={colors.onSurface} />
          <Text style={[styles.title, { color: colors.onSurface, marginTop: Spacing.lg }]}>
            {status === 'checking' ? 'Confirming your payment…' : 'Still processing…'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {status === 'checking'
              ? 'Just a moment while Paystack confirms your payment.'
              : 'This can take a moment. You can check again, or leave this page — it unlocks automatically.'}
          </Text>
          {status === 'pending' && (
            <View style={{ marginTop: Spacing.xl, width: '100%', gap: Spacing.sm }}>
              <Button
                label={isRetrying ? 'Checking…' : 'Check Again'}
                onPress={handleCheckAgain}
                backgroundColor={StaticColors.successLime}
                textColor="#000"
              />
            </View>
          )}
        </View>
      </ScreenTransition>
    );
  }

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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
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
