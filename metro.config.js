const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's default assetExts includes ttf/otf but not woff/woff2, so the
// subsetted @font-face sources in app/+html.tsx fail to resolve without
// this. (https://github.com/facebook/metro/issues) — add them explicitly
// rather than relying on Metro to treat them as assets by default.
config.resolver.assetExts.push('woff', 'woff2');

module.exports = config;
