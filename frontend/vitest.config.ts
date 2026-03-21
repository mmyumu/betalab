import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "coverage/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "next-env.d.ts",
        "next.config.ts",
        "postcss.config.js",
        "tailwind.config.ts",
        "vitest.config.ts",
        "vitest.setup.ts",
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
