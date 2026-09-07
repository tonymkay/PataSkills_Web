import { StaticColors } from '@/constants/colors';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getStoredEmail } from '@/lib/email';
import { getTotalXp } from '@/lib/xp';
import { leagueFor, tierLabel, type LeagueTier } from '@/lib/leagues';

export type { LeagueTier };

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  xp: number;
  isCurrentUser: boolean;
  imageUrl?: string | null;
  dot?: 'done' | 'frozen' | 'none' | null;
}

export interface LeaderboardData {
  tier: LeagueTier;
  subtitle: string;
  entries: LeaderboardEntry[];
}

const AVATAR_PALETTE = StaticColors.avatarPalette;

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function emptyLeaderboard(myXp = 0): LeaderboardData {
  const tier = leagueFor(myXp);
  return { tier, subtitle: tierLabel(tier), entries: [] };
}

// Deterministic mock peer pool to ensure every league feels populated
// even before dozens of users populate Supabase.
const PEER_NAMES = [
  'Amina K.', 'David M.', 'Sarah O.', 'Brian N.', 'Grace W.',
  'Kevin T.', 'Mercy J.', 'Daniel R.', 'Faith C.', 'Samuel E.',
  'Esther L.', 'Victor K.', 'Joy M.', 'Emmanuel P.', 'Beatrice N.',
  'Dennis K.', 'Rachel S.', 'Collins O.', 'Naomi W.', 'Peter G.',
];

function generatePeerEntries(tier: LeagueTier, myXp: number, myName: string): LeaderboardEntry[] {
  const minXp = tier.min;
  const maxXp = tier.max ? tier.max - 1 : minXp + 600;
  const spread = maxXp - minXp;

  // Generate 8-12 peers in this tier
  const count = 10;
  const peers: { id: string; name: string; xp: number; isCurrentUser: boolean }[] = [];

  for (let i = 0; i < count; i++) {
    const name = PEER_NAMES[(i * 3 + tier.min) % PEER_NAMES.length];
    // Spread XP evenly throughout the tier
    const frac = 0.1 + (i / count) * 0.85;
    const xp = Math.round(minXp + spread * frac);
    peers.push({
      id: `peer-${tier.name}-${i}`,
      name,
      xp,
      isCurrentUser: false,
    });
  }

  // Add current user if within this tier
  const inBand = myXp >= tier.min && (tier.max === null || myXp < tier.max);
  if (inBand) {
    peers.push({
      id: 'current-user',
      name: myName,
      xp: myXp,
      isCurrentUser: true,
    });
  }

  // Sort descending by XP
  peers.sort((a, b) => b.xp - a.xp);

  // Assign standard competition ranks
  let rank = 0;
  let prevXp = -1;
  return peers.map((p, i) => {
    if (p.xp !== prevXp) {
      rank = i + 1;
      prevXp = p.xp;
    }
    return {
      ...p,
      rank,
      dot: i % 3 === 0 ? 'done' : i % 3 === 1 ? 'none' : 'frozen',
    };
  });
}

/**
 * Fetch leaderboard for the learner's own current league.
 */
export async function fetchLeaderboard(myXp: number): Promise<LeaderboardData> {
  const tier = leagueFor(myXp);
  return fetchLeagueBoard(tier, myXp);
}

/**
 * Fetch leaderboard for an arbitrary league tier (e.g. previewing via LeagueSheet).
 */
export async function fetchLeagueBoard(tier: LeagueTier, myXp: number): Promise<LeaderboardData> {
  const email = await getStoredEmail().catch(() => null);
  const myName = email ? email.split('@')[0] : 'Learner';

  const base: LeaderboardData = {
    tier,
    subtitle: tierLabel(tier),
    entries: [],
  };

  // If Supabase is configured, try querying remote records
  if (isSupabaseConfigured) {
    try {
      const minXp = tier.min;
      const maxXp = tier.max ?? 9999999;

      const { data, error } = await supabase
        .from('play_user_stats')
        .select('email, active_days_count, updated_at')
        .limit(50);

      if (!error && data && data.length > 0) {
        // If Supabase has users, map them
        const list: LeaderboardEntry[] = data.map((d, i) => {
          const isMe = email && d.email === email;
          const xp = isMe ? myXp : Math.max(minXp, (d.active_days_count || 1) * 35);
          return {
            id: d.email || `user-${i}`,
            rank: i + 1,
            name: d.email ? d.email.split('@')[0] : `Learner ${i + 1}`,
            xp,
            isCurrentUser: !!isMe,
            dot: 'done',
          };
        });

        // Ensure current user is in the list
        if (email && !list.some((e) => e.isCurrentUser)) {
          const inBand = myXp >= tier.min && (tier.max === null || myXp < tier.max);
          if (inBand) {
            list.push({
              id: email,
              rank: 0,
              name: myName,
              xp: myXp,
              isCurrentUser: true,
              dot: 'done',
            });
          }
        }

        list.sort((a, b) => b.xp - a.xp);
        let rank = 0;
        let prevXp = -1;
        base.entries = list.map((item, i) => {
          if (item.xp !== prevXp) {
            rank = i + 1;
            prevXp = item.xp;
          }
          return { ...item, rank };
        });

        return base;
      }
    } catch {}
  }

  // Fallback to rich deterministic tier peer board
  base.entries = generatePeerEntries(tier, myXp, myName);
  return base;
}
