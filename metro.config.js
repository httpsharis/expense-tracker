const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };
  
  config.resolver = {
    ...resolver,
    // Ensure 'svg' is removed from assetExts, but standard formats like 'png' remain untouched
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    extraNodeModules: {
      ...resolver.extraNodeModules,
      'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
    },
  };

  return withNativeWind(config, { input: './app/global.css' });
})();
