import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { getMyChallengeStories, getOpenGlobalChallenges, joinGlobalChallenge, type ChallengeStory, type OpenGlobalChallenge } from '@/lib/challenges';
import { generateScoutChallenge, isScoutChallengeId, type ScoutChallenge } from '@/lib/challengeScouts';
import { useOnline } from '@/hooks/useOnline';

export type ChallengeSearchPhase = 'idle' | 'searching';

export function useChallengeSearch(
  entryOrigin: 'home' | 'challenge-corner' = 'challenge-corner',
  onJoined?: (challengeId: string, curriculumSlug: string) => void,
) {
  const router = useRouter();
  const online = useOnline();

  const [myChallenges, setMyChallenges] = useState<ChallengeStory[]>([]);
  const refreshMyChallenges = useCallback(async () => {
    setMyChallenges(await getMyChallengeStories());
  }, []);

  const myWaitingChallenge = myChallenges.find((c) => c.isCreator && c.status === 'waiting') ?? null;

  const [phase, setPhase] = useState<ChallengeSearchPhase>('idle');
  const [openChallenges, setOpenChallenges] = useState<OpenGlobalChallenge[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scoutChallenge, setScoutChallenge] = useState<ScoutChallenge | null>(null);
  const scoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScoutTimer = useCallback(() => {
    if (scoutTimerRef.current) clearTimeout(scoutTimerRef.current);
    scoutTimerRef.current = null;
  }, []);

  const stopSearching = useCallback(() => {
    setPhase('idle');
    setOpenChallenges([]);
    setScoutChallenge(null);
    clearScoutTimer();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, [clearScoutTimer]);

  const startSearching = useCallback(() => {
    setPhase('searching');
    setScoutChallenge(null);
    const tick = () => void getOpenGlobalChallenges().then(setOpenChallenges);
    tick();
    pollRef.current = setInterval(tick, 4000);
    clearScoutTimer();
    const injectionDelayMs = 5000 + Math.random() * 15000;
    scoutTimerRef.current = setTimeout(() => {
      if (!online) return;
      setOpenChallenges((current) => {
        if (current.length === 0) {
          void generateScoutChallenge().then((c) => { if (c) setScoutChallenge(c); }).catch(() => {});
        }
        return current;
      });
    }, injectionDelayMs);
  }, [clearScoutTimer, online]);

  const mergedOpenChallenges: OpenGlobalChallenge[] =
    openChallenges.length > 0
      ? openChallenges
      : scoutChallenge
        ? [{
            challengeId: scoutChallenge.challengeId,
            curriculumSlug: scoutChallenge.curriculumSlug,
            creatorName: scoutChallenge.creatorScout.name,
            joinedCount: 1,
            deadlineAt: null,
          }]
        : [];

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (scoutTimerRef.current) clearTimeout(scoutTimerRef.current);
  }, []);

  const [joining, setJoining] = useState(false);
  const joinChallenge = useCallback(
    async (challengeId: string) => {
      if (joining) return;
      if (isScoutChallengeId(challengeId)) {
        const slug = scoutChallenge?.curriculumSlug;
        stopSearching();
        router.push({ pathname: '/challenge-scout-room', params: { ...(slug ? { slug } : {}), origin: entryOrigin } });
        return;
      }
      setJoining(true);
      try {
        const result = await joinGlobalChallenge(challengeId);
        if (result === 'closed') return;
        const g = openChallenges.find((c) => c.challengeId === challengeId);
        const slug = g?.curriculumSlug ?? '';
        stopSearching();
        if (onJoined) onJoined(challengeId, slug);
        else router.push({ pathname: '/challenge-online', params: { challengeId, slug, origin: entryOrigin } });
      } catch {
        /* keep searching */
      } finally {
        setJoining(false);
      }
    },
    [joining, router, stopSearching, scoutChallenge, openChallenges, entryOrigin, onJoined],
  );

  return {
    online,
    myWaitingChallenge,
    refreshMyChallenges,
    phase,
    openChallenges: mergedOpenChallenges,
    joining,
    startSearching,
    stopSearching,
    joinChallenge,
  };
}
