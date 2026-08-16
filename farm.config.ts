import { defineConfig } from "@farmfe/core";
import { APP_CONFIG } from "./src/config/app-config";

export default defineConfig({
  compilation: {
    input: {
      index: "./index.html",
    },
    output: {
      path: "./dist",
      publicPath: APP_CONFIG.site.basePath,
      targetEnv: "browser-esnext",
    },
    sourcemap: false,
    runtime: {
      isolate: true,
    },
  },
  plugins: [
    [
      "@farmfe/plugin-react",
      {
        importSource: "preact",
        refresh: false,
        development: false,
      },
    ],
  ],
});
