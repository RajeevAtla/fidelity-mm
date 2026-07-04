import { defineConfig } from "@farmfe/core";

export default defineConfig({
  compilation: {
    input: {
      index: "./index.html",
    },
    output: {
      path: "./dist",
      publicPath: "/fidelity-mm/",
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
