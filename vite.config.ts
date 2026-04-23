import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null, // we register manually with iframe-safety guard
        devOptions: { enabled: false },
        manifest: false, // we ship our own /manifest.webmanifest
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        },
      }),
    ],
  },
});
