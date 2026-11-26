# DevSecOps Quiz-plattform

Quiz-plattform byggd med **React**, **Supabase Auth** och en serverless-backend med **AWS Lambda och DynamoDB** för DevSecOps-kursen.

---

## Arkitekturbeskrivning

### Systemöversikt

```text
Frontend (React) → API Gateway → Lambda-funktioner → DynamoDB
        ↕                           ↕
    Supabase Auth              JWT-verifiering
```

### Komponentbeskrivning

| Komponent | Teknologi | Ansvar |
|-----------|-----------|--------|
| **Frontend** | React + Vite + TypeScript | Användargränssnitt, Supabase Auth-inloggning, JWT-hantering |
| **Backend** | API Gateway + AWS Lambda + Node.js | REST API och affärslogik, definierat med AWS SAM |
| **Databas** | DynamoDB | Persistens för användare, grupper, quiz och resultat |
| **Supabase** | Supabase Auth (JWT) | Autentisering, säker lösenordshantering, JWT-utfärdande |
| **Lokal miljö** | SAM CLI + Docker + DynamoDB Local | Lokal emulering av API och databas |


### Dataflöde - Autentisering

1. Användare klickar på "Logga in" eller "Skapa konto" i frontend
2. Användare autentiserar sig via Supabase Auth Modal (e-post och lösenord)
3. Supabase returnerar en session med JWT till frontend efter eventuell e-postbekräftelse
4. Frontend sparar session och inkluderar JWT i `Authorization: Bearer <token>`-headern
5. API Gateway och Lambda verifierar token med Supabase JWKS eller en konfigurerad äldre HS256-hemlighet
6. Lambda hittar eller skapar en DynamoDB-profil utifrån den verifierade Supabase-identiteten
7. Lambda kontrollerar åtkomst och returnerar data till frontend



## Tekniska val

### Varför Supabase Auth?

| Fördel | Beskrivning |
|--------|-------------|
| **Hanterad inloggning** | Supabase hanterar webbklientens lösenord och kontoregistrering |
| **Standard JWT** | Backend verifierar Supabase-token via JWKS eller en konfigurerad äldre HS256-hemlighet |
| **Smidig UI-upplevelse** | Inbyggd modal i frontend utan externa omdirigeringar |
| **Enkel integration** | `@supabase/supabase-js` ger en ren och modern utvecklarupplevelse |

### Varför DynamoDB?

| Fördel | Beskrivning |
|--------|-------------|
| **Hanterad databas** | AWS hanterar drift och kapacitet för databasen |
| **Transaktioner** | Unika värden och relaterade ändringar hanteras med transaktioner |
| **Lokal testbarhet** | DynamoDB Local används för lokal API-testning |

## Säkerhet & Autentisering (Supabase Auth-integration)

Frontend använder **Supabase Auth** för registrering och inloggning. Skyddade API-rutter verifierar bearer-token både i API Gateways authorizer och i Lambda-handlern. Supabase-profiler kopplas till den verifierade tokenens `sub`, inte automatiskt via e-post.

API:et har även separata publika `/api/register` och `/api/login` för lokala konton. Ett angivet lösenord lagras som en bcrypt-hash och inloggningstoken signeras med `JWT_SECRET`. Supabase-flödet och de lokala kontona är separata; se [serverless-dokumentationen](./serverless/README.md) för detaljer och hantering av äldre profiler.

---

## Användarflöden (User Flows)

1. **Registrera konto & logga in**: Användare autentiserar sig säkert via Supabase Auth.
2. **Skapa grupp (Circle)**: Inloggad användare skapar en grupp och blir automatiskt ägare.
3. **Bjuda in & gå med via kod**: Ägare får en unik inbjudningskod → vän anger koden och blir medlem i gruppen.
4. **Skapa quiz**: Medlem skapar ett quiz i sin grupp (kategori, frågor, valbara alternativ och rätt svar).
5. **Delta i quiz**: Medlem öppnar ett quiz i sin grupp, svarar på frågorna och ser sitt poängresultat direkt.
6. **Se resultat & historik**: Quiz-resultat sparas och kopplas till användarens Supabase-profil i databasen.

