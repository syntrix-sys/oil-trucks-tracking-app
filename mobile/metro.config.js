const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure all react-native ecosystem packages are transformed by Babel
// (needed so private class fields are compiled for older Hermes in Expo Go)
const packagesToTransform = [
  'react-native',
  '@react-native',
  'expo',
  '@expo',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-screens',
  'react-native-safe-area-context',
  '@react-navigation',
  '@react-native-async-storage',
].join('|');

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
