import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdSenseStatus = 'filled' | 'unfilled' | 'error';

interface AdSenseDisplayUnitProps {
  /** The AdSense ad-unit slot ID (data-ad-slot) — created in the AdSense
   *  dashboard under Ads > By ad unit, not derivable from the client ID
   *  alone. Renders nothing if not provided. */
  slotId?: string;
  /** Minimum height of the ad container while it loads, so the layout
   *  around it doesn't jump once the ad fills in. */
  height?: number;
  /** Reports whether the slot actually got a real ad. AdSense sets
   *  data-ad-status="filled"|"unfilled" on the <ins> once it resolves the
   *  request — observed here via MutationObserver rather than any push()
   *  callback, since plain AdSense units don't expose one. */
  onStatus?: (status: AdSenseStatus) => void;
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
 * flow that needs an ad at a specific moment.
 *
 * This is the FALLBACK reward path (see WatchingAdContent.tsx) — the
 * primary path is the real full-screen rewarded ad in lib/webRewardedAd.ts.
 * This only renders when that's unavailable.
 */
export function AdSenseDisplayUnit({ slotId, height = 250, onStatus }: AdSenseDisplayUnitProps) {
  const pushedRef = useRef(false);
  const insRef = useRef<HTMLModElement>(null);
  const clientId = process.env.EXPO_PUBLIC_ADSENSE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || !slotId || pushedRef.current) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      onStatus?.('error');
      return;
    }

    const el = insRef.current;
    if (!el || !onStatus) return;
    const observer = new MutationObserver(() => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled' || status === 'unfilled') {
        onStatus(status);
        observer.disconnect();
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, slotId]);

  if (!clientId || !slotId) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', minHeight: height }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
