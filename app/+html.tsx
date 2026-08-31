import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
        <style dangerouslySetInnerHTML={{ __html: webShellStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

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
