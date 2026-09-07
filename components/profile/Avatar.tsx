import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontFamily } from '@/theme/tokens';
import { avatarColor, initials } from '@/lib/leaderboard';

export function Avatar({
  name,
  size = 44,
  color,
  imageUrl,
}: {
  name: string;
  size?: number;
  color?: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color ?? avatarColor(name),
        },
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          { fontSize: size >= 56 ? 18 : Math.max(14, Math.round(size * 0.38)) },
        ]}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
});
