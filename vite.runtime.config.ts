import { localIconPlugin } from "./scripts/local-icon-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ command }) => ({
  base: "./",
  optimizeDeps: { entries: ["index.html"] },
  plugins: [
    localIconPlugin(command),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "礼拜四",
        short_name: "礼拜四",
        display: "standalone",
        background_color: "#000000",
        theme_color: "#000000",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      workbox: {
        clientsClaim: true,
        importScripts: ["./sw-refresh.js"],
        globIgnores: ["**/work.json"],
        runtimeCaching: [
          {
            urlPattern: /\/work\.json(?:\?.*)?$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "thursday-story-data",
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        globPatterns: ["**/*.{js,css,html,svg,json,txt,png,jpg}"],
        maximumFileSizeToCacheInBytes: 16000000,
      },
    }),
  ],
}));
