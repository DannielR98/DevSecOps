# Säkerhetsanalys och Hotmodellering – DevSecOps Quiz-plattform

Detta dokument utgör projektets samlade säkerhetsanalys, hotmodellering (STRIDE / OWASP), verifieringsplan, incidenthanteringsplan och statusredovisning för kursens sju delar.

---

## 1. Inledning, systemavgränsning och dataflödesdiagram (DFD)

### 1.1 Syfte och avgränsning
Syftet med hotmodelleringen är att systematiskt identifiera skyddsvärda tillgångar, förtroendegränser (*Trust Boundaries*), attackytor och hot i Quiz-plattformen, samt att koppla dessa till genomförda och planerade säkerhetsåtgärder enligt **Shift Left**-principen.

Projektet omfattar **två backend-arkitekturer** som delar samma React-frontend och autentiseringslösning (Supabase Auth):
1. **Moln-/Serverless-arkitektur (Primär produktionsmiljö i AWS)**: React-frontend (byggd via `Dockerfile.prod` med Nginx och driftsatt på **AWS EC2** via **Amazon ECR** och **AWS Systems Manager / SSM**), **Amazon API Gateway (HTTP API)**, **AWS Lambda** (Node.js 22, en funktion per endpoint) och **Amazon DynamoDB** (med *Point-in-Time Recovery* och `UniqueKeys`-låstabell), definierat som *Infrastructure as Code* i [`serverless/template.yaml`](./serverless/template.yaml).
2. **Containeriserad Express-arkitektur (Lokal referens- och utvecklingsmiljö)**: React-frontend, **Express.js REST API** och **PostgreSQL 16** med Sequelize ORM, orkestrerat med **Docker Compose** i [`docker-compose.yaml`](./docker-compose.yaml).

**Utanför projektets direkta kontroll (Shared Responsibility Model):**
- Underliggande drift av **Supabase Auth** (identitetsleverantör och JWKS-endpoint) samt **AWS-infrastruktur** (fysisk säkerhet, hypervisor, hanterade tjänster). Projektgruppen ansvarar för IAM-roller, CORS, JWT-validering, objektsauktorisation (BOLA), tabellkonfiguration och CI/CD-hemligheter.

### 1.2 Dataflödesdiagram (DFD) och förtroendegränser (Trust Boundaries)

```mermaid
flowchart TB
    subgraph TB1["Trust Boundary 1: Publikt Internet / Klient (Obetrodd zon)"]
        User["Slutanvändare (Webbläsare)"]
        SPA["React SPA (Vite / Nginx på EC2)"]
    end

    subgraph TB2["Trust Boundary 2: Extern Identitetsleverantör (Tredjepart)"]
        SupaAuth["Supabase Auth (IdP & JWKS)"]
    end

    subgraph TB3["Trust Boundary 3: Applikations- & API-lager (AWS Serverless / Express)"]
        APIGW["API Gateway HTTP API (CORS & Throttling) / Express CORS"]
        AuthMW["JWT-verifiering (JWKS ES256/RS256 & HS256) + Zod-validering"]
        Handlers["Affärslogik: Lambda-handlers / Express-routes (Ägar- & medlemskontroll)"]
    end

    subgraph TB4["Trust Boundary 4: Datalager (Isolerad persistens)"]
        DDB[("Amazon DynamoDB (PITR, IAM Least Privilege)")]
        PG[("PostgreSQL 16 (Docker-nätverk / Volym)")]
    end

    subgraph TB5["Trust Boundary 5: CI/CD & Leveranskedja (GitHub Actions)"]
        GHA["GitHub Actions (Gitleaks, npm audit, ESLint, Vitest, Semgrep)"]
        Registries["GHCR & Amazon ECR (Docker Images)"]
        Deploy["AWS SAM Deploy & SSM Run Command (OIDC AssumeRole)"]
    end

    User -->|"1. HTTPS / Inloggning"| SPA
    SPA -->|"2. Autentisering (e-post/lösenord)"| SupaAuth
    SupaAuth -->|"3. Signerad JWT (Access Token)"| SPA
    SPA -->|"4. HTTPS + Authorization: Bearer <JWT>"| APIGW
    APIGW -->|"5. Request throttling & routing"| AuthMW
    AuthMW -->|"6. Hämta publika nycklar (.well-known/jwks.json)"| SupaAuth
    AuthMW -->|"7. Verifierad identitet (sub/email) + validerad payload"| Handlers
    Handlers -->|"8a. AWS SDK (IAM FunctionRole)"| DDB
    Handlers -->|"8b. Sequelize ORM (bind-parametrar)"| PG
    GHA -->|"9. Bygg & pusha images"| Registries
    GHA -->|"10. OIDC federerad deploy"| Deploy
    Deploy -->|"11. Uppdatera stack & container"| APIGW
    Deploy -->|"12. Uppdatera frontend"| SPA
```

