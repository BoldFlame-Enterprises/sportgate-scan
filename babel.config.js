export default function (api) {
  api.cache(true);
  return {
    presets: [
      // Expo preset includes react-native, TypeScript, and env handling:
      'babel-preset-expo'
    ],
    plugins: [
      // Other custom Babel plugins go here
    ]
  };
};