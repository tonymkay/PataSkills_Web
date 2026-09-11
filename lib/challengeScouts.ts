/**
 * Scouts — fully OFFLINE stand-ins for absent real players in Online
 * Challenge search. Ported from pataskillsv2 lib/scouts.ts. Roster trimmed
 * to the original Kenya pool (~90) — enough to seat 6-12 without repeats
 * across a few races, without the old app's regional expansion.
 *
 * generateScoutChallenge() draws curricula from getCurriculaCatalog()
 * (Play has no downloaded-skill gate) and topics from getChallengeTopics().
 */
import { getCurriculaCatalog } from '@/lib/curriculaCatalog';
import { getChallengeTopics, makeRaceSeed } from '@/lib/challengeQuestions';
import { getLocalProgress } from '@/lib/progress';
import type { CurriculumSlug } from '@/constants/curriculumAssets';

export interface ScoutPlayer {
  deviceId: string;
  displayName: string;
  isCreator: boolean;
  currentQuestionIndex: number;
  finished: boolean;
  score: number;
  total: number;
  timeMs: number;
  finishOrder: number | null;
  rewardKeys: number;
  isBot: boolean;
}

export type ScoutSkillLevel = 'smart' | 'medium' | 'slow';
export type ScoutDifficulty = 'easy' | 'medium' | 'hard';

export interface ScoutPersona {
  id: string;
  name: string;
  isCreatorEligible: boolean;
  skillLevel: ScoutSkillLevel;
  accuracy: number;
  paceSeconds: number;
  paceJitter: number;
  difficulty: ScoutDifficulty;
}

const SCOUT_ID_PREFIX = 'scout-';

