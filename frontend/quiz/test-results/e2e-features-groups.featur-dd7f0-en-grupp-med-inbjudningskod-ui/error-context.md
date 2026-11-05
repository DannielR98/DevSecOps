# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\features\groups.feature.spec.js >> Skapa och gå med i grupp >> Skapa en grupp med inbjudningskod
- Location: .features-gen\e2e\features\groups.feature.spec.js:6:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Gruppen har skapats!')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Gruppen har skapats!') with timeout 5000ms
  - waiting for getByText('Gruppen har skapats!')

```

```yaml
- region "Notifications Alt+T"
- navigation:
  - link "🔒 DevSecOps Quiz":
    - /url: /
  - text: BDD Test User
  - button "Logga ut"
- main:
  - heading "Hej, BDD Test User! 👋" [level=2]
  - paragraph: "Inloggad som: bdd@example.test"
  - paragraph: ✓ Säkert autentiserad via Supabase Auth
  - heading "📚 Mina Quizgrupper" [level=2]
  - text: Network Error Skapa ny grupp
  - textbox "Gruppnamn...": Fredagsquiz
  - button "+ Skapa"
  - text: Gå med via inbjudningskod
  - textbox "t.ex. EXAM24"
  - button "🔑 Gå med"
  - paragraph: Inga grupper skapade eller anslutna ännu. Skapa en eller ange en inbjudningskod ovan!
  - heading "🎯 Quiz" [level=2]
  - button "+ Skapa nytt quiz"
  - text: // Quiz List
  - paragraph: Inga quiz tillgängliga ännu. Skapa en grupp och lägg till ditt första quiz!
  - text: // Active Quiz Player Modal// Create / Edit Quiz Modal
- contentinfo:
  - paragraph: © 2026 QuizApp. Alla rättigheter förbehållna.
