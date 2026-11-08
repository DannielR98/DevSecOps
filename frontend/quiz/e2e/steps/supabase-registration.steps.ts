/* import { createBdd, test } from "playwright-bdd";

const { Given, When, Then, Before } = createBdd(test);
const pendingLiveSupabaseStep = async () => {};

Before({ tags: "@requires-live-supabase" }, async () => {
  test.skip(
    true,
    "Requires a live Supabase project and dedicated test credentials",
  );
});

Given("jag är på inloggningssidan", pendingLiveSupabaseStep);
When("jag väljer {string}", async ({}, _label: string) => {});
//When("jag väljer {string}", async (_fixtures, _label: string) => {});

When(
  "jag registrerar mig med en unik e-postadress och ett giltigt lösenord",
  pendingLiveSupabaseStep,
);
Then("ska ett konto skapas i Supabase", pendingLiveSupabaseStep);
When("jag loggar ut från Supabase", pendingLiveSupabaseStep);
When(
  "jag loggar in med samma e-postadress och lösenord",
  pendingLiveSupabaseStep,
);
Then("ska jag vara inloggad med det nyskapade kontot", pendingLiveSupabaseStep);
Then(
  "profilen ska synkroniseras till den lokala databasen",
  pendingLiveSupabaseStep,
);
 */

/// <reference types="node" />

import { test, createBdd } from "playwright-bdd";

const { Given, When, Then, Before } = createBdd(test);

Before({ tags: "@requires-live-supabase" }, async () => {
  const email = process.env.E2E_SUPABASE_EMAIL;
  const password = process.env.E2E_SUPABASE_PASSWORD;

  if (!email || !password) {
    test.skip(
      true,
      "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to run live Supabase tests",
    );
  }
});

Given("jag är på inloggningssidan", async ({ page }) => {
  await page.goto("/");

  // Adjust this assertion if your application has a separate login route.
  await page.getByRole("button", { name: /logga in/i }).waitFor({
    state: "visible",
  });
});

When("jag väljer {string}", async ({ page }, label: string) => {
  await page.getByRole("button", { name: label }).click();
});

When(
  "jag registrerar mig med en unik e-postadress och ett giltigt lösenord",
  async ({ page }) => {
    const email = process.env.E2E_SUPABASE_EMAIL!;
    const password = process.env.E2E_SUPABASE_PASSWORD!;

    await page.getByLabel(/e-post|email/i).fill(email);
    await page.getByLabel(/lösenord|password/i).fill(password);

    await page.getByRole("button", { name: /registrera|sign up/i }).click();
  },
);

Then("ska ett konto skapas i Supabase", async ({ page }) => {
  await page.getByText(/registrerad|konto skapat|success/i).waitFor({
    state: "visible",
  });
});

When("jag loggar ut från Supabase", async ({ page }) => {
  await page.getByRole("button", { name: /logga ut|sign out/i }).click();
});

When("jag loggar in med samma e-postadress och lösenord", async ({ page }) => {
  const email = process.env.E2E_SUPABASE_EMAIL!;
  const password = process.env.E2E_SUPABASE_PASSWORD!;

  await page.getByLabel(/e-post|email/i).fill(email);
  await page.getByLabel(/lösenord|password/i).fill(password);

  await page.getByRole("button", { name: /logga in|sign in/i }).click();
});

Then("ska jag vara inloggad med det nyskapade kontot", async ({ page }) => {
  await page.getByText(/Säkert autentiserad via Supabase Auth/).waitFor({
    state: "visible",
  });
});

Then(
  "profilen ska synkroniseras till den lokala databasen",
  async ({ page }) => {
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/sync-user") &&
        response.request().method() === "POST" &&
        response.ok(),
      { timeout: 15000 },
    );
  },
);
