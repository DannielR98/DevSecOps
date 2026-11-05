// Generated from: e2e\features\quizzes.feature
import { test } from "playwright-bdd";

test.describe('Skapa och genomföra quiz', () => {

  test('Skapa ett quiz i en grupp', async ({ Given, When, Then, And, page }) => { 
    await Given('jag är medlem i en grupp', null, { page }); 
    await When('jag skapar ett quiz med kategorin "DevSecOps" och frågor', null, { page }); 
    await Then('ska quizet sparas i databasen', null, { page }); 
    await And('ska vara tillgängligt för gruppens medlemmar', null, { page }); 
  });

  test('Genomföra ett quiz', async ({ Given, When, Then, And, page }) => { 
    await Given('jag är medlem i en grupp med ett publicerat quiz', null, { page }); 
    await When('jag svarar på alla frågor i quizet och skickar in', null, { page }); 
    await Then('ska mitt poängresultat beräknas', null, { page }); 
    await And('resultatet ska sparas kopplat till min användare', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e\\features\\quizzes.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given jag är medlem i en grupp","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When jag skapar ett quiz med kategorin \"DevSecOps\" och frågor","stepMatchArguments":[{"group":{"start":34,"value":"\"DevSecOps\"","children":[{"start":35,"value":"DevSecOps","children":[{}]},{"children":[{}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then ska quizet sparas i databasen","stepMatchArguments":[]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And ska vara tillgängligt för gruppens medlemmar","stepMatchArguments":[]}]},
  {"pwTestLine":13,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":14,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"Given jag är medlem i en grupp med ett publicerat quiz","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"When jag svarar på alla frågor i quizet och skickar in","stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then ska mitt poängresultat beräknas","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And resultatet ska sparas kopplat till min användare","stepMatchArguments":[]}]},
]; // bdd-data-end