---

## Feature Slices

1. Användare kan autentisera sig säkert via Supabase Auth (e-post och lösenord).
2. Användare kan skapa en grupp (circle) och bli ägare.
3. Gruppägare får en automatisk inbjudningskod (`invite_code`).
4. Inbjuden person kan gå med i en grupp via inbjudningskoden.
5. Gruppägare kan redigera gruppnamn och ta bort grupper.
6. Medlem kan skapa ett quiz (titel, kategori, frågor, alternativ, rätt svar) i sin grupp.
7. Medlem kan genomföra ett quiz och få sitt resultat beräknat i realtid.
8. Icke-medlemmar nekas åtkomst till gruppens quiz och funktioner (åtkomstkontroll via Supabase Bearer-tokens).

---

## BDD-scenarier (Gherkin)

```gherkin
Feature: Kontoregistrering och inloggning via Supabase Auth

  Scenario: Ny användare registrerar konto via Supabase Auth
    Given jag är en ny besökare
    When jag registrerar mig i Supabase med giltig e-post och starkt lösenord
    Then ska ett konto skapas i Supabase
    And jag ska bekräfta min e-post om Supabase kräver det
    And profilen ska skapas i DynamoDB när jag använder API:et

  Scenario: Ny användare registrerar sig och loggar in med samma uppgifter
    Given jag är på inloggningssidan
    When jag väljer "Registrera dig"
    And jag registrerar mig med en unik e-postadress och ett giltigt lösenord
    Then ska ett konto skapas i Supabase
    When jag loggar ut från Supabase
    And jag loggar in med samma e-postadress och lösenord
    Then ska jag vara inloggad med det nyskapade kontot
    And profilen ska finnas i DynamoDB

Feature: Skapa och gå med i grupp

  Scenario: Skapa en grupp med inbjudningskod
    Given jag är inloggad via Supabase
    When jag skapar en ny grupp med namnet "Fredagsquiz"
    Then ska gruppen skapas
    And en unik inbjudningskod ska skapas
    And jag ska bli ägare av gruppen

  Scenario: Gå med via inbjudningskod
    Given jag har fått en giltig inbjudningskod till en grupp
    When jag anger koden och klickar på Gå med
    Then ska jag läggas till som medlem i gruppen

Feature: Skapa och genomföra quiz

  Scenario: Skapa ett quiz i en grupp
    Given jag är medlem i en grupp
    When jag skapar ett quiz med kategorin "DevSecOps" och frågor
    Then ska quizet sparas i databasen
    And ska vara tillgängligt för gruppens medlemmar

  Scenario: Genomföra ett quiz
    Given jag är medlem i en grupp med ett publicerat quiz
    When jag svarar på alla frågor i quizet och skickar in
    Then ska mitt poängresultat beräknas
    And resultatet ska sparas kopplat till min användare
```

---

## Snabbstart: lokal serverless-miljö

Du behöver Node.js 22, PowerShell, SAM CLI och Docker Desktop med Linux-containrar. Installera beroenden i `serverless` och `frontend/quiz` med `npm ci`.

Om `serverless/local/config.json` saknas, kopiera `serverless/local/config.example.json` dit och fyll i Supabase-projektets URL och publika anon-/publishable-nyckel. Använd inte en service-role-nyckel och committa inte konfigurationen.

Starta från `serverless`:

```powershell
npm run local
```

Frontend finns på `http://localhost:3000/` och API:et på `http://localhost:3001/api/`. Stoppa med Ctrl+C. DynamoDB Local körs i minnet och **all lokal databasdata försvinner vid stopp**. Supabase-projektet är fortfarande externt; använd ett testprojekt vid behov. Se [serverless-dokumentationen](./serverless/README.md) för detaljer, inklusive konfiguration av äldre Supabase HS256-token.

Docker Compose kan också starta enbart frontend. Ange `VITE_API_URL` till ett
separat startat serverless-API samt `VITE_SUPABASE_URL` och den publika
`VITE_SUPABASE_ANON_KEY` i `.env` eller miljön innan du kör `docker compose up --build`.
Compose startar inte API:et. Det lokala skriptet ovan startar redan en frontend
på port 3000, så kör inte båda samtidigt på samma port.

