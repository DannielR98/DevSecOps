//  import { defineConfig, devices } from "@playwright/test";
// import { defineBddConfig } from "playwright-bdd";

// const testDir = defineBddConfig({
//   features: ["e2e/features/**/*.feature", "e2e/manual/**/*.feature"],
//   steps: "e2e/steps/**/*.ts",
// });

// export default defineConfig({
//   testDir,
//   projects: [
//     {
//       name: "ui",
//       use: { ...devices["Desktop Chrome"] },
//     },
//   ],
//   use: {
//     baseURL: "http://127.0.0.1:4173",
//     trace: "retain-on-failure",
//   },
//   webServer: {
//     command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 4173",
//     url: "http://127.0.0.1:4173",
//     reuseExistingServer: !process.env.CI,
//     timeout: 30_000,
//   },
// });

import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: ["e2e/features/**/*.feature", "e2e/manual/**/*.feature"],
  steps: "e2e/steps/**/*.ts",
});

// Set TEST_ENV=ec2 in PowerShell to test EC2
const useEC2 = process.env.TEST_ENV === "ec2";

const baseURL = useEC2 ? "http://13.63.69.174" : "http://127.0.0.1:4173";

console.log("TEST ENVIRONMENT:", useEC2 ? "EC2" : "LOCALHOST");
console.log("BASE URL:", baseURL);

export default defineConfig({
  testDir,

  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  fullyParallel: false,
  workers: 1,

  projects: [
    {
      name: "ui",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Start local Vite only when testing localhost
  ...(useEC2
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 4173",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }),
});
