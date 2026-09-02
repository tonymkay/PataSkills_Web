import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
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
import { getPlayAssetPublicUrl } from '@/lib/supabase';
import { CurriculumCoverImagePaths } from '@/constants/curriculumAssets';

const CARD_MARGIN = Spacing.marginMobile;
// Bottom-sheet-style width cap (matches FeedbackSheet/RestoreAccountModal/etc.)
// so the landing screen doesn't stretch edge-to-edge on wide/desktop viewports.
const CONTENT_MAX_WIDTH = 480;

interface TrackOption {
  track: Track;
  label: string;
  icon: LucideIcon;
}

const TRACK_OPTIONS: TrackOption[] = [
  {
    track: 'pairs',
    label: 'Challenge yourself with pairs',
    icon: Shuffle,
  },
  {
    track: 'names',
    label: 'Learn sign names',
    icon: Tag,
  },
  {
    track: 'meanings',
    label: 'Learn what signs mean',
    icon: BookOpen,
  },
  {
    track: 'whereUsed',
    label: 'Learn where signs are used',
    icon: MapPin,
  },
  {
    track: 'full',
    label: 'Full course',
    icon: GraduationCap,
  },
  {
    track: 'reading',
    label: 'Reading mode — just browse the signs',
    icon: Eye,
  },
];

interface LandingScreenProps {
  onStart: (track: Track) => void;
}

export function LandingScreen({ onStart }: LandingScreenProps) {
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = Math.min(windowWidth, CONTENT_MAX_WIDTH) - CARD_MARGIN * 2;
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
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setPageIndex(Math.max(0, Math.min(LANDING_SKILLS.length - 1, next)));
  };

  // Mode picker — shown once a skill card is tapped. A proper page: back
  // row, heading, then one ModeCard per track/mode (replaces the old flat
  // pill-button list, which left the top of the screen empty).
  if (activeSkill) {
    const skillImageUri = getPlayAssetPublicUrl(CurriculumCoverImagePaths[activeSkill.id]);
    return (
      <View style={styles.screen}>
        <View style={[styles.container, styles.modePickerContainer]}>
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
              <View key={option.track}>
                {i > 0 && (
                  <View style={styles.connectorWrap}>
                    <View style={[styles.connector, { backgroundColor: colors.outlineVariant }]} />
                  </View>
                )}
                <ModeCard
                  icon={resume ? Play : option.icon}
                  imageUri={resume ? undefined : skillImageUri}
                  title={resume ? 'Resume session' : option.label}
                  highlighted={resume}
                  onPress={() => onStart(option.track)}
                />
              </View>
            );
          })}
        </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
      {/* Skill pager — one bordered SkillCard per skill, swipeable */}
      <View style={styles.middle}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePagerScrollEnd}
          style={{ width: pageWidth }}
        >
          {LANDING_SKILLS.map((skill) => (
            <View key={skill.id} style={{ width: pageWidth }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.xxl,
    justifyContent: 'space-between',
  },
  modePickerContainer: {
    paddingTop: Spacing.md,
  },
  modePickerTop: {
    paddingTop: 0,
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
    marginTop: Spacing.md,
  },
  modePickerSubheading: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  modeList: {
    flex: 1,
    marginTop: Spacing.md,
  },
  modeListContent: {
    paddingBottom: Spacing.lg,
  },
  connectorWrap: {
    alignItems: 'center',
  },
  connector: {
    width: 3,
    height: Spacing.md,
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
