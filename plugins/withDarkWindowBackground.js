const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');
const { setStylesItem, getAppThemeGroup } = AndroidConfig.Styles;

/**
 * Sets android:windowBackground on AppTheme (the postSplashScreenTheme) to
 * @color/splashscreen_background (#161616 — same as the splash screen).
 *
 * Why: AppTheme extends Theme.AppCompat.DayNight, whose default
 * windowBackground is white. That's invisible on a normal cold launch
 * (expo-splash-screen's dark splash covers it, then JS renders instantly),
 * but Updates.reloadAsync() (our silent OTA-install path) recreates the
 * Activity using whatever theme is already active at that point, which is
 * AppTheme — so without this override you get a brief white flash every
 * time an update installs itself. This makes that flash read as dark
 * instead, matching the splash/app background.
 *
 * Regenerated on every `expo prebuild` (android/ is gitignored), so the fix
 * has to live here rather than be hand-edited into android/ directly.
 */
module.exports = function withDarkWindowBackground(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = setStylesItem({
      xml: config.modResults,
      parent: getAppThemeGroup(),
      item: {
        $: { name: 'android:windowBackground' },
        _: '@color/splashscreen_background',
      },
    });
    return config;
  });
};
