// babel-preset-expo bundles the react-native-worklets/reanimated transform
// automatically, so the preset alone is enough for reanimated 4.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