### 1.3 Sammanfattning av förtroendegränser
- **TB1 → TB2 (Klient till Supabase Auth):** Användaruppgifter skickas direkt över HTTPS till Supabase. Lösenord passerar inte projektets primära inloggningsflöde i frontend.
- **TB1 → TB3 (Klient till API):** Alla skyddade API-anrop korsar gränsen från en obetrodd webbläsare till API Gateway / Express. Varje anrop måste autentiseras via `Authorization: Bearer <token>` och kontrolleras mot objektägarskap/gruppmedlemskap.
- **TB3 → TB4 (API till Databas):** Lambda-funktioner använder en dedikerad IAM-roll (`FunctionRole`) begränsad till specifika DynamoDB-tabeller och index. Express-backenden kommunicerar med PostgreSQL via Sequelize ORM med parametriserade frågor.
- **TB5 → TB3/TB4 (CI/CD till Molnmiljö):** GitHub Actions autentiserar mot AWS via OIDC (`aws-actions/configure-aws-credentials` med `role-to-assume`) och publicerar endast efter att säkerhetskontroller (Gitleaks, SCA, Lint, enhetstester och Semgrep SAST) passerat.

---

## 2. Tillgångar och skyddsvärde

| Tillgång | Exempel / plats | Konfidentialitet | Integritet | Tillgänglighet |
|---|---|---|---|---|
| **Identiteter och profiluppgifter** | E-post, användarnamn, för-/efternamn, `auth_id` och `user_id` i `Users` (DynamoDB) / `users` (PostgreSQL) | Hög | Hög | Medel |
| **Autentiseringsuppgifter och sessioner** | Lösenord hos Supabase Auth (och ev. bcrypt-hash vid lokal/legacy auth); signerad JWT i klientens session | Hög | Mycket hög | Hög |
| **Signerings-, API- och molnhemligheter** | `SUPABASE_JWT_SECRET`, `JWT_SECRET`, `AWS_ROLE_ARN`, databaskonton | Mycket hög | Mycket hög | Hög |
| **Grupper och inbjudningskoder** | Gruppnamn, `owner_id`, medlemslista (`GroupMembers`), 6-teckens `invite_code` och `UniqueKeys` | Medel | Hög | Medel |
| **Quizinnehåll och facit** | Frågor, svarsalternativ och `correctAnswer` i `Quizzes` / `quizzes` | Medel | Hög | Medel |
| **Quizresultat och topplistor** | Poäng, procent, antal försök (`attempt_count`), `user_id`, `quiz_id` och tidsstämpel i `QuizResults` | Hög | Hög | Medel |
| **Databas och driftkonfiguration** | DynamoDB-tabeller (med PITR), PostgreSQL-volym, `template.yaml`, Dockerfiles, EC2/Nginx-konfiguration | Hög | Mycket hög | Hög |
| **Källkod och CI/CD-leveranskedja** | GitHub-repo, `.github/workflows/ci-cd.yaml`, npm-beroenden, GHCR- och ECR-images | Medel | Mycket hög | Hög |

---

## 3. Attackytor och riskprioritering (STRIDE & OWASP)

Skala: **Sannolikhet (S)** och **Konsekvens (K)** anges på skalan 1–5. **Riskvärde = S × K**: 1–4 Låg, 5–9 Medel, 10–15 Hög, 16–25 Kritisk. Tabellen redovisar både **ursprunglig risk (före åtgärd)** och **aktuellt nuläge i repot (kvarvarande risk)**.