export const SCOUT_ROSTER: ScoutPersona[] = [
  // ── Creator-eligible (25) ────────────────────────────────────────────
  { id: 'brian-otieno', name: 'Brian Otieno', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.9, paceSeconds: 8.8, paceJitter: 1.4, difficulty: 'hard' },
  { id: 'faith-wanjiru', name: 'Faith Wanjiru', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.72, paceSeconds: 10.5, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'kevin-mutua', name: 'Kevin Mutua', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.5, paceSeconds: 13.5, paceJitter: 3.5, difficulty: 'easy' },
  { id: 'mercy-achieng', name: 'Mercy Achieng', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.68, paceSeconds: 11, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'dennis-kiptoo', name: 'Dennis Kiptoo', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.94, paceSeconds: 8.4, paceJitter: 1.2, difficulty: 'hard' },
  { id: 'collins-kamau', name: 'Collins Kamau', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.91, paceSeconds: 8.7, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'winnie-mwangi', name: 'Winnie Mwangi', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.73, paceSeconds: 10.4, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'patrick-kimani', name: 'Patrick Kimani', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.49, paceSeconds: 13.6, paceJitter: 3.4, difficulty: 'easy' },
  { id: 'judith-wachira', name: 'Judith Wachira', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.7, paceSeconds: 10.9, paceJitter: 2.3, difficulty: 'medium' },
  { id: 'erick-githinji', name: 'Erick Githinji', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.93, paceSeconds: 8.5, paceJitter: 1.2, difficulty: 'hard' },
  { id: 'nancy-kiplagat', name: 'Nancy Kiplagat', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.67, paceSeconds: 11.1, paceJitter: 2.5, difficulty: 'medium' },
  { id: 'felix-rono', name: 'Felix Rono', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.47, paceSeconds: 14, paceJitter: 3.7, difficulty: 'easy' },
  { id: 'ruth-korir', name: 'Ruth Korir', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.89, paceSeconds: 8.9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'moses-sang', name: 'Moses Sang', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.71, paceSeconds: 10.6, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'agnes-kosgei', name: 'Agnes Kosgei', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.53, paceSeconds: 13.1, paceJitter: 3.1, difficulty: 'easy' },
  { id: 'stephen-langat', name: 'Stephen Langat', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.95, paceSeconds: 8.3, paceJitter: 1.1, difficulty: 'hard' },
  { id: 'irene-bett', name: 'Irene Bett', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.69, paceSeconds: 11, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'elias-barasa', name: 'Elias Barasa', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.45, paceSeconds: 14.3, paceJitter: 3.9, difficulty: 'easy' },
  { id: 'diana-simiyu', name: 'Diana Simiyu', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.87, paceSeconds: 9.1, paceJitter: 1.6, difficulty: 'hard' },
  { id: 'titus-wanyama', name: 'Titus Wanyama', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.74, paceSeconds: 10.2, paceJitter: 2, difficulty: 'medium' },
  { id: 'sarah-nafula', name: 'Sarah Nafula', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.51, paceSeconds: 13.4, paceJitter: 3.3, difficulty: 'easy' },
  { id: 'vincent-nekesa', name: 'Vincent Nekesa', isCreatorEligible: true, skillLevel: 'smart', accuracy: 0.9, paceSeconds: 8.8, paceJitter: 1.4, difficulty: 'hard' },
  { id: 'rose-masinde', name: 'Rose Masinde', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.66, paceSeconds: 11.3, paceJitter: 2.6, difficulty: 'medium' },
  { id: 'frank-wamalwa', name: 'Frank Wamalwa', isCreatorEligible: true, skillLevel: 'slow', accuracy: 0.48, paceSeconds: 13.9, paceJitter: 3.6, difficulty: 'easy' },
  { id: 'catherine-khisa', name: 'Catherine Khisa', isCreatorEligible: true, skillLevel: 'medium', accuracy: 0.72, paceSeconds: 10.5, paceJitter: 2.1, difficulty: 'medium' },

  // ── Non-creator (65) ─────────────────────────────────────────────────
  { id: 'grace-nyambura', name: 'Grace Nyambura', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.7, paceSeconds: 10.8, paceJitter: 2.3, difficulty: 'medium' },
  { id: 'peter-wafula', name: 'Peter Wafula', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.46, paceSeconds: 14, paceJitter: 3.8, difficulty: 'easy' },
  { id: 'susan-chebet', name: 'Susan Chebet', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.88, paceSeconds: 9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'james-njoroge', name: 'James Njoroge', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.65, paceSeconds: 11.2, paceJitter: 2.5, difficulty: 'medium' },
  { id: 'ann-muthoni', name: 'Ann Muthoni', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.52, paceSeconds: 13, paceJitter: 3.2, difficulty: 'easy' },
  { id: 'michael-odhiambo', name: 'Michael Odhiambo', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.91, paceSeconds: 8.6, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'lucy-wekesa', name: 'Lucy Wekesa', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.74, paceSeconds: 10.3, paceJitter: 2.1, difficulty: 'medium' },
  { id: 'samuel-kariuki', name: 'Samuel Kariuki', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.44, paceSeconds: 14.5, paceJitter: 4, difficulty: 'easy' },
  { id: 'esther-akinyi', name: 'Esther Akinyi', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.69, paceSeconds: 11, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'joseph-waweru', name: 'Joseph Waweru', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.86, paceSeconds: 9.2, paceJitter: 1.6, difficulty: 'hard' },
  { id: 'caroline-njeri', name: 'Caroline Njeri', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.48, paceSeconds: 13.8, paceJitter: 3.6, difficulty: 'easy' },
  { id: 'daniel-omondi', name: 'Daniel Omondi', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.71, paceSeconds: 10.6, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'purity-wambui', name: 'Purity Wambui', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.93, paceSeconds: 8.5, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'victor-cherono', name: 'Victor Cherono', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.5, paceSeconds: 13.2, paceJitter: 3.3, difficulty: 'easy' },
  { id: 'beatrice-auma', name: 'Beatrice Auma', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.66, paceSeconds: 11.4, paceJitter: 2.6, difficulty: 'medium' },
  { id: 'emmanuel-onyango', name: 'Emmanuel Onyango', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.88, paceSeconds: 9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'joyce-owino', name: 'Joyce Owino', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.68, paceSeconds: 11, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'bernard-ochieng', name: 'Bernard Ochieng', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.46, paceSeconds: 14.1, paceJitter: 3.8, difficulty: 'easy' },
  { id: 'alice-ogutu', name: 'Alice Ogutu', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.71, paceSeconds: 10.7, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'cyrus-oyoo', name: 'Cyrus Oyoo', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.92, paceSeconds: 8.6, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'millicent-adhiambo', name: 'Millicent Adhiambo', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.5, paceSeconds: 13.3, paceJitter: 3.3, difficulty: 'easy' },
  { id: 'duncan-anyango', name: 'Duncan Anyango', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.65, paceSeconds: 11.4, paceJitter: 2.6, difficulty: 'medium' },
  { id: 'rehema-awuor', name: 'Rehema Awuor', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.86, paceSeconds: 9.2, paceJitter: 1.6, difficulty: 'hard' },
  { id: 'geoffrey-okinyi', name: 'Geoffrey Okinyi', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.44, paceSeconds: 14.4, paceJitter: 3.9, difficulty: 'easy' },
  { id: 'winfred-mumo', name: 'Winfred Mumo', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.73, paceSeconds: 10.4, paceJitter: 2.1, difficulty: 'medium' },
  { id: 'anthony-musyoka', name: 'Anthony Musyoka', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.94, paceSeconds: 8.4, paceJitter: 1.2, difficulty: 'hard' },
  { id: 'consolata-kioko', name: 'Consolata Kioko', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.67, paceSeconds: 11.1, paceJitter: 2.5, difficulty: 'medium' },
  { id: 'hillary-nzomo', name: 'Hillary Nzomo', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.52, paceSeconds: 13, paceJitter: 3.2, difficulty: 'easy' },
  { id: 'everlyne-wambua', name: 'Everlyne Wambua', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.7, paceSeconds: 10.8, paceJitter: 2.3, difficulty: 'medium' },
  { id: 'nicholas-kilonzo', name: 'Nicholas Kilonzo', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.89, paceSeconds: 8.9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'loise-muli', name: 'Loise Muli', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.47, paceSeconds: 13.7, paceJitter: 3.5, difficulty: 'easy' },
  { id: 'charles-ndolo', name: 'Charles Ndolo', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.66, paceSeconds: 11.2, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'doreen-kyalo', name: 'Doreen Kyalo', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.91, paceSeconds: 8.7, paceJitter: 1.4, difficulty: 'hard' },
  { id: 'boniface-ngei', name: 'Boniface Ngei', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.49, paceSeconds: 13.6, paceJitter: 3.4, difficulty: 'easy' },
  { id: 'zipporah-mbugua', name: 'Zipporah Mbugua', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.69, paceSeconds: 11, paceJitter: 2.3, difficulty: 'medium' },
  { id: 'edwin-karanja', name: 'Edwin Karanja', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.87, paceSeconds: 9.1, paceJitter: 1.6, difficulty: 'hard' },
  { id: 'priscilla-ndungu', name: 'Priscilla Ndungu', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.45, paceSeconds: 14.2, paceJitter: 3.8, difficulty: 'easy' },
  { id: 'martin-wairimu', name: 'Martin Wairimu', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.72, paceSeconds: 10.5, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'redempta-njuguna', name: 'Redempta Njuguna', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.93, paceSeconds: 8.5, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'amos-maina', name: 'Amos Maina', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.51, paceSeconds: 13.2, paceJitter: 3.2, difficulty: 'easy' },
  { id: 'christine-gitau', name: 'Christine Gitau', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.64, paceSeconds: 11.5, paceJitter: 2.7, difficulty: 'medium' },
  { id: 'simon-kagiri', name: 'Simon Kagiri', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.9, paceSeconds: 8.8, paceJitter: 1.4, difficulty: 'hard' },
  { id: 'lilian-waititu', name: 'Lilian Waititu', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.48, paceSeconds: 13.8, paceJitter: 3.6, difficulty: 'easy' },
  { id: 'george-muriithi', name: 'George Muriithi', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.75, paceSeconds: 10.1, paceJitter: 2, difficulty: 'medium' },
  { id: 'monica-gathoni', name: 'Monica Gathoni', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.85, paceSeconds: 9.3, paceJitter: 1.7, difficulty: 'hard' },
  { id: 'kelvin-wangari', name: 'Kelvin Wangari', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.43, paceSeconds: 14.5, paceJitter: 4, difficulty: 'easy' },
  { id: 'teresia-nyaga', name: 'Teresia Nyaga', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.68, paceSeconds: 11.1, paceJitter: 2.4, difficulty: 'medium' },
  { id: 'robert-ngugi', name: 'Robert Ngugi', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.92, paceSeconds: 8.6, paceJitter: 1.3, difficulty: 'hard' },
  { id: 'damaris-warui', name: 'Damaris Warui', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.5, paceSeconds: 13.5, paceJitter: 3.3, difficulty: 'easy' },
  { id: 'fredrick-waithaka', name: 'Fredrick Waithaka', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.71, paceSeconds: 10.6, paceJitter: 2.2, difficulty: 'medium' },
  { id: 'josephine-kabura', name: 'Josephine Kabura', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.88, paceSeconds: 9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'isaac-ndegwa', name: 'Isaac Ndegwa', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.46, paceSeconds: 14, paceJitter: 3.7, difficulty: 'easy' },
  { id: 'winny-kinyua', name: 'Winny Kinyua', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.73, paceSeconds: 10.3, paceJitter: 2.1, difficulty: 'medium' },
  { id: 'erastus-mureithi', name: 'Erastus Mureithi', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.95, paceSeconds: 8.3, paceJitter: 1.1, difficulty: 'hard' },
  { id: 'beryl-ithagi', name: 'Beryl Ithagi', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.52, paceSeconds: 13.1, paceJitter: 3.1, difficulty: 'easy' },
  { id: 'timothy-kamau', name: 'Timothy Kamau', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.66, paceSeconds: 11.3, paceJitter: 2.5, difficulty: 'medium' },
  { id: 'salome-mwangi', name: 'Salome Mwangi', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.86, paceSeconds: 9.2, paceJitter: 1.6, difficulty: 'hard' },
  { id: 'wycliffe-kimani', name: 'Wycliffe Kimani', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.44, paceSeconds: 14.3, paceJitter: 3.9, difficulty: 'easy' },
  { id: 'margaret-wachira', name: 'Margaret Wachira', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.7, paceSeconds: 10.9, paceJitter: 2.3, difficulty: 'medium' },
  { id: 'enock-githinji', name: 'Enock Githinji', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.91, paceSeconds: 8.7, paceJitter: 1.4, difficulty: 'hard' },
  { id: 'naomi-kiplagat', name: 'Naomi Kiplagat', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.49, paceSeconds: 13.4, paceJitter: 3.4, difficulty: 'easy' },
  { id: 'bramwel-rono', name: 'Bramwel Rono', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.67, paceSeconds: 11.2, paceJitter: 2.5, difficulty: 'medium' },
  { id: 'florence-korir', name: 'Florence Korir', isCreatorEligible: false, skillLevel: 'smart', accuracy: 0.89, paceSeconds: 8.9, paceJitter: 1.5, difficulty: 'hard' },
  { id: 'ken-sang', name: 'Ken Sang', isCreatorEligible: false, skillLevel: 'slow', accuracy: 0.53, paceSeconds: 12.9, paceJitter: 3, difficulty: 'easy' },
  { id: 'immaculate-kosgei', name: 'Immaculate Kosgei', isCreatorEligible: false, skillLevel: 'medium', accuracy: 0.72, paceSeconds: 10.4, paceJitter: 2.1, difficulty: 'medium' },
];

