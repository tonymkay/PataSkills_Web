import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { X, Mail, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius, Spacing } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { StaticColors } from '@/constants/colors';
import { GoogleWebButton } from '@/components/auth/GoogleWebButton';
import { restoreAccountByEmail, restoreAccountWithGoogle, RestoreResult } from '@/lib/restore';

interface RestoreAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: RestoreResult) => void;
}

export function RestoreAccountModal({ visible, onClose, onSuccess }: RestoreAccountModalProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<RestoreResult | null>(null);

  const handleEmailRestore = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setBusy(true);
    setError(null);

    const result = await restoreAccountByEmail(email);
    setBusy(false);

    if (result.success) {
      setRestoreSuccess(result);
    } else {
      setError(result.message);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setBusy(true);
    setError(null);

    const result = await restoreAccountWithGoogle(idToken);
    setBusy(false);

    if (result.success) {
      setRestoreSuccess(result);
    } else {
      setError(result.message);
    }
  };

  const handleProceedAsAccount = () => {
    if (restoreSuccess) {
      onSuccess(restoreSuccess);
      onClose();
      // Reset state for next open
      setRestoreSuccess(null);
      setEmail('');
    }
  };

  const handleClose = () => {
    onClose();
    setError(null);
    setRestoreSuccess(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceContainer || '#1C2029',
              borderColor: colors.surfaceContainerHigh || '#2A2E38',
            },
          ]}
        >
          {/* Close button */}
          <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
            <X size={20} color={colors.onSurfaceVariant} />
          </Pressable>

          {restoreSuccess ? (
            /* Success confirmation screen */
            <View style={styles.successWrap}>
              <CheckCircle2 size={56} color={StaticColors.successLime} strokeWidth={2.2} />

              <Text style={[styles.title, { color: colors.onSurface }]}>
                Account Restored!
              </Text>

              <View style={[styles.emailBadge, { backgroundColor: 'rgba(43,217,100,0.12)', borderColor: StaticColors.successLime }]}>
                <ShieldCheck size={16} color={StaticColors.successLime} />
                <Text style={[styles.emailBadgeText, { color: StaticColors.successLime }]}>
                  {restoreSuccess.email}
                </Text>
              </View>

              <View style={styles.statusBox}>
                {restoreSuccess.isPremium ? (
                  <View style={styles.rewardRow}>
                    <Image
                      source={require('@/assets/premium/crown.webp')}
                      style={styles.statusIcon}
                      resizeMode="contain"
                    />
                    <Text style={[styles.statusValue, { color: colors.primary }]}>
                      Unlimited Pass Active
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rewardRow}>
                    <Image
                      source={require('@/assets/premium/key.webp')}
                      style={styles.statusIcon}
                      resizeMode="contain"
                    />
                    <Text style={[styles.statusValue, { color: StaticColors.achievementAmber }]}>
                      {restoreSuccess.keys} Keys Available
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleProceedAsAccount}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.primaryBtnText}>CONTINUE AS THIS ACCOUNT</Text>
              </Pressable>
            </View>
          ) : (
            /* Input / Sign In Screen */
            <View style={styles.contentWrap}>
              <View style={styles.headerIconRow}>
                <Mail size={24} color={StaticColors.achievementAmber} />
              </View>

              <Text style={[styles.title, { color: colors.onSurface }]}>
                Restore Account
              </Text>
              <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                Link with Google or your email to restore your keys and progress.
              </Text>

              {/* Option 1: Continue with Google */}
              <View style={styles.googleWrap}>
                <GoogleWebButton
                  onIdToken={handleGoogleToken}
                  onError={(msg) => setError(msg)}
                  disabled={busy}
                />
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }]} />
                <Text style={[styles.dividerText, { color: colors.onSurfaceVariant }]}>
                  or with email
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh || '#2A2E38' }]} />
              </View>

              {/* Option 2: Email input */}
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.background || '#14171C',
                    borderColor: error ? '#ef4444' : (colors.surfaceContainerHigh || '#2A2E38'),
                  },
                ]}
              >
                <Mail size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError(null);
                  }}
                  placeholder="you@example.com"
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

              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Submit CTA */}
              <Pressable
                onPress={handleEmailRestore}
                disabled={busy}
                style={({ pressed }) => [
                  styles.emailRestoreBtn,
                  { backgroundColor: StaticColors.achievementAmber },
                  (pressed || busy) && { opacity: 0.8 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.emailRestoreBtnText}>Restore Account</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.marginMobile,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    padding: Spacing.xs,
    zIndex: 10,
  },
  contentWrap: {
    alignItems: 'center',
  },
  headerIconRow: {
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  googleWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.base,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
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
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  emailRestoreBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
  },
  emailRestoreBtnText: {
    color: '#000',
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  successWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  emailBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  statusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    width: '100%',
    paddingVertical: Spacing.base,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusIcon: {
    width: 28,
    height: 28,
  },
  statusValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
