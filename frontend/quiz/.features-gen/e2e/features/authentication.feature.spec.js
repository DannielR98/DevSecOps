// Generated from: e2e\features\authentication.feature
import { test } from "playwright-bdd";

test.describe('Inloggning med Auth0-testidentitet', () => {

  test('Besökare öppnar appen med en Auth0-testidentitet', async ({ Given, When, Then, And, page }) => { 
    await Given('jag är en ny besökare'); 
    await When('jag loggar in med en lokal Auth0-testidentitet', null, { page }); 
    await Then('ska jag vara inloggad', null, { page }); 
    await And('testprofilen ska synkroniseras till den lokala databasen', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e\\features\\authentication.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given jag är en ny besökare","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When jag loggar in med en lokal Auth0-testidentitet","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then ska jag vara inloggad","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And testprofilen ska synkroniseras till den lokala databasen","stepMatchArguments":[]}]},
]; // bdd-data-end