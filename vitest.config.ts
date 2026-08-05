const path = require("node:path") as typeof import("node:path");
const { defineConfig } = require("vitest/config") as typeof import("vitest/config");

module.exports = defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
