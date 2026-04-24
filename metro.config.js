const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const escapedVenvPath = path
  .resolve(__dirname, ".venv")
  .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  .replace(/\\\\/g, "[\\\\/]");

config.resolver.blockList = new RegExp(`^${escapedVenvPath}[\\\\/].*`);

module.exports = config;
