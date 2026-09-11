import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors } from '@/theme/tokens';
import { getStoredEmail } from '@/lib/email';

const FALLBACK_NAME = 'Learner';

// Deterministic per-name avatar colour, picked from the same palette
// used for avatars elsewhere in the app (leaderboard/profile) — see
// StaticColors.avatarPalette. Deterministic (not random) so a learner's
// avatar colour doesn't change between app opens.
function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette = StaticColors.avatarPalette;
  return palette[hash % palette.length];
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0]!.toUpperCase();
}

/**
 * Header shown at the top of every tab in the tabbed shell (Home, Skills,
 * Keys, Reports) once tabs are unlocked — avatar (colored-initials
 * circle) + name + gear icon that opens Settings. Name is derived from
 * the linked account email's local-part; falls back to "Learner" when no
 * account is linked yet (login now happens via Settings, not this
 * header). Doesn't apply its own safe-area top padding — the screen it's
 * placed in is expected to already sit inside a safe-area-aware
 * container, same as every other screen in the app.
 */
export function AppHeader() {
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState(FALLBACK_NAME);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getStoredEmail().then((email) => {
        if (!mounted) return;
        setName(email ? email.split('@')[0] || FALLBACK_NAME : FALLBACK_NAME);
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const avatarColor = colorForName(name);

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initialsFor(name)}</Text>
      </View>
      <Text style={[Typography.titleMedium, styles.name, { color: colors.onSurface }]} numberOfLines={1}>
        {name}
      </Text>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={10}
        style={[styles.gearBtn, { backgroundColor: colors.surfaceContainerLow }]}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Settings size={IconSize.tab} color={colors.onSurfaceVariant} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const AVATAR_SIZE = 40;
const GEAR_SIZE = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    flex: 1,
  },
  gearBtn: {
    width: GEAR_SIZE,
    height: GEAR_SIZE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
