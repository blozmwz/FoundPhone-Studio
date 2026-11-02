import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: ["save-hotfix.spec.ts"],
  timeout: 90000,
  workers: 1,
  use: {
    channel: "chrome",
    headless: true,
    serviceWorkers: "block",
    viewport: { width: 1280, height: 1000 },
    actionTimeout: 15000,
  },
  reporter: "list",
});
