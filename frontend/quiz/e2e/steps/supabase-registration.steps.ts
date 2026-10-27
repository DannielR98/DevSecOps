import { createBdd, test } from "playwright-bdd";

const { Given, When, Then, Before } = createBdd(test);
const pendingLiveSupabaseStep = async () => { };

Before({ tags: "@requires-live-supabase" }, async () => {
    test.skip(true, "Requires a live Supabase project and dedicated test credentials");
});

Given("jag är på inloggningssidan", pendingLiveSupabaseStep);
When('jag väljer {string}', async ({ }, _label: string) => { });
When("jag registrerar mig med en unik e-postadress och ett giltigt lösenord", pendingLiveSupabaseStep);
Then("ska ett konto skapas i Supabase", pendingLiveSupabaseStep);
When("jag loggar ut från Supabase", pendingLiveSupabaseStep);
When("jag loggar in med samma e-postadress och lösenord", pendingLiveSupabaseStep);
Then("ska jag vara inloggad med det nyskapade kontot", pendingLiveSupabaseStep);
Then("profilen ska synkroniseras till den lokala databasen", pendingLiveSupabaseStep);
