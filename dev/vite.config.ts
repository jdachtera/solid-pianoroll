import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solidPlugin(),
    {
      name: "Reaplace env variables",
      transform(code, id) {
        if (id.includes("node_modules")) {
          return code;
        }
        return code
          .replace(/process\.env\.SSR/g, "false")
          .replace(/process\.env\.DEV/g, "true")
          .replace(/process\.env\.PROD/g, "false")
          .replace(/process\.env\.NODE_ENV/g, '"development"')
          .replace(/import\.meta\.env\.SSR/g, "false")
          .replace(/import\.meta\.env\.DEV/g, "true")
          .replace(/import\.meta\.env\.PROD/g, "false")
          .replace(/import\.meta\.env\.NODE_ENV/g, '"development"');
      },
    },
  ],
  // One Solid for the roll and any linked package (e.g. a local solid-viewport);
  // two copies would each have their own context and reactivity.
  resolve: { dedupe: ["solid-js"] },
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
