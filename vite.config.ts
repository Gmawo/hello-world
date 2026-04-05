import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144947635
// Replace the Host header in the request with the forwarded host header
// to handle reverse proxies
const config = {
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 64999,
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {},
    }),
    tsconfigPaths(),
  ],
} satisfies UserConfig;

export default defineConfig(config);
