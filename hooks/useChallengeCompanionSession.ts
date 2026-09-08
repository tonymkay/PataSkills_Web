import { useEffect, useState } from 'react';
import { getCompanionSessionSnapshot, subscribeCompanionSession, type CompanionSessionState } from '@/lib/challengeCompanionSession';

/**
 * Read-only subscription to the Companion session singleton
 * (lib/challengeCompanionSession.ts). The session itself is started/stopped
 * explicitly at the right lifecycle points (challenge-offline.tsx /
 * challenge-run.tsx / challenge-results.tsx) — this hook just re-renders
 * whichever screen is currently mounted when the state changes.
 * Ported from pataskillsv2's hooks/useCompanionSession.ts verbatim.
 */
export function useChallengeCompanionSession(): CompanionSessionState {
  const [snapshot, setSnapshot] = useState(getCompanionSessionSnapshot());
  useEffect(() => subscribeCompanionSession(() => setSnapshot(getCompanionSessionSnapshot())), []);
  return snapshot;
}
