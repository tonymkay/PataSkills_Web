import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Landing-screen hero illustration. Uses the real product asset from
 * assets/homepage instead of a placeholder graphic.
 */
export function LandingIllustration() {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/homepage/driving.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 260,
    height: 220,
  },
});
