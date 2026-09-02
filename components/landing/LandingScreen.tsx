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
import {
  ChevronLeft,
  Play,
  Shuffle,
  Tag,
  BookOpen,
  MapPin,
  GraduationCap,
  Eye,
  type LucideIcon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Spacing, Typography, FontFamily } from '@/theme/tokens';
import { SkillCard } from './SkillCard';
import { ModeCard } from './ModeCard';
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
  description: string;
  icon: LucideIcon;
}

const TRACK_OPTIONS: TrackOption[] = [
  {
    track: 'pairs',
    label: 'Challenge yourself with pairs',
    description: 'Match signs against each other under pressure',
    icon: Shuffle,
  },
  {
    track: 'names',
    label: 'Learn sign names',
    description: 'Quiz yourself on what each sign is called',
    icon: Tag,
  },
  {
    track: 'meanings',
    label: 'Learn what signs mean',
    description: 'Understand exactly what each sign is telling you',
    icon: BookOpen,
  },
  {
    track: 'whereUsed',
    label: 'Learn where signs are used',
    description: 'See where on the road each sign belongs',
    icon: MapPin,
  },
  {
    track: 'full',
    label: 'Full course',
    description: 'Every topic, in order, start to finish',
    icon: GraduationCap,
  },
  {
    track: 'reading',
    label: 'Reading mode — just browse the signs',
    description: 'Browse all the signs at your own pace',
    icon: Eye,
  },
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

  // Mode picker — shown once a skill card is tapped. A proper page: back
  // row, heading, then one ModeCard per track/mode (replaces the old flat
  // pill-button list, which left the top of the screen empty).
  if (activeSkill) {
    return (
      <View style={styles.container}>
        <View style={styles.modePickerTop}>
          <Pressable onPress={() => setActiveSkill(null)} hitSlop={10} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.onSurface} />
            <Text style={[styles.backBtnText, { color: colors.onSurface }]}>{activeSkill.subtitle}</Text>
          </Pressable>

          <Text style={[Typography.headlineMd, styles.modePickerHeading, { color: colors.onSurface }]}>
            Choose a mode
          </Text>
          <Text style={[styles.modePickerSubheading, { color: colors.onSurfaceVariant || '#9CA3AF' }]}>
            How do you want to practice {activeSkill.subtitle.toLowerCase()}?
          </Text>
        </View>

        <ScrollView
          style={styles.modeList}
          contentContainerStyle={styles.modeListContent}
          showsVerticalScrollIndicator={false}
        >
          {TRACK_OPTIONS.map((option, i) => {
            const resume = i === 0 && completedTopics > 0;
            return (
              <ModeCard
                key={option.track}
                icon={resume ? Play : option.icon}
                title={resume ? 'Resume session' : option.label}
                description={option.description}
                highlighted={resume}
                onPress={() => onStart(option.track)}
              />
            );
          })}
        </ScrollView>
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
    paddingTop: Spacing.xxl,
    justifyContent: 'space-between',
  },
  modePickerTop: {
    paddingTop: Spacing.md,
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
  modePickerHeading: {
    marginTop: Spacing.xl,
  },
  modePickerSubheading: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  modeList: {
    flex: 1,
    marginTop: Spacing.xl,
  },
  modeListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
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
