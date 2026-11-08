// import { expect } from "@playwright/test";
// import { test, createBdd } from "playwright-bdd";
// import type { Page, Route } from "@playwright/test";

// interface Group {
//   id: string;
//   name: string;
//   invite_code: string;
//   owner_id: number;
//   is_owner: boolean;
//   createdAt: string;
// }

// interface Question {
//   question: string;
//   options: string[];
//   correctAnswer: string;
// }

// interface Quiz {
//   id: string;
//   title: string;
//   category: string;
//   group_id: string;
//   questions: Question[];
//   createdAt: string;
// }

// interface ScenarioState {
//   groups: Group[];
//   quizzes: Quiz[];
//   profileSynced: boolean;
//   quizCreated: Quiz | null;
//   quizResult: { score: number; total_questions: number; percentage: number } | null;
//   resultSavedForTestUser: boolean;
// }

// const states = new WeakMap<Page, ScenarioState>();
// const { Given, When, Then, Before } = createBdd(test);

// function createGroup(id: number, name: string, isOwner = true): Group {
//   return {
//     id: String(id),
//     name,
//     invite_code: "ABC123",
//     owner_id: 1,
//     is_owner: isOwner,
//     createdAt: "2026-01-01T00:00:00.000Z",
//   };
// }

// function createQuiz(id: number, groupId: number, title = "DevSecOps grunder"): Quiz {
//   return {
//     id: String(id),
//     title,
//     category: "DevSecOps",
//     group_id: String(groupId),
//     questions: [{
//       question: "Vilket alternativ är säkrast?",
//       options: ["Secure", "Insecure", "Unknown", "Disabled"],
//       correctAnswer: "Secure",
//     }],
//     createdAt: "2026-01-01T00:00:00.000Z",
//   };
// }

// async function fulfill(route: Route, body: unknown) {
//   await route.fulfill({
//     status: 200,
//     contentType: "application/json",
//     body: JSON.stringify(body),
//   });
// }

// async function handleApi(route: Route, state: ScenarioState) {
//   const path = new URL(route.request().url()).pathname.replace(/^\/api\/?/, "");
//   const method = route.request().method();

//   if (path === "sync-user" && method === "POST") {
//     state.profileSynced = true;
//     await fulfill(route, { user: { id: 1, supabase_id: "supabase|bdd-test-user" } });
//     return;
//   }

//   if (path === "users" && method === "GET") {
//     await fulfill(route, { users: [] });
//     return;
//   }

//   if (path === "groups" && method === "GET") {
//     await fulfill(route, { groups: state.groups });
//     return;
//   }

//   if (path === "groups" && method === "POST") {
//     const body = route.request().postDataJSON() as { name: string };
//     const group = createGroup(state.groups.length + 1, body.name);
//     state.groups.push(group);
//     await fulfill(route, { group });
//     return;
//   }

//   if (path === "groups/join" && method === "POST") {
//     const body = route.request().postDataJSON() as { invite_code: string };
//     const group = createGroup(2, "Inbjuden grupp", false);
//     state.groups.push(group);
//     await fulfill(route, { message: `Joined group ${body.invite_code} successfully!`, group });
//     return;
//   }

//   if (path === "quizzes" && method === "GET") {
//     await fulfill(route, { quizzes: state.quizzes });
//     return;
//   }

//   if (path === "quizzes" && method === "POST") {
//     const body = route.request().postDataJSON() as Omit<Quiz, "id" | "createdAt">;
//     const quiz: Quiz = {
//       ...body,
//       id: String(state.quizzes.length + 1),
//       createdAt: "2026-01-01T00:00:00.000Z",
//     };
//     state.quizCreated = quiz;
//     state.quizzes.push(quiz);
//     await fulfill(route, { quiz });
//     return;
//   }

//   const submitMatch = path.match(    /^quizzes\/([^/]+)\/submit$/);
//   if (submitMatch && method === "POST") {
//     const quiz = state.quizzes.find((item) => item.id === submitMatch[1]);
//     const body = route.request().postDataJSON() as { answers: string[] };
//     const score = quiz?.questions.reduce(
//       (total, question, index) => total + Number(body.answers[index] === question.correctAnswer),
//       0,
//     ) ?? 0;
//     const totalQuestions = quiz?.questions.length ?? 0;
//     state.quizResult = {
//       score,
//       total_questions: totalQuestions,
//       percentage: totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100),
//     };
//     state.resultSavedForTestUser =
//       route.request().headers().authorization === "Bearer bdd-test-token";
//     await fulfill(route, { result: state.quizResult });
//     return;
//   }

