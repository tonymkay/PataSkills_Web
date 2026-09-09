import React, { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, Image, TextInput, Platform, ScrollView } from 'react-native';
import { Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { keyPackById } from '@/lib/premium';
import { formatUSDAmount, splitCurrencyAmount } from '@/lib/currency';
import { purchaseKeyPack } from '@/lib/billing';
import { sanitizeAndValidateEmail } from '@/lib/email';
import { Button } from '@/components/ui/Button';
import type { CurriculumSlug } from '@/constants/curriculumAssets';
import type { Track } from '@/lib/curriculum';

// The one pack this screen ever offers — first-look upsell shown the
// moment a learner runs out of keys, before the full "Choose how to
// proceed" list (SessionStateScreen kind="outOfKeys"). Card layout/copy
// mirrors app/keys-confirm.tsx's confirm-purchase card exactly (same
// styles, same purchaseKeyPack() call) so tapping "Pay with Paystack"
// here is byte-for-byte the same purchase flow as picking this pack from
// the keys-packs list — this screen is only a different front door onto
// it, not a second implementation.
const OFFER_PACK_ID = 'pack_20';

interface KeysOfferScreenProps {
  /** Forwarded into purchaseKeyPack() and the eventual payment-complete
   *  redirect, same handoff SessionStateScreen/keys-confirm already do —
   *  see keys-confirm.tsx's identical comment. */
  skillId?: CurriculumSlug;
  track?: Track;
  /** "Maybe later" — dismisses to the existing outOfKeys screen. */
  onMaybeLater: () => void;
}

/**
 * First-look keys upsell — shown once, automatically, the moment a
 * learner runs out of keys (PlaySession's 'entry'/'advance' out-of-keys
 * paths), before SessionStateScreen's "Choose how to proceed" list.
 * Dismissing via "Maybe later" or OS back navigation opens that screen.
 */
export function KeysOfferScreen({ skillId, track, onMaybeLater }: KeysOfferScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pack = keyPackById(OFFER_PACK_ID)!;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@play/user_email').then((stored) => {
      if (stored) setEmail(stored);
    }).catch(() => {});
  }, []);

  // Intercept OS-based back navigation (hardware back button / system back gestures)
  // to open the out-of-keys ("Other ways to Proceed") screen, matching "Maybe later"
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onMaybeLater();
      return true;
    });
    return () => sub.remove();
  }, [onMaybeLater]);

  const priceFormatted = formatUSDAmount(pack.priceUSD, 'USD');
  const { currency, amount } = splitCurrencyAmount(priceFormatted);

  const onConfirm = async () => {
    const { valid, email: sanitized, error } = sanitizeAndValidateEmail(email);
    if (!valid) {
      setEmailError(error || 'Please enter a valid email address');
      return;
    }

    setBusy(true);
    setEmailError(null);
    const result = await purchaseKeyPack(pack.id, sanitized, skillId, track);
    setBusy(false);
    if (result === 'error') {
      alert('Could not initiate checkout. Please try again.');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, Spacing.xl),
          paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.md),
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.headingWrap}>
          <Text style={[styles.heading, { color: colors.onSurface }]}>Unlock the next{'\n'}</Text>
          <Text style={[styles.heading, { color: StaticColors.achievementAmber }]}>{pack.keys} Sessions!</Text>
        </Text>

        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          <Text style={[styles.cardSublabel, { color: colors.onSurfaceVariant }]}>Total Payment</Text>
          <Text style={[styles.cardPrice, { color: colors.onSurface }]}>
            {currency ? `${currency} ` : ''}{amount}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

          <Text style={[styles.cardSublabel, { color: colors.onSurfaceVariant }]}>You Receive</Text>
          <View style={styles.rewardRow}>
            <Image
              source={require('@/assets/premium/key.webp')}
              style={styles.keyImage}
              resizeMode="contain"
            />
            <Text style={[styles.rewardText, { color: StaticColors.achievementAmber }]}>
              {pack.keys} Keys
            </Text>
          </View>

          <View style={styles.emailSection}>
            <Text style={[styles.emailLabel, { color: colors.onSurface }]}>
              Receipt & Restoration Email
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: emailError ? '#ef4444' : colors.surfaceContainerHigh,
                },
              ]}
            >
              <Mail size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError(null);
                }}
                placeholder="your.email@example.com"
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
                textContentType="none"
                editable={!busy}
                style={[
                  styles.input,
                  { color: colors.onSurface },
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                ]}
              />
            </View>
            {emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <Text style={[styles.noteText, { color: colors.onSurfaceVariant }]}>
            {Platform.OS === 'android'
              ? 'Paid securely via Google Play. Your keys link directly to this email.'
              : 'Paid securely via Paystack. Your keys link directly to this email.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={Platform.OS === 'android' ? 'Pay with Google Play' : 'Pay with Paystack'}
          onPress={onConfirm}
          disabled={busy}
          loading={busy}
          backgroundColor={StaticColors.achievementAmber}
          textColor="#000"
        />
        <Pressable
          onPress={busy ? undefined : onMaybeLater}
          hitSlop={Spacing.sm}
          style={styles.maybeLaterLink}
        >
          <Text style={[styles.maybeLaterText, { color: colors.onSurfaceVariant }]}>
            Maybe later
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  headingWrap: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  confirmCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  cardSublabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    lineHeight: 40,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: Spacing.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  keyImage: {
    width: 32,
    height: 32,
  },
  rewardText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
  },
  emailSection: {
    width: '100%',
    marginVertical: Spacing.sm,
  },
  emailLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    height: '100%',
  },
  errorText: {
    color: '#ef4444',
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginTop: 4,
  },
  noteText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  footer: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  maybeLaterLink: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
  },
  maybeLaterText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
