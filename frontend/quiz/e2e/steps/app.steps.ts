import { expect } from "@playwright/test";
import { test, createBdd } from "playwright-bdd";
import type { Page, Route } from "@playwright/test";

interface Group {
    id: number;
    name: string;
    invite_code: string;
    owner_id: number;
    is_owner: boolean;
    createdAt: string;
}

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface Quiz {
    id: number;
    title: string;
    category: string;
    group_id: number;
    questions: Question[];
    createdAt: string;
}

interface ScenarioState {
    groups: Group[];
    quizzes: Quiz[];
    profileSynced: boolean;
    quizCreated: Quiz | null;
    quizResult: { score: number; total_questions: number; percentage: number } | null;
    resultSavedForTestUser: boolean;
}

const states = new WeakMap<Page, ScenarioState>();
const { Given, When, Then, Before } = createBdd(test);

function createGroup(id: number, name: string, isOwner = true): Group {
    return {
        id,
        name,
        invite_code: "ABC123",
        owner_id: 1,
        is_owner: isOwner,
        createdAt: "2026-01-01T00:00:00.000Z",
    };
}

function createQuiz(id: number, groupId: number, title = "DevSecOps grunder"): Quiz {
    return {
        id,
        title,
        category: "DevSecOps",
        group_id: groupId,
        questions: [{
            question: "Vilket alternativ är säkrast?",
            options: ["Secure", "Insecure", "Unknown", "Disabled"],
            correctAnswer: 0,
        }],
        createdAt: "2026-01-01T00:00:00.000Z",
    };
}

async function fulfill(route: Route, body: unknown) {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
    });
}

async function handleApi(route: Route, state: ScenarioState) {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/?/, "");
    const method = route.request().method();

    if (path === "sync-user" && method === "POST") {
        state.profileSynced = true;
        await fulfill(route, { user: { id: 1, auth0_id: "auth0|bdd-test-user" } });
        return;
    }

    if (path === "users" && method === "GET") {
        await fulfill(route, { users: [] });
        return;
    }

    if (path === "groups" && method === "GET") {
        await fulfill(route, { groups: state.groups });
        return;
    }

    if (path === "groups" && method === "POST") {
        const body = route.request().postDataJSON() as { name: string };
        const group = createGroup(state.groups.length + 1, body.name);
        state.groups.push(group);
        await fulfill(route, { group });
        return;
    }

    if (path === "groups/join" && method === "POST") {
        const body = route.request().postDataJSON() as { invite_code: string };
        const group = createGroup(2, "Inbjuden grupp", false);
        state.groups.push(group);
        await fulfill(route, { message: `Joined group ${body.invite_code} successfully!`, group });
        return;
    }

    if (path === "quizzes" && method === "GET") {
        await fulfill(route, { quizzes: state.quizzes });
        return;
    }

    if (path === "quizzes" && method === "POST") {
        const body = route.request().postDataJSON() as Omit<Quiz, "id" | "createdAt">;
        const quiz: Quiz = {
            ...body,
            id: state.quizzes.length + 1,
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        state.quizCreated = quiz;
        state.quizzes.push(quiz);
        await fulfill(route, { quiz });
        return;
    }

    const submitMatch = path.match(/^quizzes\/(\d+)\/submit$/);
    if (submitMatch && method === "POST") {
        const quiz = state.quizzes.find((item) => item.id === Number(submitMatch[1]));
        const body = route.request().postDataJSON() as { answers: number[] };
        const score = quiz?.questions.reduce(
            (total, question, index) => total + Number(body.answers[index] === question.correctAnswer),
            0,
        ) ?? 0;
        const totalQuestions = quiz?.questions.length ?? 0;
        state.quizResult = {
            score,
            total_questions: totalQuestions,
            percentage: totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100),
        };
        state.resultSavedForTestUser =
            route.request().headers().authorization === "Bearer bdd-test-token";
        await fulfill(route, { result: state.quizResult });
        return;
    }

    await fulfill(route, {});
}

function stateFor(page: Page): ScenarioState {
    const state = states.get(page);
    if (!state) throw new Error("Scenario API fixtures are not initialized");
    return state;
}

async function openAuthenticatedApp(page: Page) {
    await page.goto("/");
    await expect(page.getByText(/Authenticated securely via Auth0/)).toBeVisible();
}

Before(async ({ page }) => {
    const state: ScenarioState = {
        groups: [],
        quizzes: [],
        profileSynced: false,
        quizCreated: null,
        quizResult: null,
        resultSavedForTestUser: false,
    };
    states.set(page, state);
    await page.route("http://localhost:5000/api/**", (route) => handleApi(route, state));
});