Produktionsbilden för frontend byggs med Docker BuildKit. Ange den publika
Supabase anon- eller publishable-nyckeln som en build secret och bygg om
bundlingssteget utan cache när nyckeln kan ha ändrats:

```bash
docker buildx build --load --tag quiz-frontend:local --no-cache-filter frontend-bundle \
  --secret id=supabase_anon_key,env=VITE_SUPABASE_ANON_KEY \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  -f frontend/quiz/Dockerfile.prod frontend/quiz
```

Vite bäddar in nyckeln i JavaScript som skickas till webbläsaren. Den är
därför inte hemlig även om den skickas via en build secret; använd aldrig
en Supabase service-role-nyckel eller någon annan hemlig nyckel här.

Varje quiz har grafer för dina egna försök och deltagarnas bästa resultat, rangordnade efter andel rätt. Topplistan visar även varje deltagares totala antal genomförda försök, inklusive försök efter det bästa resultatet. Endast nuvarande gruppmedlemmar och gruppägaren kan se dem; individuella försök visas bara för den som gjorde dem. Topplistan inkluderar även sparade resultat från tidigare medlemmar.

---

## Serverless: Lambda och DynamoDB

Backendens Lambda-funktioner, API Gateway och DynamoDB-tabeller definieras i [serverless/template.yaml](./serverless/template.yaml).

För att kontrollera och bygga den lokalt:

```bash
cd serverless
npm ci
npm run lint
npm test
npm run build
```

Testerna använder mockade eller minnesbaserade beroenden och kräver inte AWS-åtkomst. De verifierar inte en faktisk AWS-deploy.

Deploy kräver AWS-behörighet och SAM CLI. Se [serverless/README.md](./serverless/README.md) för deploy, parametrar och datamodell. Efter deploy används stackens `ApiUrl` som frontendens `VITE_API_URL` vid bygge. Standardvärdet är `http://localhost:3001/api/` för den lokala serverless-miljön; ange `VITE_API_URL` för andra miljöer.

---

## Projektstruktur

```
DevSecOps/
├── serverless/                    # Backend: Lambda och DynamoDB
│   ├── src/handlers/              # Lambda-handlers för API:et
│   ├── src/lib/                   # Auth, databasåtkomst och gemensam logik
│   ├── tests/                     # Serverless-tester
│   ├── template.yaml              # AWS SAM-resurser
│   └── README.md                  # Deploy och serverless-dokumentation
│
├── frontend/quiz/
│   ├── src/
│   │   ├── components/
│   │   │   ├── NavbarContainer/   # Navigation & profilvisning
│   │   │   ├── Auth/AuthModal.tsx # Supabase Login & Registrering Modal
│   │   │   ├── GroupDashboard.tsx # Gruppskapande, redigering & inbjudningar
│   │   │   └── QuizManager.tsx    # Quiz-skapande & interaktiv spelfunktion
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Supabase AuthProvider & useAuth hook
│   │   ├── page/
│   │   │   ├── home/HomePage.tsx  # Huvuddashboard
│   │   │   └── routes/RoutePage.tsx # React Router setup
│   │   ├── App.tsx
│   │   └── main.tsx               # AuthProvider & Redux Provider
│   ├── Dockerfile
│   └── package.json
│
├── .github/workflows/
│   └── ci-cd.yaml                 # GitHub Actions CI/CD Pipeline
└── README.md
```

---

## 🔄 CI/CD Pipeline

### Översikt

Projektet använder **GitHub Actions** för CI/CD

### Beroendeuppdateringar

Dependabot söker varje vecka efter uppdateringar för npm-beroenden, GitHub Actions och Docker-basbilder enligt [konfigurationen](./.github/dependabot.yml). Nya versioner har en väntetid på sju dagar innan de föreslås; säkerhetsuppdateringar omfattas inte av väntetiden. Uppdateringarna föreslås som pull requests och ska granskas och testas innan de mergas.

