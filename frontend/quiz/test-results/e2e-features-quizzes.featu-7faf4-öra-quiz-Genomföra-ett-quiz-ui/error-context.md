# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\features\quizzes.feature.spec.js >> Skapa och genomföra quiz >> Genomföra ett quiz
- Location: .features-gen\e2e\features\quizzes.feature.spec.js:13:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Starta quiz/ })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications Alt+T"
  - navigation [ref=e4]:
    - link "🔒 DevSecOps Quiz" [ref=e6] [cursor=pointer]:
      - /url: /
    - generic [ref=e8]:
      - generic [ref=e9]: BDD Test User
      - button "Logga ut" [ref=e10] [cursor=pointer]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - heading "Hej, BDD Test User! 👋" [level=2] [ref=e15]
        - paragraph [ref=e16]: "Inloggad som: bdd@example.test"
        - paragraph [ref=e17]: ✓ Säkert autentiserad via Supabase Auth
      - generic [ref=e18]:
        - heading "📚 Mina Quizgrupper" [level=2] [ref=e19]
        - generic [ref=e20]: Network Error
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]: Skapa ny grupp
            - generic [ref=e24]:
              - textbox "Gruppnamn..." [ref=e25]
              - button "+ Skapa" [ref=e26] [cursor=pointer]
          - generic [ref=e27]:
            - generic [ref=e28]: Gå med via inbjudningskod
            - generic [ref=e29]:
              - textbox "t.ex. EXAM24" [ref=e30]
              - button "🔑 Gå med" [ref=e31] [cursor=pointer]
        - paragraph [ref=e32]: Inga grupper skapade eller anslutna ännu. Skapa en eller ange en inbjudningskod ovan!
      - generic [ref=e33]:
        - generic [ref=e34]:
          - heading "🎯 Quiz" [level=2] [ref=e35]
          - button "+ Skapa nytt quiz" [ref=e36] [cursor=pointer]
        - text: // Quiz List
        - paragraph [ref=e37]: Inga quiz tillgängliga ännu. Skapa en grupp och lägg till ditt första quiz!
        - text: // Active Quiz Player Modal// Create / Edit Quiz Modal
  - contentinfo [ref=e38]:
    - paragraph [ref=e39]: © 2026 QuizApp. Alla rättigheter förbehållna.
```

# Test source

```ts
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
  201 |   await expect(page.getByText("Gruppen har skapats!")).toBeVisible();
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
> 263 |   await page.getByRole("button", { name: /Starta quiz/ }).click();
      |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
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