# DevSecOps Quiz-plattform

Säker och modern Quiz-plattform byggd med **React**, **Express**, **SQLite** och **Auth0** för DevSecOps-demonstration och projektarbete.

---

## 🔒 Säkerhet & Autentisering (Auth0-integration)

Projektet använder **Auth0 (OAuth 2.0 / OpenID Connect)** för autentisering och användarhantering:

- **Asymmetrisk RS256 JWT-verifiering**: Backend verifierar alla inkommande tokens med publika nycklar från Auth0:s JWKS-slutpunkt (`/.well-known/jwks.json`).
- **Inga lösenord i den lokala databasen**: Lösenord, kryptering, MFA och kontoregistrering hanteras helt av Auth0.
- **Lokal profilsynkronisering**: Backend synkroniserar automatisk Auth0-användarprofiler (`auth0_id`, `email`, `username`) till den lokala SQLite-databasen (`users`) vid inloggning.

---

## 📋 Användarflöden (User Flows)

1. **Registrera konto & logga in**: Användare autentiserar sig säkert via Auth0 Universal Login (MFA, lösenordspolicys, OAuth 2.0).
2. **Skapa grupp (Circle)**: Inloggad användare skapar en grupp och blir automatiskt ägare.
3. **Bjuda in & gå med via kod**: Ägare genererar en unik 6-teckens inbjudningskod (t.ex. `VQQMY8`) → vän anger koden och blir medlem i gruppen.
4. **Skapa quiz**: Medlem skapar ett quiz i sin grupp (kategori, frågor, valbara alternativ och rätt svar).
5. **Delta i quiz**: Medlem öppnar ett quiz i sin grupp, svarar på frågorna och ser sitt poängresultat direkt.
6. **Se resultat & historik**: Quiz-resultat sparas och kopplas till användarens Auth0-profil i databasen.

---

## 🛠 Feature Slices

1. Användare kan autentisera sig säkert via Auth0 (Universal Login).
2. Användare kan skapa en grupp (circle) och bli ägare.
3. Gruppägare får en automatisk inbjudningskod (`invite_code`).
4. Inbjuden person kan gå med i en grupp via inbjudningskoden.
5. Gruppägare kan redigera gruppnamn och ta bort grupper.
6. Medlem kan skapa ett quiz (titel, kategori, frågor, alternativ, rätt svar) i sin grupp.
7. Medlem kan genomföra ett quiz och få sitt resultat beräknat i realtid.
8. Icke-medlemmar nekas åtkomst till gruppens quiz och funktioner (åtkomstkontroll via Auth0 Bearer-tokens).

---

## 🥒 BDD-scenarier (Gherkin)

```gherkin
Feature: Kontoregistrering och inloggning via Auth0

  Scenario: Ny användare registrerar konto via Auth0
    Given jag är en ny besökare
    When jag registrerar mig i Auth0 med giltig e-post och starkt lösenord
    Then ska ett konto skapas i Auth0
    And profilen ska synkroniseras till den lokala databasen
    And jag ska vara inloggad

Feature: Skapa och gå med i grupp

  Scenario: Skapa en grupp med inbjudningskod
    Given jag är inloggad via Auth0
    When jag skapar en ny grupp med namnet "Fredagsquiz"
    Then ska gruppen skapas
    And en unik 6-teckens inbjudningskod ska skapas
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

## 🚀 Snabbstart (Docker)

### 1. Miljövariabler (.env)
Säkerställ att `.env` eller `docker-compose.yaml` innehåller Auth0-inställningarna:

```env
VITE_AUTH0_DOMAIN=dev-oz2aw2gea6l10gab.us.auth0.com
VITE_AUTH0_CLIENT_ID=nozbtl9zVfqFJPeVZE6XfnjTAsOchVsy
VITE_AUTH0_AUDIENCE=https://quiz-api.dev

AUTH0_AUDIENCE=https://quiz-api.dev
AUTH0_ISSUER_BASE_URL=https://dev-oz2aw2gea6l10gab.us.auth0.com/
PORT=5000
```

### 2. Starta med Docker Compose
```bash
docker-compose up -d --build
```

- **Frontend Applikation**: `http://localhost:3000/`
- **Backend Express API**: `http://localhost:5000/api/`

---

## 📁 Projektstruktur

```
DevSecOps/
├── backend/
│   ├── Api/
│   │   └── Routes/
│   │       ├── auth/
│   │       │   ├── syncUser.js        # POST /api/sync-user (Auth0-profilsynk)
│   │       │   ├── registerUser.js    # Äldre lokal auth
│   │       │   └── loginUser.js       # Äldre lokal auth
│   │       ├── Groups/
│   │       │   ├── createGroup.js     # POST /api/groups
│   │       │   ├── getGroups.js       # GET /api/groups
│   │       │   ├── getGroupById.js   # GET /api/groups/:id
│   │       │   ├── updateGroup.js     # PUT /api/groups/:id
│   │       │   ├── deleteGroup.js     # DELETE /api/groups/:id
│   │       │   └── joinGroup.js       # POST /api/groups/join (via inbjudningskod)
│   │       └── Quizzes/
│   │           ├── createQuiz.js      # POST /api/quizzes
│   │           ├── getQuizzes.js      # GET /api/quizzes
│   │           └── takeQuiz.js        # POST /api/quizzes/:id/submit
│   ├── database/
│   │   ├── database.js            # Sequelize SQLite-anslutning
│   │   └── schemas/
│   │       ├── userSchema.js      # Users-tabell (auth0_id, email, name)
│   │       ├── groupSchema.js     # Groups-tabell (name, invite_code, owner_id)
│   │       ├── groupMemberSchema.js # Group members & roller
│   │       ├── quizSchema.js      # Quizzes-tabell (questions, category, group_id)
│   │       └── quizResultSchema.js# Quiz results-tabell (score, total)
│   ├── middleware/
│   │   ├── auth0.js               # RS256 Auth0 JWT verifierings-middleware
│   │   └── verifyJWT.js           # Symmetrisk JWT verifiering
│   ├── app.js                     # Express app entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/quiz/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Auth0 Navigation & profilvisning
│   │   │   ├── GroupDashboard.tsx # Gruppskapande, redigering & inbjudningar
│   │   │   └── QuizManager.tsx    # Quiz-skapande & interaktiv spelfunktion
│   │   ├── page/
│   │   │   ├── home/HomePage.tsx  # Huvuddashboard
│   │   │   └── routes/RoutePage.tsx # React Router setup
│   │   ├── App.tsx
│   │   └── main.tsx               # Auth0Provider & Redux Provider
│   ├── Dockerfile
│   └── package.json
│
├── .github/workflows/
│   └── ci-cd.yaml                 # GitHub Actions CI/CD Pipeline
├── docker-compose.yaml            # Docker Compose konfiguration
└── README.md
```