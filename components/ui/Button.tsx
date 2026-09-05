import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius, FontFamily } from '@/theme/tokens';

type ButtonVariant = 'solid' | 'gradient' | 'outline';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** solid variant background color */
  backgroundColor?: string;
  /** gradient variant colors, e.g. BrandGradients.discovery.colors */
  gradientColors?: readonly [string, string, ...string[]];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  textColor?: string;
  /** outline variant border color (defaults to textColor) */
  borderColor?: string;
  disabled?: boolean;
  loading?: boolean;
  /** All CTAs in the app are uppercase by default; opt out per-instance if needed. */
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Single shared CTA button for the whole app. Every full-width pill button
 * (solid color, gradient, or outline) should render through this instead of
 * a one-off Pressable+Text/LinearGradient combo — that's what let "Start
 * Practice" drift out of sync with every other button's casing/color in the
 * first place. Change the look here and every screen picks it up.
 */
export function Button({
  label,
  onPress,
  variant = 'solid',
  backgroundColor = '#FFFFFF',
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  textColor = '#000000',
  borderColor,
  disabled = false,
  loading = false,
  uppercase = true,
  style,
  textStyle,
}: ButtonProps) {
  const isInert = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={textColor} size="small" />
  ) : (
    <Text style={[styles.text, { color: textColor }, textStyle]}>
      {uppercase ? label.toUpperCase() : label}
    </Text>
  );

  if (variant === 'gradient' && gradientColors) {
    return (
      <Pressable
        onPress={isInert ? undefined : onPress}
        disabled={isInert}
        style={({ pressed }) => [styles.wrapper, style, (pressed || isInert) && styles.pressed]}
      >
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={styles.inner}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={isInert ? undefined : onPress}
      disabled={isInert}
      style={({ pressed }) => [
        styles.wrapper,
        styles.inner,
        {
          backgroundColor: variant === 'outline' ? 'transparent' : backgroundColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: borderColor || textColor,
        },
        style,
        (pressed || isInert) && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  inner: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