### CI-delen (Continuous Integration & Security)

Vid varje push eller pull request körs jobbet `ci` med följande steg i ordning:

| Steg | Beskrivning | Syfte |
|------|-------------|-------|
| **Checkout** | Hämta kod från repo (`fetch-depth: 0`) | Underlag för kod- och historikskanning |
| **Test EC2 deploy script** | `bash .github/scripts/test-deploy-frontend.sh` | Verifiera driftsättningsskriptets felhantering |
| **Secret Scanning (Gitleaks)** | `gitleaks-action` med `.gitleaks.toml` | Stoppa läckta hemligheter, API-nycklar och tokens |
| **Node.js setup** | Installera Node.js 22 + npm-caching | Bygg- och testmiljö |
| **Frontend Audit (SCA)** | `npm audit --audit-level=high` | Upptäck sårbara beroenden i frontend |
| **Frontend Lint** | `npm run lint` | Kontrollera kodkvalitet i frontend |
| **Frontend Test** | `npm test` (`vitest run`) | Kör enhetstester i frontend |
| **Frontend Build** | `npm run build` | Verifiera att frontend-bygget lyckas |
| **Serverless Audit och lint** | `npm audit --audit-level=high`, `npm run lint` | Kontrollera beroenden och kod i Lambda-backend |
| **Serverless test och build** | `npm test`, `npm run build` | Kör tester och bygg Lambda-handlers |
| **Semgrep SAST** | `semgrep scan --config auto --error .` | Statisk kodanalys för att upptäcka säkerhetsbrister |
| **Trivy Filesystem Scan** | `trivy-action` (`vuln,misconfig`, `HIGH,CRITICAL`) | Skanna beroenden, IaC och Dockerfiles efter sårbarheter och felkonfiguration |
| **Trivy Container Image Scan** | Bygg och skanna frontend Docker-images (`dev` & `prod`) | Stoppa sårbarheter (`HIGH,CRITICAL`) i containerbasbilder före publicering |
| **Playwright BDD & E2E** | `npx bddgen && npx playwright test` | Kör automatiserade BDD- och E2E-scenarier mot applikationen |

Frontend-enhetstester (`npm test`), BDD/E2E-tester (`npx playwright test`) samt alla säkerhetsgrindar (Gitleaks, `npm audit`, Semgrep och Trivy) körs automatiskt som en blockerande kvalitetsgrind i CI/CD-pipelinen (`needs: ci`) innan publicering och driftsättning tillåts.

### CD-delen (Continuous Deployment)

Vid push till `main`, efter godkänd CI, deployar AWS-jobbet serverless-backenden med SAM till stacken `quiz-serverless`. Därefter byggs frontend med stackens API-adress, pushas till ECR och startas på EC2 via SSM.

Frontend-avbilden som publiceras till ECR signeras med Cosign och GitHub Actions OIDC. Signeringshändelser publiceras i Sigstores offentliga transparenslogg. Före EC2-driftsättningen verifierar CI ECR-avbildens signatur mot detta workflow på `main` och skickar den verifierade digesten till EC2. Signaturen verifieras i CI, inte på EC2; driftsättningen avbryts om signering eller verifiering misslyckas. AWS-rollen behöver rättigheter att läsa och publicera signaturartefakter i ECR-repositoryt.

EC2-jobbet hämtar frontend-avbilden med den verifierade digesten och kontrollerar att containern svarar på port 80. SSM-utdata visas i jobbets logg. En befintlig frontend-container från samma ECR-repository ersätts, men andra containrar tas inte bort; en annan tjänst på port 80 måste stoppas eller flyttas manuellt. Instansen behöver AWS CLI, Docker, Bash, curl, SSM Agent och behörighet att hämta avbilden från ECR.

---

## 🛡️ Säkerhetsanalys och Hotmodellering

Projektets fullständiga hotmodellering (STRIDE / OWASP), dataflödesdiagram med förtroendegränser (*Trust Boundaries*), åtgärdsplan (*Shift Left*), incidenthanteringsplan och status för kursens sju delar finns i **[SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md)**.