| ID / hot (STRIDE, OWASP) | Attackväg och möjlig konsekvens | Ursprunglig risk (S × K) | Nuläge och genomförda åtgärder i repot | Kvarvarande risk & nästa steg |
|---|---|---:|---|---|
| **T1 – BOLA/IDOR och obehörig dataexponering** (`E`, `I` – OWASP API1/API5, A01) | Manipulera UUID i `/api/user/:user_id`, `/api/groups/:groupId`, `/api/quizzes/:id` eller `/api/quizzes/:id/results` för att läsa andras profilfält, quizfacit eller resultat över gruppgränser. | 4 × 5 = **20 (Kritisk)** | **Åtgärdat i både Express och Serverless:** `GET /api/users`, `GET /api/user/:user_id` och `POST /api/sync-user` kräver nu giltig JWT (`checkJwt` / `authenticate`) och exkluderar alltid `password`. `sync-user` hämtar identitet från verifierad token (`sub`) istället för request body. Grupp-, quiz- och resultat-endpoints (`?view=mine` och `?view=leaderboard`) kontrollerar gruppmedlemskap/ägarskap innan data hämtas. Verifierat i [`profileSecurity.test.js`](./backend/tests/auth/profileSecurity.test.js) och [`quizResults.test.js`](./backend/tests/quizzes/quizResults.test.js). | 2 × 4 = **8 (Medel)**. Begränsa `GET /api/users` ytterligare om full användarlista inte behövs i klienten, samt dölj `correctAnswer` i `GET /api/quizzes/:id` tills quizet rättas. |
| **T2 – Tokenförfalskning, kapning eller test-bypass** (`S` – OWASP A07, API2) | Stulen JWT eller utnyttjande av svag test-fallback (t.ex. tokens som innehåller `"test"`) ger obehörig åtkomst som valfri användare. Session i webbläsaren kan läsas vid ev. XSS. | 3 × 5 = **15 (Hög)** | **Åtgärdat:** Test-bypassen för tokens med `"test"` är borttagen i både [`backend/middleware/supabaseAuth.js`](./backend/middleware/supabaseAuth.js) och [`serverless/src/lib/auth.js`](./serverless/src/lib/auth.js). Båda verifierar asymmetriska Supabase-tokens mot JWKS (`ES256`/`RS256`) med `jose` och har kontrollerad HMAC-verifiering. Negativa tester verifierar att ogiltiga tokens och `"invalid-test-token"` ger `401`. | 2 × 4 = **8 (Medel)**. Säkerställ kort livslängd på access-tokens och flytta Lambda-hemligheter från `NoEcho`-parametrar till AWS SSM Parameter Store / Secrets Manager vid skarp produktion. |
| **T3 – Skadligt användarinnehåll / Stored XSS** (`T`, `E` – OWASP A03, API8) | Skadligt gruppnamn, quiztitel, fråga eller svarsalternativ sparas i databasen och exekveras i andra gruppmedlemmars webbläsare. | 3 × 4 = **12 (Hög)** | Zod-scheman i [`ValidationForSchemas.js`](./backend/validations/ValidationForSchemas.js) och serverless-validering begränsar typer, format och stränglängder. React escape:ar textinnehåll automatiskt vid rendering och `dangerouslySetInnerHTML` används inte. | 2 × 4 = **8 (Medel)**. Komplettera `nginx.conf` i `Dockerfile.prod` med strikt `Content-Security-Policy` (CSP), `X-Content-Type-Options: nosniff` och `X-Frame-Options: DENY`. |
| **T4 – API brute force, gissning av inbjudningskod & DoS** (`D` – OWASP A04/A05, API4) | Automatiserade anrop mot inloggning, registrering eller `/api/groups/join` för att gissa 6-teckens inbjudningskoder eller överbelasta API/databas. | 3 × 4 = **12 (Hög)** | **Delvis åtgärdat (löst i Serverless):** I [`serverless/template.yaml`](./serverless/template.yaml) har API Gateway `ThrottlingBurstLimit: 50`, `ThrottlingRateLimit: 25` och strikt CORS (`AllowOrigins: [!Ref AllowedOrigin]`). Inbjudningskoder genereras kryptografiskt. I Express (`backend/app.js`) är lokal ` register`/`login` utkommenterad till förmån för Supabase Auth. | 2 × 3 = **6 (Medel)** i AWS; **12 (Hög)** i fristående Express. Lägg till `express-rate-limit` och origin-allowlist i `backend/app.js` om Express-backenden ska exponeras publikt. |
| **T5 – SQL-/NoSQL-injektion och datakorruption** (`T` – OWASP A03) | Manipulerad indata förändrar databasfrågor i PostgreSQL eller nyckelstrukturer i DynamoDB, eller skapar dubbletter vid samtidiga anrop (*race conditions*). | 2 × 5 = **10 (Hög)** | **Åtgärdat:** Express använder Sequelize modellmetoder (parametriserade frågor) och UUID-validering (`zod` / `uuid`). Serverless använder DynamoDB `DocumentClient` med typade nycklar och transaktionella låsposter i `UniqueKeysTable` (`email#`, `username#`, `auth#`, `invite#`) för att garantera unikhet. | 1 × 5 = **5 (Medel)**. Bibehåll Semgrep SAST i CI för att fånga eventuell framtida rå SQL eller osäker serialisering. |
| **T6 – Sårbara beroenden och CI/CD supply-chain-angrepp** (`T`, `E` – OWASP A06, A08) | Sårbara npm-paket, läckta hemligheter i git-historiken eller komprometterade byggsteg leder till skadlig kod i produktionsimages eller AWS-miljön. | 3 × 5 = **15 (Hög)** | **Åtgärdat i CI/CD:** [`.github/workflows/ci-cd.yaml`](./.github/workflows/ci-cd.yaml) kör `npm ci`, `npm audit --audit-level=high` och `npm run lint` i alla tre paket (`frontend/quiz`, `backend`, `serverless`), Gitleaks secret scanning, enhetstester samt Semgrep SAST. AWS-deploy sker endast på `main` efter grön CI via kortlivade OIDC-tokens (`role-to-assume`). | 2 × 4 = **8 (Medel)**. Pinna GitHub Actions till fulla commit-SHA, aktivera Dependabot och lägg till container image scanning (t.ex. Trivy) före push till ECR/GHCR. |
| **T7 – Hemlighetsläcka och osäker driftskonfiguration** (`S`, `T`, `D` – OWASP A05) | Incheckade `.env`-filer, exponerade databasportar (`5437`/`5054`) eller utvecklingsservrar i produktion ger obehörig åtkomst till data eller infrastruktur. | 3 × 5 = **15 (Hög)** | **Åtgärdat:** `.env`-filer är untracked i `.gitignore` och dokumenterade via `.env.example`. Gitleaks skannar hela git-historiken (`fetch-depth: 0`). För produktion har `frontend/quiz/Dockerfile.prod` införts (multi-stage build till statiska filer i `nginx:1.27-alpine`), och databasen i AWS (DynamoDB) har inga publika portar och har `PointInTimeRecoveryEnabled: true`. | 2 × 4 = **8 (Medel)**. Rotera nycklar som tidigare funnits i äldre commits, och kör container-processer som icke-root i Dockerfiles. |

