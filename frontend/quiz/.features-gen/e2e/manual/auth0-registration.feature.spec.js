// Generated from: e2e\manual\auth0-registration.feature
import { test } from "playwright-bdd";

test.describe('Registrering och inloggning via Auth0', () => {

  test('Ny användare registrerar sig och loggar in med samma uppgifter', { tag: ['@requires-live-auth0'] }, async ({ Given, When, Then, And }) => { 
    await Given('jag är på Auth0s inloggningssida'); 
    await When('jag väljer "Sign up"'); 
    await And('jag registrerar mig med en unik e-postadress och ett giltigt lösenord'); 
    await Then('ska ett konto skapas i Auth0'); 
    await When('jag loggar ut från Auth0'); 
    await And('jag loggar in med samma e-postadress och lösenord'); 
    await Then('ska jag vara inloggad med det nyskapade kontot'); 
    await And('profilen ska synkroniseras till den lokala databasen'); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e\\manual\\auth0-registration.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@requires-live-auth0"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given jag är på Auth0s inloggningssida","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When jag väljer \"Sign up\"","stepMatchArguments":[{"group":{"start":11,"value":"\"Sign up\"","children":[{"start":12,"value":"Sign up","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"And jag registrerar mig med en unik e-postadress och ett giltigt lösenord","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"Then ska ett konto skapas i Auth0","stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When jag loggar ut från Auth0","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And jag loggar in med samma e-postadress och lösenord","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then ska jag vara inloggad med det nyskapade kontot","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And profilen ska synkroniseras till den lokala databasen","stepMatchArguments":[]}]},
]; // bdd-data-end