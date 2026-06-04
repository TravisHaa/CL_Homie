const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.cacheVersion = '1.0';

const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// Inject our custom polyfills so they run BEFORE React Native's core init
// (setUpDefaultReactNativeEnvironment). This is the only place early enough to
// define web globals (e.g. DOMException) that RN's own AbortController setup
// and other web-oriented libraries depend on.
const baseGetPolyfills = config.serializer && config.serializer.getPolyfills;
config.serializer = {
  ...config.serializer,
  getPolyfills: (options) => {
    const basePolyfills = baseGetPolyfills ? baseGetPolyfills(options) : [];
    return [require.resolve('./src/globalPolyfills.js'), ...basePolyfills];
  },
};

module.exports = config;
