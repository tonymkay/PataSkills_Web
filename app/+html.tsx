import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
import { fontAssets, fontAssetsWebWoff2, FontFamily } from '../constants/typography';
import { CurriculumCoverImagePaths } from '../constants/curriculumAssets';

// Same public-URL shape as lib/supabase.ts's getPlayAssetPublicUrl, built
// directly from the env var here instead of importing the Supabase client
// itself — this file runs at static-HTML-generation time, and pulling in
// the full client (AsyncStorage, GoTrue, etc.) here would be unnecessary
// weight for what's just a deterministic string.
const SUPABASE_URL = process.env.EXPO_PUBLIC_PATASKILLS_SUPABASE_URL ?? '';
const drivingTheoryCoverImageUrl = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/play-assets/${CurriculumCoverImagePaths['driving-theory']}`
  : null;

// Full-weight .ttf files plus their subsetted .woff2 counterparts (generated
// by glyphhanger + fonttools, stripped to just the ASCII range this app
// actually uses — ~56KB each down to ~10KB each). Both come from
// constants/typography.ts rather than being required inline here: that file
// is also imported by app/_layout.tsx (client-side), which is what makes
// Metro treat these as real bundled assets and copy them into dist/ during
// web export — requiring them only from this file (server-only, used to
// produce the static HTML shell) is not enough, since Metro only persists
// assets that end up in the client bundle.
// woff2 is the primary @font-face source (smaller → faster to fetch), ttf
// is listed second as a fallback for the small sliver of browsers without
// woff2 support — the browser tries sources in order and stops at the
// first it can use, so modern browsers never touch the ttf at all.
const soraRegularWoff2 = fontAssetsWebWoff2[FontFamily.regular];
const soraRegular = fontAssets[FontFamily.regular];
const soraMediumWoff2 = fontAssetsWebWoff2[FontFamily.medium];
const soraMedium = fontAssets[FontFamily.medium];
const soraSemiBoldWoff2 = fontAssetsWebWoff2[FontFamily.semiBold];
const soraSemiBold = fontAssets[FontFamily.semiBold];
const soraBoldWoff2 = fontAssetsWebWoff2[FontFamily.bold];
const soraBold = fontAssets[FontFamily.bold];
const soraExtraBoldWoff2 = fontAssetsWebWoff2[FontFamily.extraBold];
const soraExtraBold = fontAssets[FontFamily.extraBold];

// Web-only HTML shell (runs at build/static-render time in Node — no DOM
// access, no providers here; that's _layout.tsx's job).
//
// This is where the "phone on desktop, full-bleed on mobile" behavior
// lives, in plain CSS instead of a JS resize listener:
//   - width and height are capped INDEPENDENTLY (never derived from one
//     another). On any real phone (<=430px wide, <=932px tall) both caps
//     are slack, so #root is just 100%x100% - true full-bleed, identical
//     to a native mobile page, with zero letterboxing.
//   - height uses 100svh (falling back to 100vh for the sliver of
//     browsers without svh support). NOT 100dvh: on Android Chrome/Brave,
//     dvh reports the large (toolbar-retracted) viewport on first paint
//     and only corrects after the first scroll, cutting off bottom-sheet
//     content (CTA button, dots) until the user scrolls once. svh pins to
//     the small (toolbar-visible) viewport from the first frame instead —
//     nothing is ever hidden below the fold, at the cost of some unused
//     background once the toolbar retracts.
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
        {/* High-priority fetch for all 5 weights' woff2 (the primary,
            subsetted source — combined ~51KB vs ~290KB for the full ttf
            set), started in parallel with the JS bundle rather than
            discovered late by it. Every weight is used above the fold
            somewhere in the app (buttons, headings, body, labels). */}
        <link rel="preload" as="font" type="font/woff2" href={soraRegularWoff2} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href={soraMediumWoff2} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href={soraSemiBoldWoff2} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href={soraBoldWoff2} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href={soraExtraBoldWoff2} crossOrigin="anonymous" />
        {drivingTheoryCoverImageUrl && (
          <link rel="preload" as="image" type="image/webp" href={drivingTheoryCoverImageUrl} />
        )}
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
// font-display: swap means: paint with the fallback immediately, then
// swap to the real font the moment it's ready — no block period, no risk
// of silently keeping the fallback forever. We tried `optional` first
// (paint with fallback, swap only within a very short ~100ms window,
// otherwise keep the fallback for the rest of that page view even if the
// font finishes loading a moment later) but it proved too aggressive in
// practice: on real loads the swap window kept expiring before the font
// was ready, so the custom font just never appeared. `swap` guarantees
// the real font is used as soon as it's available, at the cost of a
// brief flash of fallback text on a cold cache — a better trade than a
// brand font that silently never shows up.
const FALLBACK_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const fontFaceStyle = `
@font-face {
  font-family: 'Sora-Regular';
  src: url(${soraRegularWoff2}) format('woff2'), url(${soraRegular}) format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Sora-Medium';
  src: url(${soraMediumWoff2}) format('woff2'), url(${soraMedium}) format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Sora-SemiBold';
  src: url(${soraSemiBoldWoff2}) format('woff2'), url(${soraSemiBold}) format('truetype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Sora-Bold';
  src: url(${soraBoldWoff2}) format('woff2'), url(${soraBold}) format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Sora-ExtraBold';
  src: url(${soraExtraBoldWoff2}) format('woff2'), url(${soraExtraBold}) format('truetype');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
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
  height: 100svh;
  max-height: 932px;
  margin-left: auto;
  margin-right: auto;
}
`;