export function getScoutRoster(): ScoutPersona[] {
  return SCOUT_ROSTER;
}

export function getScoutPersona(id: string): ScoutPersona | null {
  return SCOUT_ROSTER.find((s) => s.id === id) ?? null;
}

export function isScoutId(deviceId: string): boolean {
  return deviceId.startsWith(SCOUT_ID_PREFIX);
}

export function scoutDeviceId(personaId: string): string {
  return `${SCOUT_ID_PREFIX}${personaId}`;
}

export interface ScoutRunHandle {
  cancel: () => void;
}

export interface ScoutRunCallbacks {
  onProgress: (currentQuestionIndex: number, liveScore: number) => void;
  onFinish: (result: ScoutPlayer & { isBot: true }) => void;
}

export function simulateScoutRun(
  persona: ScoutPersona,
  questionCount: number,
  callbacks: ScoutRunCallbacks,
  deadlineMs?: number,
): ScoutRunHandle {
  const deviceId = scoutDeviceId(persona.id);
  const startedAt = Date.now();
  let answered = 0;
  let score = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  let done = false;

  const finish = () => {
    if (done || cancelled) return;
    done = true;
    if (timer) clearTimeout(timer);
    if (deadlineTimer) clearTimeout(deadlineTimer);
    const timeMs = Date.now() - startedAt;
    callbacks.onFinish({
      deviceId,
      displayName: persona.name,
      isCreator: false,
      currentQuestionIndex: answered,
      finished: true,
      score,
      total: questionCount,
      timeMs,
      finishOrder: null,
      rewardKeys: 0,
      isBot: true,
    });
  };

  const nextDelayMs = () => {
    const jitter = (Math.random() * 2 - 1) * persona.paceJitter;
    const seconds = Math.max(0.6, persona.paceSeconds + jitter);
    return seconds * 1000;
  };

  const tick = () => {
    if (cancelled || done) return;
    answered += 1;
    if (Math.random() < persona.accuracy) score += 1;
    callbacks.onProgress(answered, score);
    if (answered >= questionCount) {
      finish();
      return;
    }
    timer = setTimeout(tick, nextDelayMs());
  };

  timer = setTimeout(tick, nextDelayMs());
  if (deadlineMs != null) deadlineTimer = setTimeout(finish, deadlineMs);

  return {
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
    },
  };
}

