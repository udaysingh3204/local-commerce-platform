module.exports = function(api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@local-commerce-platform/mobile-shared": "./src/lib/shared"
          }
        }
      ]
    ]
  }
}