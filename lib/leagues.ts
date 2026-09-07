/**
 * XP leagues (per Tony, 2026-07-05): pure lifetime-XP bands — no weekly resets
 * yet (future: weekly competitions with promotions/demotions). Learners are
 * promoted (and leave their old league) automatically the moment their XP
 * crosses a boundary; the leaderboard only shows learners in YOUR band.
 * 500-XP bands up to 5,000, then the open-ended top league.
 */

export interface LeagueTier {
  name: string;
  min: number;
  /** Exclusive upper bound; null = the open-ended top league. */
  max: number | null;
}

export const LEAGUES: LeagueTier[] = [
  { name: 'Quartz', min: 0, max: 500 },
  { name: 'Topaz', min: 500, max: 1000 },
  { name: 'Amber', min: 1000, max: 1500 },
  { name: 'Jade', min: 1500, max: 2000 },
  { name: 'Opal', min: 2000, max: 2500 },
  { name: 'Sapphire', min: 2500, max: 3000 },
  { name: 'Ruby', min: 3000, max: 3500 },
  { name: 'Emerald', min: 3500, max: 4000 },
  { name: 'Obsidian', min: 4000, max: 4500 },
  { name: 'Diamond', min: 4500, max: 5000 },
  { name: 'Legend', min: 5000, max: null },
];

export function leagueIndexFor(xp: number): number {
  const i = LEAGUES.findIndex((l) => xp >= l.min && (l.max === null || xp < l.max));
  return i === -1 ? 0 : i;
}

export function leagueFor(xp: number): LeagueTier {
  return LEAGUES[leagueIndexFor(xp)];
}

/** The next league up + the XP still needed ("Earn N more XP…"), or null at the top. */
export function nextLeague(xp: number): { tier: LeagueTier; needed: number } | null {
  const i = leagueIndexFor(xp);
  const next = LEAGUES[i + 1];
  return next ? { tier: next, needed: Math.max(0, next.min - xp) } : null;
}

/** Human band label for a tier: "Under 500 XP" / "500 – 1,000 XP" / "5,000+ XP". */
export function tierLabel(tier: LeagueTier): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (tier.min === 0) return `Under ${fmt(tier.max ?? 0)} XP`;
  if (tier.max === null) return `${fmt(tier.min)}+ XP`;
  return `${fmt(tier.min)} – ${fmt(tier.max)} XP`;
}
