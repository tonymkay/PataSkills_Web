import { useEffect, useState } from 'react';
import { getScoutSessionSnapshot, subscribeScoutSession, type ScoutSessionState } from '@/lib/challengeScoutSession';

export function useChallengeScoutSession(): ScoutSessionState {
  const [snapshot, setSnapshot] = useState(getScoutSessionSnapshot());
  useEffect(() => subscribeScoutSession(() => setSnapshot(getScoutSessionSnapshot())), []);
  return snapshot;
}
