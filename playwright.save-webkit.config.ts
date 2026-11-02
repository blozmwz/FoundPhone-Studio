import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.save-hotfix.config";
export default defineConfig({
  ...base,
  use: {
    ...devices["iPhone 13"],
    browserName: "webkit",
    channel: "",
    headless: true,
    serviceWorkers: "block",
    actionTimeout: 15000,
  },
});
