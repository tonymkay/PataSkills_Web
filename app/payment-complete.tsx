import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Mail, X, ShieldCheck } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, FontFamily, StaticColors } from '@/theme/tokens';
import { grantBonusKey, setPremium } from '@/lib/keys';
import { supabase } from '@/lib/supabase';

export default function PaymentCompleteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; count?: string; reference?: string }>();

  const isKeys = params.type === 'keys' || (!params.type && !!params.count);
  const keysCount = Number(params.count || 20);
  const paystackRef = params.reference || `ref_${Date.now()}`;

  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isKeys) {
      void grantBonusKey(keysCount, 'key_pack_purchase', paystackRef);
    } else {
      void setPremium(true);
    }
  }, [isKeys, keysCount, paystackRef]);

  const handleSaveEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setSaveError('Enter a valid email');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await AsyncStorage.setItem('@play/user_email', trimmed);
      await supabase.from('play_purchases').upsert(
        {
          email: trimmed,
          paystack_ref: paystackRef,
          keys: isKeys ? keysCount : 0,
          is_premium: !isKeys,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'paystack_ref' }
      );
      setSavedEmail(trimmed);
      setModalVisible(false);
    } catch {
      setSavedEmail(trimmed);
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleContinuePlaying = () => {
    router.replace({ pathname: '/', params: { resume: 'true' } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, Spacing.xl) }]}>
      <View style={styles.body}>
        <CheckCircle2 size={72} color={StaticColors.successLime} strokeWidth={2.2} />

        <Text style={[styles.title, { color: colors.onSurface }]}>
          Payment Complete!
        </Text>

        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
          {isKeys ? `+${keysCount} keys ready to play.` : 'Unlimited access active.'}
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

        {savedEmail && (
          <View style={[styles.savedBadge, { backgroundColor: 'rgba(43,217,100,0.12)', borderColor: StaticColors.successLime }]}>
            <ShieldCheck size={16} color={StaticColors.successLime} />
            <Text style={[styles.savedBadgeText, { color: StaticColors.successLime }]}>
              Saved to {savedEmail}
            </Text>
          </View>
        )}
      </View>

      {/* Footer CTAs */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + Spacing.base, Spacing.lg) }]}>
        {!savedEmail ? (
          <>
            <Pressable
              onPress={() => setModalVisible(true)}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: StaticColors.achievementAmber },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Mail size={18} color="#000" strokeWidth={2.2} />
              <Text style={styles.saveButtonText}>Save Payment</Text>
            </Pressable>

            <Pressable
              onPress={handleContinuePlaying}
              style={({ pressed }) => [
                styles.skipButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.skipButtonText, { color: colors.onSurfaceVariant }]}>
                Skip
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleContinuePlaying}
            style={({ pressed }) => [
              styles.continueButton,
              { backgroundColor: StaticColors.successLime },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.continueButtonText}>CONTINUE PLAYING</Text>
          </Pressable>
        )}
      </View>

      {/* Email Save Pop-up Modal with Keyboard Avoidance */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
              style={{ width: '100%', maxWidth: 420 }}
            >
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surfaceContainer,
                    borderColor: colors.surfaceContainerHigh,
                  },
                ]}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Mail size={20} color={StaticColors.achievementAmber} />
                    <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                      Save Payment
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <X size={20} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>

                <Text style={[styles.modalDescription, { color: colors.onSurfaceVariant }]}>
                  Enter email to restore your purchase on any device anytime.
                </Text>

                {/* Email Input */}
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.background,
                      borderColor: saveError ? '#ef4444' : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (saveError) setSaveError(null);
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.onSurfaceVariant}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveEmail}
                    style={[styles.input, { color: colors.onSurface }]}
                  />
                </View>

                {saveError && (
                  <Text style={styles.errorText}>{saveError}</Text>
                )}

                {/* Submit CTA */}
                <Pressable
                  onPress={handleSaveEmail}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.submitButton,
                    { backgroundColor: StaticColors.achievementAmber },
                    (pressed || saving) && { opacity: 0.8 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    marginTop: Spacing.gutter,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.xs,
    maxWidth: 280,
  },
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  keyImage: {
    width: 32,
    height: 32,
  },
  rewardCount: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.gutter,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  savedBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    gap: Spacing.xs,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  saveButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  continueButton: {
    minHeight: 54,
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

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.gutter,
  },
  modalCard: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.gutter,
    paddingVertical: 10,
  },
  input: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  submitButtonText: {
    color: '#000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
