import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, Image, TextInput, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Mail } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { planById, planDisplay } from '@/lib/premium';
import { purchasePlan } from '@/lib/billing';
import { sanitizeAndValidateEmail } from '@/lib/email';
import { ScreenTransition } from '@/components/nav/ScreenTransition';
import { navBack } from '@/lib/navDirection';
import { Button } from '@/components/ui/Button';

export default function SubscriptionConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ plan?: string; skill?: string; track?: string }>();
  const plan = planById(params.plan);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@play/user_email').then((stored) => {
      if (stored) setEmail(stored);
    }).catch(() => {});
  }, []);

  if (!plan) {
    return (
      <ScreenTransition>
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.onSurface }}>Plan not found</Text>
      </View>
      </ScreenTransition>
    );
  }

  const display = planDisplay(plan, 'USD');

  const onConfirm = async () => {
    const { valid, email: sanitized, error } = sanitizeAndValidateEmail(email);
    if (!valid) {
      setEmailError(error || 'Please enter a valid email address');
      return;
    }

    setBusy(true);
    setEmailError(null);
    const result = await purchasePlan(plan.packageId, sanitized, params.skill, params.track);
    setBusy(false);
    if (result === 'error') {
      alert('Could not initiate checkout. Please try again.');
    }
  };

  return (
    <ScreenTransition>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.gutter) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navBack(router)} hitSlop={Spacing.sm} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.onSurface} strokeWidth={2.2} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Confirm Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Main Subscription Card */}
        <View
          style={[
            styles.confirmCard,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: plan.popular ? StaticColors.successLime : colors.surfaceContainerHigh,
              borderWidth: plan.popular ? 1.8 : 1,
            },
          ]}
        >
          <Image
            source={require('@/assets/premium/crown.webp')}
            style={styles.crownImage}
            resizeMode="contain"
          />

          <Text style={[styles.planTitle, { color: colors.onSurface }]}>
            {plan.name} Pass
          </Text>
          
          <Text style={[styles.cardPrice, { color: StaticColors.successLime }]}>
            {display.price}
          </Text>

          <Text style={[styles.cardTerm, { color: colors.onSurfaceVariant }]}>
            {display.term} {display.note ? `• ${display.note}` : ''}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

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

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Unlimited sessions with 0 key limits</Text>
            </View>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Access to all road signs & driving questions</Text>
            </View>
            <View style={styles.benefitRow}>
              <Check size={18} color={StaticColors.successLime} strokeWidth={2.5} />
              <Text style={[styles.benefitText, { color: colors.onSurface }]}>Paid securely via Paystack Web</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Confirm CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        <Button
          label="Subscribe with Paystack"
          onPress={onConfirm}
          disabled={busy}
          loading={busy}
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
    padding: Spacing.xl,
    alignItems: 'center',
  },
  crownImage: {
    width: 64,
    height: 64,
    marginBottom: Spacing.sm,
  },
  planTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
  },
  cardPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 38,
    marginTop: Spacing.xs,
  },
  cardTerm: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: Spacing.sm,
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
  benefitsList: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.sm,
  },
});
