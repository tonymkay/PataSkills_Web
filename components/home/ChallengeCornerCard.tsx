/**
 * Homepage entry into Challenge Corner — reward-driven copy only.
 * Game modes are explained on the corner menu, not here.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { FontFamily, Radius, Spacing } from '@/theme/tokens';
import { navPush } from '@/lib/navDirection';

const KEYS_ICON = require('@/assets/premium/key.webp');

export function ChallengeCornerCard() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => navPush(router, '/challenge-corner')}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={['#CDECB1', '#8AD68E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Image source={KEYS_ICON} style={styles.key} contentFit="contain" />
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            Need Extra Keys?
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Join Todays Challenges
          </Text>
        </View>
        <ChevronRight size={26} color="#1A1A1A" strokeWidth={2.4} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.gutter,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
  },
  key: {
    width: 44,
    height: 44,
  },
  textBlock: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    lineHeight: 24,
    color: '#1A1A1A',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: '#1A1A1A',
    marginTop: 2,
  },
});
