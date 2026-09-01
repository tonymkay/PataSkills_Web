import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image, ActivityIndicator, TextInput, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { keyPackById } from '@/lib/premium';
import { formatUSDAmount, splitCurrencyAmount } from '@/lib/currency';
import { purchaseKeyPack } from '@/lib/billing';
import { sanitizeAndValidateEmail } from '@/lib/email';

export default function KeysConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ pack?: string }>();
  const pack = keyPackById(params.pack);
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@play/user_email').then((stored) => {
      if (stored) setEmail(stored);
    }).catch(() => {});
  }, []);

  if (!pack) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.onSurface }}>Pack not found</Text>
      </View>
    );
  }

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
    const result = await purchaseKeyPack(pack.id, sanitized);
    setBusy(false);
    if (result === 'error') {
      alert('Could not initiate checkout. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Confirm Purchase</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Main Confirmation Box */}
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

          {/* Email Input Field */}
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
            Paid securely via Paystack. Your keys link directly to this email.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Confirm CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          style={({ pressed }) => [
            styles.confirmButton,
            { backgroundColor: StaticColors.achievementAmber },
            (pressed || busy) && { opacity: 0.8 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Pay with Paystack</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    gap: Spacing.gutter,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.md,
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
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
  },
  confirmButton: {
    height: 54,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#000',
    letterSpacing: 0.5,
  },
});
