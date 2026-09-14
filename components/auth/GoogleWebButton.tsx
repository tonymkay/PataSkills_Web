import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Radius } from '@/constants/spacing';
import { FontFamily } from '@/constants/typography';
import { GoogleIcon } from './GoogleIcon';
import { signInWithGoogle, isGoogleConfigured } from '@/lib/googleAuth';

/**
 * Native "Continue with Google" — Google Identity Services (GoogleWebButton
 * .web.tsx, the file actually loaded on web via Metro's platform
 * resolution) does not run inside a native app at all, so native needs a
 * different mechanism: the native @react-native-google-signin module,
 * opening the system account picker. Same onIdToken/onError/disabled
 * props as the web version, so RestoreAccountModal doesn't need to know
 * which platform it's on.
 */
interface GoogleWebButtonProps {
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function GoogleWebButton({ onIdToken, onError, disabled = false }: GoogleWebButtonProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  if (!isGoogleConfigured) return null;

  const onPress = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const idToken = await signInWithGoogle();
      if (idToken) onIdToken(idToken);
      // null = user cancelled — nothing to report
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={[
        styles.button,
        {
          borderColor: colors.outlineVariant || '#2A2E38',
          backgroundColor: 'transparent',
          opacity: busy || disabled ? 0.6 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onSurface} size="small" />
      ) : (
        <>
          <GoogleIcon size={18} />
          <Text style={[styles.label, { color: colors.onSurface }]}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
});
