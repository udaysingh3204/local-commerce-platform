const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const config = getDefaultConfig(__dirname)

const sharedPath = path.resolve(__dirname, "src/lib/shared")

// Both approaches for maximum compatibility
config.resolver.extraNodeModules = {
  "@local-commerce-platform/mobile-shared": sharedPath,
}

// Ensure shared files are watched and transformed (not excluded as node_modules)
config.watchFolders = [...(config.watchFolders || []), sharedPath]

module.exports = config