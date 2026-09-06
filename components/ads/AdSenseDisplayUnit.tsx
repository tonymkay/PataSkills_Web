import React from 'react';

export type AdSenseStatus = 'filled' | 'unfilled' | 'error';

/**
 * Native (Android/iOS) stub. AdSense display units are web-only — the
 * real implementation lives in AdSenseDisplayUnit.web.tsx and is picked
 * up automatically by Metro's platform extension resolution on web.
 * Native rewarded ads go through the separate AdMob path in lib/ads.ts.
 * This file exists purely so the import resolves cleanly for native
 * builds; it renders nothing.
 */
export function AdSenseDisplayUnit(_props: {
  slotId?: string;
  height?: number;
  onStatus?: (status: AdSenseStatus) => void;
}): null {
  return null;
}