export interface ScoutChallenge {
  challengeId: string;
  curriculumSlug: CurriculumSlug;
  curriculumTitle: string;
  topicIndex: number | null;
  topicTitle: string;
  creatorScout: ScoutPersona;
  waitingScouts: ScoutPersona[];
  seed: number;
  questionCount: number;
  difficulty: ScoutDifficulty;
}

const MIN_ROSTER = 6;
const MAX_ROSTER = 12;

function pickBiasedTopicIndex(topicCount: number, completed: number): number {
  const undone: number[] = [];
  const done: number[] = [];
  for (let i = 0; i < topicCount; i++) (i >= completed ? undone : done).push(i);
  const pool = undone.length > 0 ? [...undone, ...undone, ...undone, ...undone, ...done] : done;
  if (pool.length === 0) return 0;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickCreatorScout(): ScoutPersona {
  const eligible = SCOUT_ROSTER.filter((s) => s.isCreatorEligible);
  return eligible[Math.floor(Math.random() * eligible.length)];
}

function pickOtherScouts(excludeId: string, count: number): ScoutPersona[] {
  const pool = SCOUT_ROSTER.filter((s) => s.id !== excludeId);
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function pickRandomScouts(count: number, excludeIds: string[] = []): ScoutPersona[] {
  const exclude = new Set(excludeIds);
  const pool = SCOUT_ROSTER.filter((s) => !exclude.has(s.id));
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function generateScoutChallenge(filterSlug?: CurriculumSlug): Promise<ScoutChallenge | null> {
  const catalog = await getCurriculaCatalog();
  const candidates = filterSlug ? catalog.filter((c) => c.slug === filterSlug) : catalog;
  if (candidates.length === 0) return null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const curriculum = candidates[Math.floor(Math.random() * candidates.length)];
    const topics = await getChallengeTopics(curriculum.slug as CurriculumSlug);
    if (topics.length === 0) continue;

    const progress = await getLocalProgress(curriculum.slug);
    const topicIndex = pickBiasedTopicIndex(topics.length, progress.completedTopics);
    const topic = topics[topicIndex];

    const creatorScout = pickCreatorScout();
    const rosterSize = MIN_ROSTER + Math.floor(Math.random() * (MAX_ROSTER - MIN_ROSTER + 1));
    const waitingScouts = pickOtherScouts(creatorScout.id, rosterSize - 1);

    // Scouts simulate their own "total" independently of the real quiz
    // (there's no DB row backing them), so this has to match exactly what
    // buildChallengeQuestions() will actually serve the human for this
    // same topic: Math.min(requestedCount, pool.length) — see
    // lib/challengeQuestions.ts. Previously this was hardcoded to 10
    // regardless of how many real questions the picked topic had, so a
    // topic with fewer than 10 questions left the human racing on a
    // smaller real total than the scouts' simulated one.
    const desiredQuestionCount = 10;
    const questionCount = Math.min(desiredQuestionCount, topic.questions.length);

    return {
      challengeId: `scout-challenge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      curriculumSlug: curriculum.slug as CurriculumSlug,
      curriculumTitle: curriculum.title,
      topicIndex,
      topicTitle: topic.title,
      creatorScout,
      waitingScouts,
      seed: makeRaceSeed(),
      questionCount,
      difficulty: creatorScout.difficulty,
    };
  }
  return null;
}

export function isScoutChallengeId(challengeId: string): boolean {
  return challengeId.startsWith('scout-challenge-');
}
