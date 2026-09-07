import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Radius, Spacing, StaticColors, FontFamily } from '@/theme/tokens';
import { LEAGUES, leagueIndexFor, tierLabel, type LeagueTier } from '@/lib/leagues';

const TROPHY = require('@/assets/profile/trophy.webp');

interface LeagueSheetProps {
  visible: boolean;
  myXp: number;
  onClose: () => void;
  onViewLeague?: (tier: LeagueTier) => void;
}

export function LeagueSheet({
  visible,
  myXp,
  onClose,
  onViewLeague,
}: LeagueSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const PAGE_W = Math.min(480, windowWidth) - Spacing.marginMobile * 2;
  const myIndex = leagueIndexFor(myXp);

  const [page, setPage] = useState(myIndex);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    if (next >= 0 && next < LEAGUES.length) {
      setPage(next);
    }
  };

  const isMine = page === myIndex;
  const activeTier = LEAGUES[page] || LEAGUES[0];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceContainer || '#1F2229',
              borderColor: colors.outlineVariant,
              paddingBottom: Math.max(insets.bottom, Spacing.xl),
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.dragHandle, { backgroundColor: colors.outlineVariant }]} />

          {/* Carousel */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
            contentOffset={{ x: myIndex * PAGE_W, y: 0 }}
            style={{ width: PAGE_W }}
          >
            {LEAGUES.map((tier, i) => {
              const locked = i > myIndex;
              const isNext = i === myIndex + 1;
              const message = isNext
                ? `Earn ${Math.max(0, tier.min - myXp).toLocaleString('en-US')} more XP to be promoted`
                : i === myIndex
                  ? 'Your league'
                  : locked
                    ? tierLabel(tier)
                    : 'Promoted ✓';

              return (
                <View key={tier.name} style={[styles.page, { width: PAGE_W }]}>
                  <Image
                    source={TROPHY}
                    style={styles.trophy}
                    contentFit="contain"
                    tintColor={locked ? colors.outlineVariant : undefined}
                  />
                  <Text style={[styles.tierTitle, { color: colors.onSurface }]}>
                    {`${tier.name} League`}
                  </Text>
                  <Text
                    style={[
                      styles.tierMessage,
                      {
                        color: isNext
                          ? StaticColors.achievementAmber
                          : colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Page Indicator Dots */}
          <View style={styles.dotsRow}>
            {LEAGUES.map((tier, i) => (
              <View
                key={tier.name}
                style={[
                  styles.dot,
                  {
                    width: i === page ? 16 : 6,
                    backgroundColor:
                      i === page
                        ? (colors.secondary || StaticColors.successLime)
                        : (colors.surfaceContainerHigh || 'rgba(255,255,255,0.2)'),
                  },
                ]}
              />
            ))}
          </View>

          {/* Action Button */}
          {isMine || !onViewLeague ? (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: StaticColors.successLime },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.actionBtnText}>Okay</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                onViewLeague(activeTier);
                onClose();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: StaticColors.successLime },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.actionBtnText}>View</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    alignItems: 'center',
    gap: Spacing.gutter,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  page: {
    alignItems: 'center',
    gap: Spacing.gutter,
    paddingVertical: Spacing.sm,
  },
  trophy: {
    width: 104,
    height: 104,
  },
  tierTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
  },
  tierMessage: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: Radius.full,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  actionBtnText: {
    color: '#000000',
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