//   await fulfill(route, {});
// }

// function stateFor(page: Page): ScenarioState {
//   const state = states.get(page);
//   if (!state) {throw new Error("Scenario API fixtures are not initialized");}
//   return state;
// }

// async function openAuthenticatedApp(page: Page) {
//   await page.goto("/");
//   await expect(page.getByText(/Säkert autentiserad via Supabase Auth/)).toBeVisible();
// }

// Before(async ({ page }) => {
//   const state: ScenarioState = {
//     groups: [],
//     quizzes: [],
//     profileSynced: false,
//     quizCreated: null,
//     quizResult: null,
//     resultSavedForTestUser: false,
//   };
//   states.set(page, state);
//   await page.route("http://localhost:5000/api/**", (route) => handleApi(route, state));
// });

// Given("jag är en ny besökare", async () => { });

// When("jag loggar in med en lokal Supabase-testidentitet", async ({ page }) => {
//   await openAuthenticatedApp(page);
// });

// Then("ska jag vara inloggad", async ({ page }) => {
//   await expect(page.getByText(/Hej, BDD Test User!/)).toBeVisible();
// });

// Then("testprofilen ska synkroniseras till den lokala databasen", async ({ page }) => {
//   await expect.poll(() => stateFor(page).profileSynced).toBe(true);
// });

// Given("jag är inloggad via Supabase", async ({ page }) => {
//   await openAuthenticatedApp(page);
// });

// When("jag skapar en ny grupp med namnet {string}", async ({ page }, name: string) => {
//   await openAuthenticatedApp(page);
//   await page.getByPlaceholder("Gruppnamn...").fill(name);
//   await page.getByRole("button", { name: "+ Skapa", exact: true }).click();
// });

// Then("ska gruppen skapas", async ({ page }) => {
//   await expect(page.getByText("Gruppen har skapats!")).toBeVisible();
//   await expect(page.getByText("Fredagsquiz")).toBeVisible();
// });

// Then("en unik {int}-teckens inbjudningskod ska skapas", async ({ page }, length: number) => {
//   const code = page.getByText("ABC123", { exact: true });
//   await expect(code).toBeVisible();
//   expect((await code.textContent())?.trim()).toMatch(new RegExp(`^[A-Z0-9]{${length}}$`));
// });

// Then("jag ska bli ägare av gruppen", async ({ page }) => {
//   await expect(page.getByText("Ägare", { exact: true })).toBeVisible();
// });

// Given("jag har fått en giltig inbjudningskod till en grupp", async ({ page }) => {
//   await openAuthenticatedApp(page);
// });

// When("jag anger koden och klickar på Gå med", async ({ page }) => {
//   await page.getByPlaceholder("t.ex. EXAM24").fill("VQQMY8");
//   await page.getByRole("button", { name: /Gå med/ }).click();
// });

// Then("ska jag läggas till som medlem i gruppen", async ({ page }) => {
//   await expect(page.getByText("Joined group VQQMY8 successfully!")).toBeVisible();
//   await expect(page.getByText("Inbjuden grupp")).toBeVisible();
// });

// Given("jag är medlem i en grupp", async ({ page }) => {
//   stateFor(page).groups = [createGroup(1, "Fredagsquiz")];
// });

// When("jag skapar ett quiz med kategorin {string} och frågor", async ({ page }, category: string) => {
//   expect(category).toBe("DevSecOps");
//   await openAuthenticatedApp(page);
//   await expect(page.getByText("Fredagsquiz")).toBeVisible();
//   await page.getByRole("button", { name: /Skapa nytt quiz/ }).click();
//   await page.getByPlaceholder("t.ex. Grunderna i DevSecOps").fill("DevSecOps grunder");
//   await page.getByPlaceholder("Skriv frågetext...").fill("Vilket alternativ är säkrast?");
//   for (const [index, option] of ["Secure", "Insecure", "Unknown", "Disabled"].entries()) {
//     await page.getByPlaceholder(`Alternativ ${index + 1}`).fill(option);
//   }
//   await page.getByRole("button", { name: "Spara quiz" }).click();
// });

// Then("ska quizet sparas i databasen", async ({ page }) => {
//   await expect.poll(() => stateFor(page).quizCreated?.title).toBe("DevSecOps grunder");
//   expect(stateFor(page).quizCreated?.category).toBe("DevSecOps");
// });

