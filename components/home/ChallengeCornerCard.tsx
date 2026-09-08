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

const KEYS_ICON = require('@/assets/premium/key.webp');

export function ChallengeCornerCard() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/challenge-corner')}
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
          <Text style={styles.title}>
            Join Challenges
          </Text>
          <Text style={styles.title}>
            for <Text style={styles.highlight}>Extra Keys</Text>
          </Text>
        </View>
        <ChevronRight size={26} color="#1A1A1A" strokeWidth={2.4} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.gutter,
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
    fontSize: 22,
    lineHeight: 28,
    color: '#1A1A1A',
  },
  highlight: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    color: '#B5651D',
  },
});
