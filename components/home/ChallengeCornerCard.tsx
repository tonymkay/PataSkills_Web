/**
 * Homepage entry into Challenge Corner — reward-driven copy only.
 * Game modes are explained on the corner menu, not here.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowUpRight } from 'lucide-react-native';
import { FontFamily, Radius, Spacing, Typography, useTheme } from '@/theme/tokens';

const KEYS_ICON = require('@/assets/premium/key.webp');

export function ChallengeCornerCard() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/challenge-corner')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.topRow}>
        <Image source={KEYS_ICON} style={styles.key} contentFit="contain" />
        <View style={styles.arrowBtn}>
          <ArrowUpRight size={18} color="#1A1A1A" strokeWidth={2.4} />
        </View>
      </View>
      <Text style={[Typography.headlineMedium, styles.title, { color: colors.onSurface }]}>
        Want extra keys?
      </Text>
      <Text style={[Typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: Spacing.xs }]}>
        Race in Challenge Corner and earn bonus keys.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.gutter,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  key: {
    width: 28,
    height: 28,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.bold,
  },
});