Given("jag är en ny besökare", async () => { });

When("jag loggar in med en lokal Auth0-testidentitet", async ({ page }) => {
    await openAuthenticatedApp(page);
});

Then("ska jag vara inloggad", async ({ page }) => {
    await expect(page.getByText(/Hello, BDD Test User!/)).toBeVisible();
});

Then("testprofilen ska synkroniseras till den lokala databasen", async ({ page }) => {
    await expect.poll(() => stateFor(page).profileSynced).toBe(true);
});

Given("jag är inloggad via Auth0", async ({ page }) => {
    await openAuthenticatedApp(page);
});

When("jag skapar en ny grupp med namnet {string}", async ({ page }, name: string) => {
    await openAuthenticatedApp(page);
    await page.getByPlaceholder("Group Name...").fill(name);
    await page.getByRole("button", { name: "+ Create", exact: true }).click();
});

Then("ska gruppen skapas", async ({ page }) => {
    await expect(page.getByText("Group created successfully!")).toBeVisible();
    await expect(page.getByText("Fredagsquiz")).toBeVisible();
});

Then("en unik {int}-teckens inbjudningskod ska skapas", async ({ page }, length: number) => {
    const code = page.getByText("ABC123", { exact: true });
    await expect(code).toBeVisible();
    expect((await code.textContent())?.trim()).toMatch(new RegExp(`^[A-Z0-9]{${length}}$`));
});

Then("jag ska bli ägare av gruppen", async ({ page }) => {
    await expect(page.getByText("Owner", { exact: true })).toBeVisible();
});

Given("jag har fått en giltig inbjudningskod till en grupp", async ({ page }) => {
    await openAuthenticatedApp(page);
});

When("jag anger koden och klickar på Gå med", async ({ page }) => {
    await page.getByPlaceholder("e.g. EXAM24").fill("VQQMY8");
    await page.getByRole("button", { name: /Join/ }).click();
});

Then("ska jag läggas till som medlem i gruppen", async ({ page }) => {
    await expect(page.getByText("Joined group VQQMY8 successfully!")).toBeVisible();
    await expect(page.getByText("Inbjuden grupp")).toBeVisible();
});

Given("jag är medlem i en grupp", async ({ page }) => {
    stateFor(page).groups = [createGroup(1, "Fredagsquiz")];
});

When('jag skapar ett quiz med kategorin {string} och frågor', async ({ page }, category: string) => {
    expect(category).toBe("DevSecOps");
    await openAuthenticatedApp(page);
    await expect(page.getByText("Fredagsquiz")).toBeVisible();
    await page.getByRole("button", { name: /Create New Quiz/ }).click();
    await page.getByPlaceholder("e.g. DevSecOps Fundamentals").fill("DevSecOps grunder");
    await page.getByPlaceholder("Enter question text...").fill("Vilket alternativ är säkrast?");
    for (const [index, option] of ["Secure", "Insecure", "Unknown", "Disabled"].entries()) {
        await page.getByPlaceholder(`Option ${index + 1}`).fill(option);
    }
    await page.getByRole("button", { name: "Save Quiz" }).click();
});

Then("ska quizet sparas i databasen", async ({ page }) => {
    await expect.poll(() => stateFor(page).quizCreated?.title).toBe("DevSecOps grunder");
    expect(stateFor(page).quizCreated?.category).toBe("DevSecOps");
});

Then("ska vara tillgängligt för gruppens medlemmar", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "DevSecOps grunder" })).toBeVisible();
});

Given("jag är medlem i en grupp med ett publicerat quiz", async ({ page }) => {
    const state = stateFor(page);
    state.groups = [createGroup(1, "Fredagsquiz")];
    state.quizzes = [createQuiz(1, 1)];
});

When("jag svarar på alla frågor i quizet och skickar in", async ({ page }) => {
    await openAuthenticatedApp(page);
    await page.getByRole("button", { name: /Take Quiz/ }).click();
    await page.getByRole("radio", { name: "Secure", exact: true }).check();
    await page.getByRole("button", { name: "Submit Answers" }).click();
});

Then("ska mitt poängresultat beräknas", async ({ page }) => {
    await expect(page.getByText("Score: 1 / 1 (100%)")).toBeVisible();
    expect(stateFor(page).quizResult?.percentage).toBe(100);
});

Then("resultatet ska sparas kopplat till min användare", async ({ page }) => {
    await expect.poll(() => stateFor(page).resultSavedForTestUser).toBe(true);
});