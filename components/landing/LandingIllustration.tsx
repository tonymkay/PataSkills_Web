import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';

// Landing-screen hero illustration for the driving-theory skill, served
// from the shared `play-assets` Supabase bucket (see constants/
// curriculumAssets.ts) instead of bundled into the app. Preloaded on web
// via app/+html.tsx using the same public-URL construction, so this
// <Image> should already be warm in the browser cache by the time it
// mounts.
const coverImageUrl = getPlayAssetPublicUrl(CurriculumCoverImagePaths['driving-theory']);

export function LandingIllustration() {
  return (
    <View style={styles.wrap}>
      <Image
        source={{ uri: coverImageUrl }}
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
