const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const config = getDefaultConfig(__dirname)

// Resolve the shared package from within the app directory (no monorepo symlink needed)
config.resolver.extraNodeModules = {
  "@local-commerce-platform/mobile-shared": path.resolve(__dirname, "src/lib/shared"),
}

module.exports = config
