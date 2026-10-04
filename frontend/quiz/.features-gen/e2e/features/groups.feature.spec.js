// Generated from: e2e\features\groups.feature
import { test } from "playwright-bdd";

test.describe('Skapa och gå med i grupp', () => {

  test('Skapa en grupp med inbjudningskod', async ({ Given, When, Then, And, page }) => { 
    await Given('jag är inloggad via Auth0', null, { page }); 
    await When('jag skapar en ny grupp med namnet "Fredagsquiz"', null, { page }); 
    await Then('ska gruppen skapas', null, { page }); 
    await And('en unik 6-teckens inbjudningskod ska skapas', null, { page }); 
    await And('jag ska bli ägare av gruppen', null, { page }); 
  });

  test('Gå med via inbjudningskod', async ({ Given, When, Then, page }) => { 
    await Given('jag har fått en giltig inbjudningskod till en grupp', null, { page }); 
    await When('jag anger koden och klickar på Gå med', null, { page }); 
    await Then('ska jag läggas till som medlem i gruppen', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e\\features\\groups.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given jag är inloggad via Auth0","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When jag skapar en ny grupp med namnet \"Fredagsquiz\"","stepMatchArguments":[{"group":{"start":34,"value":"\"Fredagsquiz\"","children":[{"start":35,"value":"Fredagsquiz","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then ska gruppen skapas","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And en unik 6-teckens inbjudningskod ska skapas","stepMatchArguments":[{"group":{"start":8,"value":"6"},"parameterTypeName":"int"}]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"And jag ska bli ägare av gruppen","stepMatchArguments":[]}]},
  {"pwTestLine":14,"pickleLine":10,"tags":[],"steps":[{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"Given jag har fått en giltig inbjudningskod till en grupp","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When jag anger koden och klickar på Gå med","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then ska jag läggas till som medlem i gruppen","stepMatchArguments":[]}]},
]; // bdd-data-end