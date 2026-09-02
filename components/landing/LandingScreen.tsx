import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Radius, FontFamily } from '@/theme/tokens';
import { SkillCard } from './SkillCard';
import { CarouselDots } from './CarouselDots';
import { LANDING_SKILLS, type LandingSkill } from '@/constants/skills';
import { RestoreAccountModal } from '@/components/auth/RestoreAccountModal';
import { RestoreResult } from '@/lib/restore';
import { truncateEmailMiddle } from '@/lib/email';
import { getLocalProgress } from '@/lib/progress';
import { Track } from '@/lib/curriculum';

const CARD_MARGIN = Spacing.marginMobile;
const PAGE_WIDTH = Dimensions.get('window').width - CARD_MARGIN * 2;

interface TrackOption {
  track: Track;
  label: string;
}

const TRACK_OPTIONS: TrackOption[] = [
  { track: 'pairs', label: 'Challenge yourself with pairs' },
  { track: 'names', label: 'Learn sign names' },
  { track: 'meanings', label: 'Learn what signs mean' },
  { track: 'whereUsed', label: 'Learn where signs are used' },
  { track: 'full', label: 'Full course' },
  { track: 'reading', label: 'Reading mode — just browse the signs' },
];

interface LandingScreenProps {
  onStart: (track: Track) => void;
}

export function LandingScreen({ onStart }: LandingScreenProps) {
  const { colors } = useTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [activeSkill, setActiveSkill] = useState<LandingSkill | null>(null);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [completedTopics, setCompletedTopics] = useState(0);
  const [totalTopics, setTotalTopics] = useState(46);
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);

  const refreshProgress = () => {
    getLocalProgress().then((p) => {
      if (p) {
        setCompletedTopics(p.completedTopics || 0);
        if (p.totalTopics > 0) setTotalTopics(p.totalTopics);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshProgress();
    AsyncStorage.getItem('@play/user_email').then((email) => {
      if (email) setLinkedEmail(email);
    }).catch(() => {});
  }, []);

  const handleRestoreSuccess = (result: RestoreResult) => {
    refreshProgress();
    setLinkedEmail(result.email);
    onStart('pairs');
  };

  const handlePagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH);
    setPageIndex(Math.max(0, Math.min(LANDING_SKILLS.length - 1, next)));
  };

  // Mode picker (was the old bottom CTA list) — shown once a skill card is
  // tapped. Same track/mode buttons as before, just gated behind the card.
  if (activeSkill) {
    return (
      <View style={styles.container}>
        <View style={styles.modePickerTop}>
          <Pressable onPress={() => setActiveSkill(null)} hitSlop={10} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.onSurface} />
            <Text style={[styles.backBtnText, { color: colors.onSurface }]}>{activeSkill.subtitle}</Text>
          </Pressable>
        </View>

        <View style={styles.bottom}>
          <View style={styles.trackList}>
            {TRACK_OPTIONS.map((option, i) => {
              const label = i === 0 && completedTopics > 0 ? 'Resume session' : option.label;
              return (
                <Pressable
                  key={option.track}
                  onPress={() => onStart(option.track)}
                  style={({ pressed }) => [
                    i === 0 ? styles.startBtn : styles.trackBtn,
                    pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <Text style={i === 0 ? styles.startBtnText : styles.trackBtnText}>
                    {i === 0 ? label.toUpperCase() : label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Skill pager — one bordered SkillCard per skill, swipeable */}
      <View style={styles.middle}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePagerScrollEnd}
          style={{ width: PAGE_WIDTH }}
        >
          {LANDING_SKILLS.map((skill) => (
            <View key={skill.id} style={{ width: PAGE_WIDTH }}>
              <SkillCard
                skill={skill}
                completedTopics={completedTopics}
                totalTopics={totalTopics}
                onPress={() => setActiveSkill(skill)}
              />
            </View>
          ))}
        </ScrollView>

        {LANDING_SKILLS.length > 1 ? (
          <View style={styles.dotsWrap}>
            <CarouselDots total={LANDING_SKILLS.length} index={pageIndex} />
          </View>
        ) : null}
      </View>

      {/* Existing user, login link — outside the card */}
      <View style={styles.bottom}>
        <Pressable
          onPress={() => setRestoreModalVisible(true)}
          hitSlop={10}
          style={styles.restoreLinkWrap}
        >
          <Text style={[styles.restoreLinkText, { color: colors.onSurfaceVariant || '#9CA3AF' }]}>
            {linkedEmail ? `Logged in as ${truncateEmailMiddle(linkedEmail)}` : 'Existing user, login'}
          </Text>
        </Pressable>
      </View>

      {/* Restore Account Modal */}
      <RestoreAccountModal
        visible={restoreModalVisible}
        onClose={() => setRestoreModalVisible(false)}
        onSuccess={handleRestoreSuccess}
        currentEmail={linkedEmail}
        onLoggedOut={() => setLinkedEmail(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.marginMobile,
    justifyContent: 'space-between',
  },
  modePickerTop: {
    paddingTop: Spacing.xxl,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    marginTop: Spacing.xl,
  },
  bottom: {
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  startBtn: {
    width: '100%',
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: '#56D8B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#10141A',
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  trackList: {
    width: '100%',
    gap: Spacing.sm,
  },
  trackBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: '#E5E7EB',
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  restoreLinkWrap: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  restoreLinkText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
