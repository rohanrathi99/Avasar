module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "@shared": "../shared/src",
            "job-ops-shared": "../shared/src",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // react-native-reanimated/plugin must be listed last.
      "react-native-reanimated/plugin",
    ],
  };
};