**STRIDE-förklaring:** `S` = Spoofing (Identitetsförfalskning), `T` = Tampering (Manipulering), `R` = Repudiation (Förnekande), `I` = Information Disclosure (Informationsläckage), `D` = Denial of Service (Tillgänglighetsattack), `E` = Elevation of Privilege (Rättighetseskalering).

---

## 4. Prioriterad åtgärdsplan (Shift Left) och genomförandestatus

| Prioritet | Åtgärd | Status | Bevis i repot |
|---|---|---|---|
| **P0 – Kritisk** | Stäng oautentiserad åtkomst på `/api/users`, `/api/user/:user_id` och `/api/sync-user`; exkludera `password` och verifiera ägarskap vid uppdatering/radering. | ✅ **Genomfört** | [`backend/Api/UserRoute/getUsers.js`](./backend/Api/UserRoute/getUsers.js), [`getUserById.js`](./backend/Api/UserRoute/getUserById.js), [`syncUser.js`](./backend/Api/UserRoute/syncUser.js), [`serverless/src/handlers/`](./serverless/src/handlers) samt [`profileSecurity.test.js`](./backend/tests/auth/profileSecurity.test.js). |
| **P0 – Kritisk** | Ta bort osäker `"test"`-token-bypass i JWT-verifiering och kräv giltig signatur (JWKS eller kryptografisk hemlighet). | ✅ **Genomfört** | [`backend/middleware/supabaseAuth.js`](./backend/middleware/supabaseAuth.js), [`serverless/src/lib/auth.js`](./serverless/src/lib/auth.js) och [`serverless/tests/auth.test.js`](./serverless/tests/auth.test.js). |
| **P0 – Kritisk** | Säkerställ gruppmedlems-/ägarkontroll på alla grupp-, quiz- och resultat-endpoints (`mine` & `leaderboard`). | ✅ **Genomfört** | [`backend/Api/Quizzes/getQuizResults.js`](./backend/Api/Quizzes/getQuizResults.js), [`serverless/src/handlers/getQuizResults.js`](./serverless/src/handlers/getQuizResults.js) samt [`quizResults.test.js`](./backend/tests/quizzes/quizResults.test.js). |
| **P1 – CI/CD** | Aktivera ESLint, `npm audit --audit-level=high`, enhetstester, Gitleaks och Semgrep SAST för frontend, backend och serverless i CI. | ✅ **Genomfört** | [`.github/workflows/ci-cd.yaml`](./.github/workflows/ci-cd.yaml) (steg 0–3). |
| **P1 – Moln & Drift** | Produktionsanpassad frontend-container (`Dockerfile.prod` med Nginx), API Gateway throttling/CORS, IAM least-privilege och DynamoDB Point-in-Time Recovery. | ✅ **Genomfört** | [`frontend/quiz/Dockerfile.prod`](./frontend/quiz/Dockerfile.prod), [`serverless/template.yaml`](./serverless/template.yaml) och AWS-deployjobben i `ci-cd.yaml`. |
| **P2 – Förbättring** | DAST-skanning (OWASP ZAP), CSP/säkerhetsheaders i Nginx, container image scanning (Trivy) och SHA-pinnade GitHub Actions. | 🔄 **Planerat / Delvis** | Dokumenterat som rekommenderade nästa steg i avsnitt 5 och 7. |

