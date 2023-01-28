import { defineConfig, GlobalOptions } from "tsup-preset-solid";

import esbuildCss from "esbuild-css-modules-plugin";

export default defineConfig(
  {
    entry: "src/index.tsx",
    devEntry: true,
  },
  {
    // Enable this to write export conditions to package.json
    // writePackageJson: true,
    dropConsole: true,
    cjs: true,
    esbuildPlugins: [
      esbuildCss({
        inject: true,
        localsConvention: "camelCase",
      }) as unknown as NonNullable<GlobalOptions["esbuildPlugins"]>[number],
    ],
  },
);