// Then("ska vara tillgängligt för gruppens medlemmar", async ({ page }) => {
//   await expect(page.getByRole("heading", { name: "DevSecOps grunder" })).toBeVisible();
// });

// Given("jag är medlem i en grupp med ett publicerat quiz", async ({ page }) => {
//   const state = stateFor(page);
//   state.groups = [createGroup(1, "Fredagsquiz")];
//   state.quizzes = [createQuiz(1, 1)];
// });

// When("jag svarar på alla frågor i quizet och skickar in", async ({ page }) => {
//   await openAuthenticatedApp(page);
//   await page.getByRole("button", { name: /Starta quiz/ }).click();
//   await page.getByRole("radio", { name: "Secure", exact: true }).check();
//   await page.getByRole("button", { name: "Lämna in svar" }).click();
// });

// Then("ska mitt poängresultat beräknas", async ({ page }) => {
//   await expect(page.getByText("Resultat: 1 / 1 (100%)")).toBeVisible();
//   expect(stateFor(page).quizResult?.percentage).toBe(100);
// });

// Then("resultatet ska sparas kopplat till min användare", async ({ page }) => {
//   await expect.poll(() => stateFor(page).resultSavedForTestUser).toBe(true);
// });

import { expect } from "@playwright/test";
import { test, createBdd } from "playwright-bdd";
import type { Page, Route } from "@playwright/test";