---

## 5. Verifieringsplan och nulägesstatus

Verifiering utförs automatiskt vid varje push och pull request i GitHub Actions samt lokalt mot isolerade testmiljöer (Vitest med mockad/in-memory-databas respektive DynamoDB Local i Docker).

| Kontroll | Hur verifieras | Nuläge i repot / Resultat |
|---|---|---|
| **Enhetstester & API-auktorisation** | `npm test` i `backend/` (11 testsviter), `serverless/` och `frontend/quiz/`. Prövar `401` (saknad/ogiltig token), `403` (icke-medlem/fel ägare), `400` (ogiltig UUID/Zod) och `200`/`201`. | **Aktivt i CI och verifierat.** Omfattar bl.a. `profileSecurity.test.js`, `quizResults.test.js`, `groups.test.js`, `quizzesCrud.test.js` samt serverless handler-/auth-/repo-tester. |
| **Statisk kodanalys (SAST) & Linting** | Semgrep (`semgrep/semgrep-action@v1`) och ESLint (`npm run lint`) i `frontend/quiz`, `backend` och `serverless`. | **Aktivt i CI.** Stoppar bygget vid lint-fel eller sårbara kodmönster. |
| **Beroendekontroll (SCA) & Hemligheter** | `npm audit --audit-level=high` i samtliga tre paket samt Gitleaks (`gitleaks/gitleaks-action@v2` med `.gitleaks.toml`). | **Aktivt i CI.** Alla paket använder `npm ci` med låsfiler (`package-lock.json`). |
| **BDD / E2E-tester** | Gherkin-scenarier i `frontend/quiz/e2e/features/` körs med Playwright (`npm run test:ui`). | **Delvis aktivt.** Scenarier och Playwright-installation finns i CI, men själva E2E-körningssteget är för närvarande utkommenterat i `ci-cd.yaml` och körs lokalt. |
| **Container & Infrastruktur (IaC)** | `docker compose up --build` för lokal stack; `Dockerfile.prod` + `serverless/template.yaml` för produktionsstack i AWS. | **Genomfört.** Separerar lokal utvecklings-Compose från produktions-Dockerfile (`Dockerfile.prod`) och AWS SAM-mall. |
| **Molndeployment (CD)** | Automatisk deploy vid push till `main` (efter grön CI): `sam deploy` till `quiz-serverless` och containerdeploy till ECR + EC2 via SSM. | **Aktivt i `.github/workflows/ci-cd.yaml`** (`deploy-backend-aws` och `deploy-frontend-aws`). |
| **DAST (Dynamisk API-/webbskanning)** | OWASP ZAP baseline scan mot lokal testinstans eller staging-URL. | **Kvarstår som manuell/framtida kontroll** (se avgränsningar i avsnitt 7). |

### 5.1 Genomförd SAST-, SCA- och AI-säkerhetsgranskning samt åtgärdade fynd

Vid exekvering av **Semgrep CLI (`semgrep scan --config auto`)**, **npm audit (SCA)** och **AI-assisterad kodgranskning** mot hela kodbasen identifierades och åtgärdades följande fynd:

1. **Applikationskod i `serverless/`, `backend/` och `frontend/quiz/src/` (0 SAST-fynd efter åtgärd):**
   - Inga sårbarheter för SQL/NoSQL-injektion, kommandoinjektion, XSS (`dangerouslySetInnerHTML`) eller osäker autentisering hittades i vare sig AWS Lambda-handlers (`serverless/src/`), Express-routes (`backend/Api/`) eller React-applikationen (`frontend/quiz/src/`).
2. **Upptäckta och åtgärdade Semgrep SAST-fynd (`0 Code Findings` efter fix):**
   - **`dockerfile.security.missing-user` (`backend/Dockerfile`, `frontend/quiz/Dockerfile`) – ✅ Åtgärdat:** Semgrep flaggade att utvecklings-Dockerfiles saknade `USER`-direktiv och därmed körde som `root`. Vi lade till `COPY --chown=node:node . .` och `USER node` i båda Dockerfiles så att containrarna kör som icke-privilegierad användare.
   - **`bypass-tls-verification` (`backend/config/database.js`, `backend/database/database.js`) – ✅ Åtgärdat:** Semgrep flaggade hårdkodat `rejectUnauthorized: false` i PostgreSQL SSL-konfigurationen (risk för Man-in-the-Middle-attacker om CA-certifikat inte valideras). Vi ändrade detta till att som standard kräva certifikatverifiering (`process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"`). Vid förnyad körning av Semgrep mot `backend`, `serverless` och `frontend` rapporteras **0 SAST-fynd**.
