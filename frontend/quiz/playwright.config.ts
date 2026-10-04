import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
    features: ["e2e/features/**/*.feature", "e2e/manual/**/*.feature"],
    steps: "e2e/steps/**/*.ts",
});

export default defineConfig({
    testDir,
    projects: [
        {
            name: "ui",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    use: {
        baseURL: "http://127.0.0.1:4173",
        trace: "retain-on-failure",
    },
    webServer: {
        command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});