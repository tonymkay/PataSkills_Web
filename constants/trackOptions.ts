import {
  Shuffle,
  Tag,
  BookOpen,
  MapPin,
  GraduationCap,
  Eye,
  type LucideIcon,
} from 'lucide-react-native';
import { Track } from '@/lib/curriculum';

export interface TrackOption {
  track: Track;
  label: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the learning-mode list — consumed by the
 * initial LandingScreen mode picker AND the post-topic ModeSwitcherSheet,
 * so the two never drift out of sync.
 */
export const TRACK_OPTIONS: TrackOption[] = [
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
