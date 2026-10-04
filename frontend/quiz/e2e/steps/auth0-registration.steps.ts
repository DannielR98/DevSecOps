import { createBdd, test } from "playwright-bdd";

const { Given, When, Then, Before } = createBdd(test);
const pendingLiveAuth0Step = async () => { };

Before({ tags: "@requires-live-auth0" }, async () => {
    test.skip(true, "Requires a live Auth0 tenant and dedicated test credentials");
});

Given("jag är på Auth0s inloggningssida", pendingLiveAuth0Step);
When('jag väljer {string}', async ({ }, _label: string) => { });
When("jag registrerar mig med en unik e-postadress och ett giltigt lösenord", pendingLiveAuth0Step);
Then("ska ett konto skapas i Auth0", pendingLiveAuth0Step);
When("jag loggar ut från Auth0", pendingLiveAuth0Step);
When("jag loggar in med samma e-postadress och lösenord", pendingLiveAuth0Step);
Then("ska jag vara inloggad med det nyskapade kontot", pendingLiveAuth0Step);
Then("profilen ska synkroniseras till den lokala databasen", pendingLiveAuth0Step);