import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Same font files used natively via constants/typography.ts's `fontAssets`.
// Required here too (Node-side, web bundler only — +html.tsx never runs on
// native) so the web bundler resolves each to a public asset URL we can
// declare as a real @font-face below. This is what lets the browser
// discover and start fetching fonts from the very first HTML response,
// instead of only after the JS bundle loads and expo-font's runtime
// fetch kicks in — which is what was causing the visible fallback-font
// flash before the real typeface swapped in.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const soraRegular = require('../assets/fonts/Sora-Regular.ttf');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const soraMedium = require('../assets/fonts/Sora-Medium.ttf');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const soraSemiBold = require('../assets/fonts/Sora-SemiBold.ttf');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const soraBold = require('../assets/fonts/Sora-Bold.ttf');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const soraExtraBold = require('../assets/fonts/Sora-ExtraBold.ttf');

// Web-only HTML shell (runs at build/static-render time in Node — no DOM
// access, no providers here; that's _layout.tsx's job).
//
// This is where the "phone on desktop, full-bleed on mobile" behavior
// lives, in plain CSS instead of a JS resize listener:
//   - width and height are capped INDEPENDENTLY (never derived from one
//     another). On any real phone (<=430px wide, <=932px tall) both caps
//     are slack, so #root is just 100%x100% - true full-bleed, identical
//     to a native mobile page, with zero letterboxing.
//   - height uses 100dvh (falling back to 100vh for the ~5% of browsers
//     without dvh support), so it always reflects the real visible
//     viewport rather than the mobile-Safari "largest viewport" bug.
//   - only a window taller than 932px (a large phone's height) or wider
//     than 430px ever shows the dark backdrop, and even then only on the
//     axis that's actually oversized - never both, never a forced ratio.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/* Disables page-level bounce/scroll so RN's own ScrollViews behave
            like they do natively, matching how the app already worked
            before any of this web-shell work. */}
        <ScrollViewStyleReset />
        {/* High-priority fetch for all 5 weights, started in parallel with
            the JS bundle rather than discovered late by it. Combined size
            is ~280KB uncompressed (well under the point of diminishing
            returns for a preload), and every weight is used above the
            fold somewhere in the app (buttons, headings, body, labels). */}
        <link rel="preload" as="font" type="font/ttf" href={soraRegular} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href={soraMedium} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href={soraSemiBold} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href={soraBold} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href={soraExtraBold} crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: fontFaceStyle }} />
        <style dangerouslySetInnerHTML={{ __html: webShellStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Real @font-face rules, present in the HTML from the first byte —
// declared under the exact family names FontFamily.* already uses
// (constants/typography.ts), so every existing `fontFamily: 'Sora-Regular'`
// style just resolves correctly with zero code changes elsewhere.
//
// font-display: optional means: if a weight isn't ready within the
// browser's short block period (~100ms), don't wait and don't swap in
// later either — just keep the fallback for that paint. That trades "the
// exact right font, slightly late" for "never a visible swap", which is
// the right trade for a quiz app where a mid-session font pop is more
// jarring than a near-identical fallback. Because every weight is also
// preloaded above, in practice the real font is normally ready in time
// anyway.
const FALLBACK_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const fontFaceStyle = `
@font-face {
  font-family: 'Sora-Regular';
  src: url(${soraRegular}) format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Sora-Medium';
  src: url(${soraMedium}) format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Sora-SemiBold';
  src: url(${soraSemiBold}) format('truetype');
  font-weight: 600;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Sora-Bold';
  src: url(${soraBold}) format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Sora-ExtraBold';
  src: url(${soraExtraBold}) format('truetype');
  font-weight: 800;
  font-style: normal;
  font-display: optional;
}
/* Matched-metrics fallback for the brief window (if any) before a weight
   is ready, so layout doesn't jump when the real font does apply. */
body, #root {
  font-family: ${FALLBACK_STACK};
}
`;

const webShellStyle = `
html, body {
  height: 100%;
  margin: 0;
  background-color: #0B0D12;
}
#root {
  width: 100%;
  max-width: 430px;
  height: 100vh;
  height: 100dvh;
  max-height: 932px;
  margin-left: auto;
  margin-right: auto;
}
`;