3. **Beroendeskanning med `npm audit` (SCA – `0 vulnerabilities` i samtliga paket):**
   - `frontend/quiz`: **0 sårbarheter** (`minimatch` uppdaterad till `^11.0.1` via `overrides` i Issue #55 / PR #58).
   - `backend`: **0 sårbarheter** (`minimatch` `^11.0.1` och `uuid` `^11.1.1` via `overrides`).
   - `serverless`: **0 sårbarheter** (efter att vi även lagt till `"overrides": { "minimatch": "^11.0.1" }` i [`serverless/package.json`](./serverless/package.json) och uppdaterat [`serverless/package-lock.json`](./serverless/package-lock.json)).
4. **Kvarvarande observation i CI-workflow (`github-actions-mutable-action-tag`):**
   - I [`.github/workflows/ci-cd.yaml`](./.github/workflows/ci-cd.yaml) refereras GitHub Actions med versions-taggar (t.ex. `actions/checkout@v4`) istället för 40-teckens commit-SHA. *Triagering:* Dokumenterat under `T6` (Supply-chain); acceptabelt inom kursprojektet men rekommenderas att SHA-pinnas i skarp produktionsmiljö.

### Verifierade BDD- och säkerhetsscenarier (Gherkin)

```gherkin
Feature: Åtkomstkontroll och objektsbehörighet (BOLA)
  Scenario: Oautentiserad klient eller test-token nekas åtkomst till användardata
    When klienten anropar GET /api/users utan token eller med "Bearer invalid-test-token"
    Then svarar API:t med status 401
    And inga användaruppgifter eller lösenordshashar returneras

  Scenario: Användare kan endast uppdatera eller radera sin egen profil
    Given användare A är inloggad med giltig Supabase-JWT
    When användare A anropar PUT /api/update-user/<användare_B_uuid>
    Then svarar API:t med status 403
    And användare B:s profil förblir oförändrad

  Scenario: Icke-medlem nekas åtkomst till gruppspecifika quiz och resultat
    Given användare A är medlem i grupp A men inte i grupp B
    When användare A anropar GET /api/quizzes/<grupp_B_quiz_id>/results?view=leaderboard
    Then svarar API:t med status 403
    And inga resultat eller deltagarnamn returneras
```

---

## 6. Loggning, övervakning och incidenthantering (Del 6 & 7)

### 6.1 Loggning och övervakning
- **AWS CloudWatch Logs & Metrics (Serverless-produktion):** Alla Lambda-funktioner loggar exekvering, fel och ohanterade undantag till **Amazon CloudWatch Logs** via `AWSLambdaBasicExecutionRole`. API Gateway och Lambda exponerar inbyggda mätvärden för `Count`, `4XXError`, `5XXError`, `Latency` och `ThrottledRequests` (begränsade via `ThrottlingRateLimit: 25` och `ThrottlingBurstLimit: 50`).
- **Sanering av loggar:** Felhanterare i både Express och Serverless returnerar kontrollerade felmeddelanden till klienten (via `HttpError` i serverless och standardiserade JSON-svar i Express) utan att skriva ut JWT-tokens, lösenord eller signeringsnycklar i loggarna.
- **Lokal miljö:** I Docker Compose samlas applikations- och databasloggar via `docker compose logs` och container-healthchecks (`pg_isready` för PostgreSQL).

### 6.2 Incidenthanteringsplan och simulerat scenario (Bordssimulering)
För att uppfylla kursens krav på incidentberedskap har följande rutin och bordssimulering (tabletop exercise) tagits fram för **Scenario: Misstänkt läcka av signeringsnyckel / onormalt antal `401`/`403`-svar eller brute force mot inbjudningskoder**.

1. **Upptäckt (Detection):**
   - **I CI/Git:** Gitleaks larmar och blockerar PR/push om en hemlighet (`.env`, JWT-secret eller AWS-nyckel) råkar checkas in (t.ex. historisk commit som identifierades och dokumenterades i `.gitleaks.toml`).
   - **I Drift (AWS):** Förhöjd andel `4XXError` (`401 Unauthorized` / `403 Forbidden`) eller `ThrottledRequests` (`429 Too Many Requests`) i API Gateway / CloudWatch indikerar token-manipulering eller brute force mot `/api/groups/join`.
2. **Begränsning (Containment):**
   - API Gateways inbyggda throttling (`25 req/s`, burst `50`) bromsar automatiskt högfrekventa anrop.
   - Vid misstänkt komprometterad `JWT_SECRET` eller `SUPABASE_JWT_SECRET`: rotera hemligheten omedelbart i GitHub Actions Secrets och Supabase Dashboard, samt kör om `deploy-backend-aws`-workflowet för att rulla ut den nya nyckeln till Lambda-funktionerna (vilket omedelbart invaliderar alla äldre symmetriskt signerade tokens).
   - Vid läckt inbjudningskod till en grupp: gruppägaren kan radera/återskapa gruppen eller byta inbjudningskod.
3. **Återställning (Recovery):**
   - Om data i DynamoDB skulle ha manipulerats eller raderats av en komprometterad identitet återställs tabellerna via **DynamoDB Point-in-Time Recovery (PITR)**, som är aktiverat (`PointInTimeRecoveryEnabled: true`) på samtliga sex tabeller i [`serverless/template.yaml`](./serverless/template.yaml), samt med `DeletionPolicy: Retain`.
4. **Lärdomar (Post-Incident / Lessons Learned):**
   - Efter en incident läggs ett motsvarande negativt regressionstest till i `backend/tests/` och `serverless/tests/` (såsom gjordes i `profileSecurity.test.js` efter att test-token-bypassen och de öppna profilrutterna identifierades i den första hotmodelleringen).

---

## 7. Kvarstående risker och avgränsningar

| Risk / avgränsning | Beslut och hantering inom kursprojektet |
|---|---|
| **Klientlagrad JWT i webbläsaren** | Supabase SDK lagrar sessionen i webbläsaren. Risken reduceras genom att undvika osäker HTML-rendering i React, men en fullständig övergång till `HttpOnly`-cookies + CSRF-tokens bedöms ligga utanför kursprojektets ramar och accepteras för kursdemon. |
| **Facit (`correctAnswer`) i quiz-objekt** | För gruppmedlemmar returnerar `GET /api/quizzes/:id` quizets frågor. Även om icke-medlemmar blockeras (`403`) och poängberäkning vid inlämning sker på serversidan (`POST /api/quizzes/:id/submit`), kan en tekniskt kunnig gruppmedlem inspektera nätverkstrafiken. Risken accepteras som låg/medel inom en sluten vängrupp men bör separeras vid tävlingsbruk. |
| **DAST och extern penetrationstestning** | Automatiserad SAST (Semgrep), SCA (`npm audit`), Gitleaks och integrations-/enhetstester körs i CI. Fullständig DAST (OWASP ZAP) och extern pentestning avgränsas bort från den automatiska pipelinen för att hålla byggtider och kostnader nere i kursmiljön. |
| **PostgreSQL Row-Level Security (RLS) i Express** | Express-backenden ansluter med ett applikationskonto via Sequelize och utför all auktorisation i API-lagret. Eftersom AWS-produktionen använder DynamoDB med IAM-roller, bedöms auktorisationskontroller + negativa enhetstester i applikationslagret som tillräckligt skydd. |

---

## 8. Översikt över uppgiftens sju delar

Tabellen sammanfattar hur projektet uppfyller kursens sju delmoment och var beläggen finns i repot:

| Del | Status | Belägg i repo | Kommentar / Kvarvarande |
|---|---|---|---|
| **1. Säkerhetsanalys och hotmodellering** | ✅ **Genomfört** | Detta dokument ([`SECURITY_ANALYSIS.md`](./SECURITY_ANALYSIS.md)) och [`README.md`](./README.md). | Innehåller DFD med Trust Boundaries, tillgångsanalys, STRIDE/OWASP-riskmatris (före/efter åtgärd) samt avgränsningar. |
| **2. Säkerhetsåtgärder och verifiering** | ✅ **Genomfört** | JWT-verifiering (JWKS/HMAC), objektsauktorisation (BOLA-skydd), Zod-validering, lösenordsexkludering samt sviter i `backend/tests/` och `serverless/tests/`. | De kritiska P0-fynden från den initiala analysen (`GET /api/users`, `sync-user` och `"test"`-token-bypass) är åtgärdade och täckta av negativa tester. |
| **3. Containerisering och infrastruktur** | ✅ **Genomfört** | [`docker-compose.yaml`](./docker-compose.yaml), `backend/Dockerfile`, `frontend/quiz/Dockerfile`, [`frontend/quiz/Dockerfile.prod`](./frontend/quiz/Dockerfile.prod) samt IaC i [`serverless/template.yaml`](./serverless/template.yaml). | Tydlig separation mellan lokal Docker Compose-miljö och produktionsbyggd Nginx-container / AWS SAM-infrastruktur. |
| **4. CI/CD med säkerhetskontroller** | ✅ **Genomfört** | [`.github/workflows/ci-cd.yaml`](./.github/workflows/ci-cd.yaml) och [`.gitleaks.toml`](./.gitleaks.toml). | Automatiserad pipeline med Gitleaks, `npm audit --audit-level=high`, ESLint, Vitest enhetstester, Semgrep SAST samt CD till GHCR och AWS. |
| **5. Deployment i molnmiljö** | ✅ **Genomfört** | Jobben `deploy-backend-aws` (AWS SAM → API Gateway, Lambda, DynamoDB) och `deploy-frontend-aws` (Amazon ECR + EC2 via SSM) i `ci-cd.yaml`, plus Supabase Auth. | Fullständig molndrift i AWS med OIDC-federering (`role-to-assume`), IAM least-privilege och PITR på DynamoDB. |
| **6. Loggning och övervakning** | ✅ **Genomfört (Basnivå)** | `AWSLambdaBasicExecutionRole` (CloudWatch Logs), API Gateway throttling/metrics i `template.yaml`, PostgreSQL healthcheck i `docker-compose.yaml` och sanerade felsvar. | Central loggning i AWS CloudWatch för samtliga Lambda-funktioner utan läckage av hemligheter/lösenord. |
| **7. Incidenthantering** | ✅ **Genomfört** | Avsnitt 6.2 i detta dokument + tekniska kontroller (Gitleaks, API throttling, DynamoDB PITR & `DeletionPolicy: Retain`, nyckelrotation). | Dokumenterad incidentplan och bordssimulering för nyckelläcka och brute force-angrepp. |

---

## 9. Loggbok för säkerhetskontroller och verifiering

| Datum | Commit | Kontroll / Åtgärd | Resultat och fynd | Åtgärd / Ansvarig |
|---|---|---|---|---|
| 2026-10-27 | `887fe3a` | Gitleaks secret scanning & `.env`-hantering | Upptäckte historisk exponering i äldre commit; `.env` untracked. | Lade till `.gitleaks.toml`, Gitleaks i CI och `.env.example`. |
| 2026-10-31 | `f61e6da` / `547181d` | Initial säkerhetsanalys & hotmodellering (PR #43) | Identifierade P0-risker: publika `GET /api/users`-rutter, `password`-fält i svar och `"test"`-token-bypass. | Dokumenterade STRIDE-tabell och åtgärdsplan i `SECURITY_ANALYSIS.md`. |
| 2026-11-05 | `c8bec1f` / `6445ed5` | Införande av AWS Serverless-backend, profilskydd och säkerhetstester (PR #49, #52) | Åtgärdade P0-fynd i både Express och Serverless (`checkJwt` på profilrutter, borttagen test-bypass, exkluderat lösenord). | Verifierat med `profileSecurity.test.js` och serverless-testsvit i CI. |
| 2026-11-06 | `3827b19` / `59590cb` | Linting, SCA och CI/CD-härdning (PR #51, #53) | ESLint, `npm audit --audit-level=high`, Vitest och Semgrep SAST passerar i CI för `frontend`, `backend` och `serverless`. | Uppdaterade `.github/workflows/ci-cd.yaml` och CORS-konfiguration. |
| 2026-11-08 | `905feff` | Resultat- & topplistefunktion med gruppbehörighetskontroll (PR #54) | Verifierade att endast gruppmedlemmar/ägare kan nå `?view=mine` och `?view=leaderboard` (`403` för icke-medlemmar). | Verifierat med `quizResults.test.js` i både `backend/` och `serverless/`. |
| 2026-11-08 | `b4b9fb1` / `ee4223b` | SCA (`npm audit`), Playwright BDD i CI & EC2-deploy-härdning (PR #58, #59, Issue #55) | `minimatch` uppdaterad via `overrides` (`0 vulnerabilities` i `frontend` och `backend`). Playwright BDD aktiverat i CI och EC2-deployskriptet testas automatiskt (`test-deploy-frontend.sh`). | Mergat till `main`. |
| 2026-11-08 | `ee4223b` + lokal fix | Semgrep SAST (`--config auto`), `npm audit` & AI-säkerhetsgranskning | Upptäckte och åtgärdade `missing-user` i `backend/Dockerfile` & `frontend/quiz/Dockerfile` (`USER node`), `bypass-tls-verification` i `backend/config/database.js` & `backend/database/database.js` samt `minimatch`-override i `serverless/package.json`. **Resultat efter fix: 0 SAST-fynd i app/Dockerfiles och 0 `npm audit`-sårbarheter i alla 3 paket.** | Åtgärdat och verifierat (se avsnitt 5.1). |