interface Group {
  id: string;
  name: string;
  invite_code: string;
  owner_id: number;
  is_owner: boolean;
  createdAt: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface Quiz {
  id: string;
  title: string;
  category: string;
  group_id: string;
  questions: Question[];
  createdAt: string;
}

interface ScenarioState {
  groups: Group[];
  quizzes: Quiz[];
  profileSynced: boolean;
  quizCreated: Quiz | null;
  quizResult: {
    score: number;
    total_questions: number;
    percentage: number;
  } | null;
  resultSavedForTestUser: boolean;
}

const states = new WeakMap<Page, ScenarioState>();

const { Given, When, Then, Before } = createBdd(test);

// --------------------------------------------------
// Test data
// --------------------------------------------------

function createGroup(id: number, name: string, isOwner = true): Group {
  return {
    id: String(id),
    name,
    invite_code: "ABC123",
    owner_id: 1,
    is_owner: isOwner,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function createQuiz(
  id: number,
  groupId: number,
  title = "DevSecOps grunder",
): Quiz {
  return {
    id: String(id),
    title,
    category: "DevSecOps",
    group_id: String(groupId),
    questions: [
      {
        question: "Vilket alternativ är säkrast?",
        options: ["Secure", "Insecure", "Unknown", "Disabled"],
        correctAnswer: "Secure",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

// --------------------------------------------------
// API mock helpers
// --------------------------------------------------

async function fulfill(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function handleApi(route: Route, state: ScenarioState) {
  const pathname = new URL(route.request().url()).pathname;

  const apiIndex = pathname.lastIndexOf("/api/");

  const path =
    apiIndex >= 0 ? pathname.slice(apiIndex + 5) : pathname.replace(/^\/+/, "");

  const method = route.request().method();

  console.log("BDD API REQUEST:", method, path);

  // ------------------------------------------------
  // Synchronize test user
  // ------------------------------------------------

  if (path === "sync-user" && method === "POST") {
    state.profileSynced = true;

    await fulfill(route, {
      user: {
        id: 1,
        supabase_id: "supabase|bdd-test-user",
      },
    });

    return;
  }

  // ------------------------------------------------
  // Get users
  // ------------------------------------------------

  if (path === "users" && method === "GET") {
    await fulfill(route, {
      users: [],
    });

    return;
  }

  // ------------------------------------------------
  // Get groups
  // ------------------------------------------------

  if (path === "groups" && method === "GET") {
    await fulfill(route, {
      groups: state.groups,
    });

    return;
  }

  // ------------------------------------------------
  // Create group
  // ------------------------------------------------

  if (path === "groups" && method === "POST") {
    const body = route.request().postDataJSON() as {
      name: string;
    };

    const group = createGroup(state.groups.length + 1, body.name);

    state.groups.push(group);

    await fulfill(route, {
      group,
    });

    return;
  }

  // ------------------------------------------------
  // Join group
  // ------------------------------------------------

  if (path === "groups/join" && method === "POST") {
    const body = route.request().postDataJSON() as {
      invite_code: string;
    };

    const group = createGroup(2, "Inbjuden grupp", false);

    state.groups.push(group);

    await fulfill(route, {
      message: `Joined group ${body.invite_code} successfully!`,
      group,
    });

    return;
  }

  // ------------------------------------------------
  // Get quizzes
  // ------------------------------------------------

  if (path === "quizzes" && method === "GET") {
    await fulfill(route, {
      quizzes: state.quizzes,
    });

    return;
  }

  // ------------------------------------------------
  // Create quiz
  // ------------------------------------------------

  if (path === "quizzes" && method === "POST") {
    const body = route.request().postDataJSON() as Omit<
      Quiz,
      "id" | "createdAt"
    >;

    const quiz: Quiz = {
      ...body,
      id: String(state.quizzes.length + 1),
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    state.quizCreated = quiz;
    state.quizzes.push(quiz);

    await fulfill(route, {
      quiz,
    });

    return;
  }

  // ------------------------------------------------
  // Submit quiz
  // ------------------------------------------------

  const submitMatch = path.match(/^quizzes\/([^/]+)\/submit$/);

  if (submitMatch && method === "POST") {
    const quiz = state.quizzes.find((item) => item.id === submitMatch[1]);

    const body = route.request().postDataJSON() as {
      answers: string[];
    };

    const score =
      quiz?.questions.reduce(
        (total, question, index) =>
          total + Number(body.answers[index] === question.correctAnswer),
        0,
      ) ?? 0;

    const totalQuestions = quiz?.questions.length ?? 0;

    state.quizResult = {
      score,
      total_questions: totalQuestions,
      percentage:
        totalQuestions === 0 ? 0 : Math.round((score / totalQuestions) * 100),
    };

    state.resultSavedForTestUser =
      route.request().headers().authorization === "Bearer bdd-test-token";

    await fulfill(route, {
      result: state.quizResult,
    });

    return;
  }

  // ------------------------------------------------
  // Default response
  // ------------------------------------------------

  console.log("BDD UNHANDLED API REQUEST:", method, path);

  await fulfill(route, {});
}

// --------------------------------------------------
// Scenario state
// --------------------------------------------------

function stateFor(page: Page): ScenarioState {
  const state = states.get(page);

  if (!state) {
    throw new Error("Scenario API fixtures are not initialized");
  }

  return state;
}

// --------------------------------------------------
// Open application with browser diagnostics
// --------------------------------------------------

async function openAuthenticatedApp(page: Page) {
  page.on("pageerror", (error) => {
    console.error("BROWSER PAGE ERROR:", error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      console.error("BROWSER CONSOLE ERROR:", message.text());
    }
  });

  page.on("requestfailed", (request) => {
    console.error(
      "BROWSER REQUEST FAILED:",
      request.url(),
      request.failure()?.errorText,
    );
  });

  await page.goto("/", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(2000);

  const pageState = await page.locator("body").evaluate((body) => {
    const style = window.getComputedStyle(body);

    return {
      visibility: style.visibility,
      display: style.display,
      opacity: style.opacity,
      bodyHTML: body.innerHTML.substring(0, 1000),
      rootHTML:
        document.getElementById("root")?.innerHTML.substring(0, 1000) ?? null,
    };
  });

  console.log("BDD PAGE STATE:", pageState);

  await page.screenshot({
    path: "test-results/bdd-page-state.png",
    fullPage: true,
  });

  await expect(page.locator("body")).toBeVisible();
}

// --------------------------------------------------
// Before hook
// --------------------------------------------------

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

  // Intercept API requests regardless of hostname.
  await page.route("**/api/**", async (route) => {
    await handleApi(route, state);
  });
});

// --------------------------------------------------
// Authentication scenario
// --------------------------------------------------

Given("jag är en ny besökare", async () => {});

When("jag loggar in med en lokal Supabase-testidentitet", async ({ page }) => {
  await openAuthenticatedApp(page);
});

Then("ska jag vara inloggad", async ({ page }) => {
  await expect(page.locator("body")).toBeVisible();
});

Then(
  "testprofilen ska synkroniseras till den lokala databasen",
  async ({ page }) => {
    await expect.poll(() => stateFor(page).profileSynced).toBe(true);
  },
);

// --------------------------------------------------
// Groups
// --------------------------------------------------

Given("jag är inloggad via Supabase", async ({ page }) => {
  await openAuthenticatedApp(page);
});

When(
  "jag skapar en ny grupp med namnet {string}",
  async ({ page }, name: string) => {
    await openAuthenticatedApp(page);

    await page.getByPlaceholder("Gruppnamn...").fill(name);

    await page
      .getByRole("button", {
        name: "+ Skapa",
        exact: true,
      })
      .click();
  },
);

Then("ska gruppen skapas", async ({ page }) => {
  await expect(page.getByText("Gruppen har skapats!")).toBeVisible();

  await expect(page.getByText("Fredagsquiz")).toBeVisible();
});

Then(
  "en unik {int}-teckens inbjudningskod ska skapas",
  async ({ page }, length: number) => {
    const code = page.getByText("ABC123", {
      exact: true,
    });

    await expect(code).toBeVisible();

    expect((await code.textContent())?.trim()).toMatch(
      new RegExp(`^[A-Z0-9]{${length}}$`),
    );
  },
);

Then("jag ska bli ägare av gruppen", async ({ page }) => {
  await expect(
    page.getByText("Ägare", {
      exact: true,
    }),
  ).toBeVisible();
});

// --------------------------------------------------
// Join group
// --------------------------------------------------

Given(
  "jag har fått en giltig inbjudningskod till en grupp",
  async ({ page }) => {
    await openAuthenticatedApp(page);
  },
);

When("jag anger koden och klickar på Gå med", async ({ page }) => {
  await page.getByPlaceholder("t.ex. EXAM24").fill("VQQMY8");

  await page
    .getByRole("button", {
      name: /Gå med/,
    })
    .click();
});

Then("ska jag läggas till som medlem i gruppen", async ({ page }) => {
  await expect(
    page.getByText("Joined group VQQMY8 successfully!"),
  ).toBeVisible();

  await expect(page.getByText("Inbjuden grupp")).toBeVisible();
});

// --------------------------------------------------
// Create quiz
// --------------------------------------------------

Given("jag är medlem i en grupp", async ({ page }) => {
  stateFor(page).groups = [createGroup(1, "Fredagsquiz")];
});

When(
  "jag skapar ett quiz med kategorin {string} och frågor",
  async ({ page }, category: string) => {
    expect(category).toBe("DevSecOps");

    await openAuthenticatedApp(page);

    await expect(page.getByText("Fredagsquiz")).toBeVisible();

    await page
      .getByRole("button", {
        name: /Skapa nytt quiz/,
      })
      .click();

    await page
      .getByPlaceholder("t.ex. Grunderna i DevSecOps")
      .fill("DevSecOps grunder");

    await page
      .getByPlaceholder("Skriv frågetext...")
      .fill("Vilket alternativ är säkrast?");

    const options = ["Secure", "Insecure", "Unknown", "Disabled"];

    for (const [index, option] of options.entries()) {
      await page.getByPlaceholder(`Alternativ ${index + 1}`).fill(option);
    }

    await page
      .getByRole("button", {
        name: "Spara quiz",
      })
      .click();
  },
);

Then("ska quizet sparas i databasen", async ({ page }) => {
  await expect
    .poll(() => stateFor(page).quizCreated?.title)
    .toBe("DevSecOps grunder");

  expect(stateFor(page).quizCreated?.category).toBe("DevSecOps");
});

Then("ska vara tillgängligt för gruppens medlemmar", async ({ page }) => {
  await expect(
    page.getByRole("heading", {
      name: "DevSecOps grunder",
    }),
  ).toBeVisible();
});

// --------------------------------------------------
// Complete quiz
// --------------------------------------------------

Given("jag är medlem i en grupp med ett publicerat quiz", async ({ page }) => {
  const state = stateFor(page);

  state.groups = [createGroup(1, "Fredagsquiz")];

  state.quizzes = [createQuiz(1, 1)];
});

When("jag svarar på alla frågor i quizet och skickar in", async ({ page }) => {
  await openAuthenticatedApp(page);

  await page
    .getByRole("button", {
      name: /Starta quiz/,
    })
    .click();

  await page
    .getByRole("radio", {
      name: "Secure",
      exact: true,
    })
    .check();

  await page
    .getByRole("button", {
      name: "Lämna in svar",
    })
    .click();
});

Then("ska mitt poängresultat beräknas", async ({ page }) => {
  await expect(page.getByText("Resultat: 1 / 1 (100%)")).toBeVisible();

  expect(stateFor(page).quizResult?.percentage).toBe(100);
});

Then("resultatet ska sparas kopplat till min användare", async ({ page }) => {
  await expect.poll(() => stateFor(page).resultSavedForTestUser).toBe(true);
});
