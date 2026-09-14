import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, FontFamily, IconSize, StaticColors } from '@/theme/tokens';
import { getStoredEmail } from '@/lib/email';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';

const SIGN_IN_PROMPT = 'Tap to Sign In';

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
 * circle) + name + gear icon that opens Settings.
 *
 * Signed out: shows "Tap to Sign In" (underlined, not bold) — tapping it
 * opens the sign-in/create-account modal directly, right here, instead of
 * routing through Settings. On success the header updates immediately to
 * the linked email's local-part, no refocus/navigation needed.
 *
 * Signed in: shows the linked account email's local-part, same as before.
 */
export function AppHeader() {
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getStoredEmail().then((storedEmail) => {
        if (!mounted) return;
        setEmail(storedEmail || null);
      });
      return () => {
        mounted = false;
      };
    }, []),
  );

  const isSignedIn = Boolean(email);
  const displayName = isSignedIn ? (email!.split('@')[0] || SIGN_IN_PROMPT) : SIGN_IN_PROMPT;
  const avatarColor = colorForName(isSignedIn ? displayName : '?');

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{isSignedIn ? initialsFor(displayName) : '?'}</Text>
      </View>

      {isSignedIn ? (
        <Text style={[Typography.titleMedium, styles.name, { color: colors.onSurface }]} numberOfLines={1}>
          {displayName}
        </Text>
      ) : (
        <Pressable
          onPress={() => setModalVisible(true)}
          style={styles.nameBtn}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          <Text
            style={[
              Typography.titleMedium,
              styles.name,
              styles.signInText,
              { color: colors.onSurface, fontFamily: FontFamily.medium },
            ]}
            numberOfLines={1}
          >
            {SIGN_IN_PROMPT}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={10}
        style={[styles.gearBtn, { backgroundColor: colors.surfaceContainerLow }]}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Settings size={IconSize.tab} color={colors.onSurfaceVariant} strokeWidth={2.2} />
      </Pressable>

      <RestoreAccountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={(result) => {
          setEmail(result.email);
          setModalVisible(false);
        }}
        currentEmail={email}
        onLoggedOut={() => setEmail(null)}
      />
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
  nameBtn: {
    flex: 1,
  },
  signInText: {
    textDecorationLine: 'underline',
  },
  gearBtn: {
    width: GEAR_SIZE,
    height: GEAR_SIZE,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
