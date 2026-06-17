module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Force transpilation of all modern JS features (private fields, etc.)
          // so the bundle works on every Hermes version including older Expo Go builds
          unstable_transformProfile: 'default',
        },
      ],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
