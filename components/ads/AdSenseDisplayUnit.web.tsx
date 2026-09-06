import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSenseDisplayUnitProps {
  /** The AdSense ad-unit slot ID (data-ad-slot) — created in the AdSense
   *  dashboard under Ads > By ad unit, not derivable from the client ID
   *  alone. Renders nothing if not provided. */
  slotId?: string;
  /** Minimum height of the ad container while it loads, so the layout
   *  around it doesn't jump once the ad fills in. */
  height?: number;
}

/**
 * A single manually-placed AdSense display unit for web. Relies on the
 * adsbygoogle.js loader script already injected site-wide by
 * app/+html.tsx (keyed on EXPO_PUBLIC_ADSENSE_CLIENT_ID) — this component
 * only needs to render the <ins> placeholder and push one request for it.
 *
 * This is a real ad request, not an in-app "Auto ads" placement: Auto ads
 * place themselves wherever Google's algorithm picks and can't be
 * triggered on demand, which doesn't fit a "watch this to earn a reward"
 * flow (WatchAdPromptSheet) that needs an ad at a specific moment.
 */
export function AdSenseDisplayUnit({ slotId, height = 250 }: AdSenseDisplayUnitProps) {
  const pushedRef = useRef(false);
  const clientId = process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || !slotId || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers / failed script load throw here — the countdown in
      // WatchAdPromptSheet still runs regardless, so the reward flow
      // isn't blocked by an ad that fails to render.
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', minHeight: height }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