```

# Test source

```ts
  101 |   }
  102 | 
  103 |   if (path === "groups/join" && method === "POST") {
  104 |     const body = route.request().postDataJSON() as { invite_code: string };
  105 |     const group = createGroup(2, "Inbjuden grupp", false);
  106 |     state.groups.push(group);
  107 |     await fulfill(route, { message: `Joined group ${body.invite_code} successfully!`, group });
  108 |     return;
  109 |   }
  110 | 
  111 |   if (path === "quizzes" && method === "GET") {
  112 |     await fulfill(route, { quizzes: state.quizzes });
  113 |     return;
  114 |   }
  115 | 
  116 |   if (path === "quizzes" && method === "POST") {
  117 |     const body = route.request().postDataJSON() as Omit<Quiz, "id" | "createdAt">;
  118 |     const quiz: Quiz = {
  119 |       ...body,
  120 |       id: String(state.quizzes.length + 1),
  121 |       createdAt: "2026-01-01T00:00:00.000Z",
  122 |     };
  123 |     state.quizCreated = quiz;
  124 |     state.quizzes.push(quiz);
  125 |     await fulfill(route, { quiz });
  126 |     return;
  127 |   }
  128 | 
  129 |   const submitMatch = path.match(    /^quizzes\/([^/]+)\/submit$/);
  130 |   if (submitMatch && method === "POST") {
  131 |     const quiz = state.quizzes.find((item) => item.id === submitMatch[1]);
  132 |     const body = route.request().postDataJSON() as { answers: string[] };
  133 |     const score = quiz?.questions.reduce(
  134 |       (total, question, index) => total + Number(body.answers[index] === question.correctAnswer),
  135 |       0,
  136 |     ) ?? 0;
  137 |     const totalQuestions = quiz?.questions.length ?? 0;
  138 |     state.quizResult = {
  139 |       score,
  140 |       total_questions: totalQuestions,
  141 |       percentage: totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100),
  142 |     };
  143 |     state.resultSavedForTestUser =
  144 |       route.request().headers().authorization === "Bearer bdd-test-token";
  145 |     await fulfill(route, { result: state.quizResult });
  146 |     return;
  147 |   }
  148 | 
  149 |   await fulfill(route, {});
  150 | }
  151 | 
  152 | function stateFor(page: Page): ScenarioState {
  153 |   const state = states.get(page);
  154 |   if (!state) {throw new Error("Scenario API fixtures are not initialized");}
  155 |   return state;
  156 | }
  157 | 
  158 | async function openAuthenticatedApp(page: Page) {
  159 |   await page.goto("/");
  160 |   await expect(page.getByText(/Säkert autentiserad via Supabase Auth/)).toBeVisible();
  161 | }
  162 | 
  163 | Before(async ({ page }) => {
  164 |   const state: ScenarioState = {
  165 |     groups: [],
  166 |     quizzes: [],
  167 |     profileSynced: false,
  168 |     quizCreated: null,
  169 |     quizResult: null,
  170 |     resultSavedForTestUser: false,
  171 |   };
  172 |   states.set(page, state);
  173 |   await page.route("http://localhost:5000/api/**", (route) => handleApi(route, state));
  174 | });
  175 | 
  176 | Given("jag är en ny besökare", async () => { });
  177 | 
  178 | When("jag loggar in med en lokal Supabase-testidentitet", async ({ page }) => {
  179 |   await openAuthenticatedApp(page);
  180 | });
  181 | 
  182 | Then("ska jag vara inloggad", async ({ page }) => {
  183 |   await expect(page.getByText(/Hej, BDD Test User!/)).toBeVisible();
  184 | });
  185 | 
  186 | Then("testprofilen ska synkroniseras till den lokala databasen", async ({ page }) => {
  187 |   await expect.poll(() => stateFor(page).profileSynced).toBe(true);
  188 | });
  189 | 
  190 | Given("jag är inloggad via Supabase", async ({ page }) => {
  191 |   await openAuthenticatedApp(page);
  192 | });
  193 | 
  194 | When("jag skapar en ny grupp med namnet {string}", async ({ page }, name: string) => {
  195 |   await openAuthenticatedApp(page);
  196 |   await page.getByPlaceholder("Gruppnamn...").fill(name);
  197 |   await page.getByRole("button", { name: "+ Skapa", exact: true }).click();
  198 | });
  199 | 
  200 | Then("ska gruppen skapas", async ({ page }) => {
> 201 |   await expect(page.getByText("Gruppen har skapats!")).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  202 |   await expect(page.getByText("Fredagsquiz")).toBeVisible();
  203 | });
  204 | 
  205 | Then("en unik {int}-teckens inbjudningskod ska skapas", async ({ page }, length: number) => {
  206 |   const code = page.getByText("ABC123", { exact: true });
  207 |   await expect(code).toBeVisible();
  208 |   expect((await code.textContent())?.trim()).toMatch(new RegExp(`^[A-Z0-9]{${length}}$`));
  209 | });
  210 | 
  211 | Then("jag ska bli ägare av gruppen", async ({ page }) => {
  212 |   await expect(page.getByText("Ägare", { exact: true })).toBeVisible();
  213 | });
  214 | 
  215 | Given("jag har fått en giltig inbjudningskod till en grupp", async ({ page }) => {
  216 |   await openAuthenticatedApp(page);
  217 | });
  218 | 
  219 | When("jag anger koden och klickar på Gå med", async ({ page }) => {
  220 |   await page.getByPlaceholder("t.ex. EXAM24").fill("VQQMY8");
  221 |   await page.getByRole("button", { name: /Gå med/ }).click();
  222 | });
  223 | 
  224 | Then("ska jag läggas till som medlem i gruppen", async ({ page }) => {
  225 |   await expect(page.getByText("Joined group VQQMY8 successfully!")).toBeVisible();
  226 |   await expect(page.getByText("Inbjuden grupp")).toBeVisible();
  227 | });
  228 | 
  229 | Given("jag är medlem i en grupp", async ({ page }) => {
  230 |   stateFor(page).groups = [createGroup(1, "Fredagsquiz")];
  231 | });
  232 | 
  233 | When("jag skapar ett quiz med kategorin {string} och frågor", async ({ page }, category: string) => {
  234 |   expect(category).toBe("DevSecOps");
  235 |   await openAuthenticatedApp(page);
  236 |   await expect(page.getByText("Fredagsquiz")).toBeVisible();
  237 |   await page.getByRole("button", { name: /Skapa nytt quiz/ }).click();
  238 |   await page.getByPlaceholder("t.ex. Grunderna i DevSecOps").fill("DevSecOps grunder");
  239 |   await page.getByPlaceholder("Skriv frågetext...").fill("Vilket alternativ är säkrast?");
  240 |   for (const [index, option] of ["Secure", "Insecure", "Unknown", "Disabled"].entries()) {
  241 |     await page.getByPlaceholder(`Alternativ ${index + 1}`).fill(option);
  242 |   }
  243 |   await page.getByRole("button", { name: "Spara quiz" }).click();
  244 | });
  245 | 
  246 | Then("ska quizet sparas i databasen", async ({ page }) => {
  247 |   await expect.poll(() => stateFor(page).quizCreated?.title).toBe("DevSecOps grunder");
  248 |   expect(stateFor(page).quizCreated?.category).toBe("DevSecOps");
  249 | });
  250 | 
  251 | Then("ska vara tillgängligt för gruppens medlemmar", async ({ page }) => {
  252 |   await expect(page.getByRole("heading", { name: "DevSecOps grunder" })).toBeVisible();
  253 | });
  254 | 
  255 | Given("jag är medlem i en grupp med ett publicerat quiz", async ({ page }) => {
  256 |   const state = stateFor(page);
  257 |   state.groups = [createGroup(1, "Fredagsquiz")];
  258 |   state.quizzes = [createQuiz(1, 1)];
  259 | });
  260 | 
  261 | When("jag svarar på alla frågor i quizet och skickar in", async ({ page }) => {
  262 |   await openAuthenticatedApp(page);
  263 |   await page.getByRole("button", { name: /Starta quiz/ }).click();
  264 |   await page.getByRole("radio", { name: "Secure", exact: true }).check();
  265 |   await page.getByRole("button", { name: "Lämna in svar" }).click();
  266 | });
  267 | 
  268 | Then("ska mitt poängresultat beräknas", async ({ page }) => {
  269 |   await expect(page.getByText("Resultat: 1 / 1 (100%)")).toBeVisible();
  270 |   expect(stateFor(page).quizResult?.percentage).toBe(100);
  271 | });
  272 | 
  273 | Then("resultatet ska sparas kopplat till min användare", async ({ page }) => {
  274 |   await expect.poll(() => stateFor(page).resultSavedForTestUser).toBe(true);
  275 | });
```