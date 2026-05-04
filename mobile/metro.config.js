const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const config = getDefaultConfig(__dirname);
const reactNativeSvgEntry = require.resolve("react-native-svg");

config.resolver.blockList = exclusionList([
  /.*\/node_modules\/expo-av\/android\/.cxx\/.*$/
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-svg") {
    return {
      type: "sourceFile",
      filePath: reactNativeSvgEntry,
    };
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
