# Säkerhetsanalys

## Omfattning

Projektet är en quiz- och grupptjänst med konton, profiler, gruppmedlemskap, quiz och resultat. Frontend använder Supabase Auth. Repot innehåller två backendalternativ: Express/PostgreSQL och AWS Lambda/DynamoDB. GitHub Actions är konfigurerat att driftsätta serverless-backend till AWS och frontend till EC2. Vilken lösning som används i aktuell demonstration måste framgå av driftbeskrivningen.

Analysen gäller koden och konfigurationen i repot. En konfiguration eller testfil visar inte i sig att skyddet fungerar i drift. Risknivåerna är uppskattningar för en kursdemo med testdata.

## Skyddsvärda uppgifter

- Konton, e-post, användarnamn och sessionstoken.
- Gruppmedlemskap, inbjudningskoder och användarskapat quizinnehåll.
- Quizresultat och kopplingen mellan resultat och användare.
- Databas, driftinställningar, hemligheter och leveranskedja.

## Viktigaste riskerna

| Risk | Nuläge | Prioriterad åtgärd |
|---|---|---|
| **Hög – obehörig åtkomst till användaruppgifter** | `GET /api/users` och `GET /api/user/:user_id` kräver JWT i Express-backenden. Listan returnerar ändå många användare, och profilrutten kontrollerar inte att den efterfrågade profilen tillhör den inloggade användaren. Alla grupp-, quiz- och resultatrutter behöver också verifieras för objektbehörighet. | Begränsa vilka profiler och fält som kan läsas. Testa åtkomst mellan två användare och mellan medlemmar/icke-medlemmar på alla aktiva rutter. |
| **Kritisk – sessionstoken skrivs till webbläsarkonsolen** | `frontend/quiz/src/App.tsx` loggar access token. Den som kan läsa konsolen eller samla in klientloggar kan få användarens session. | Ta bort tokenloggningen och sök efter fler loggar med token eller personuppgifter. Behandla tidigare exponerade riktiga token som komprometterade och återkalla dem. |
| **Hög – känsliga detaljer skrivs i applikationsloggar** | `backend/Api/Quizzes/createQuiz.js` loggar bland annat användar-ID, e-post och grupp-/quizdata. Felhanterare på flera ställen loggar databasfel. | Ta bort debugloggar och logga endast nödvändiga, sanerade uppgifter. Kontrollera att token, e-post och innehåll inte hamnar i driftloggar. |
| **Hög – tokenverifiering kan falla tillbaka till HMAC** | `backend/middleware/supabaseAuth.js` provar JWKS, HMAC-hemlighet och Supabase Auth API. Det är inte verifierat att produktionsmiljön begränsar algoritm, issuer och audience som avsett. | Verifiera felaktig/utgången token och produktionskonfiguration. Säkerställ att test- och legacyhemligheter inte ger oavsedd väg in. |
| **Medel/hög – överbelastning och gissning** | AWS API Gateway har throttling inställd. Express har global CORS och ingen rate-limit-middleware hittades. | Begränsa CORS för Express och inför hastighetsgränser där auth eller inbjudningskoder kan missbrukas. |
| **Medel – osäker lokal containerkonfiguration** | Compose är för utveckling: den använder dev-servrar, källkodsmontering, exponerar databas/pgAdmin och har standardvärden för lösenord. | Använd Compose som lokal utvecklingsmiljö med testdata. Använd inte dess standardvärden eller portar som produktionskonfiguration. |
| **Medel – sårbara beroenden eller byggkedja** | Workflowet innehåller npm audit, Gitleaks och Semgrep, men faktiska resultat är inte dokumenterade. Actions är versionsmärkta, inte SHA-pinnade. | Spara CI-resultat, åtgärda relevanta fynd och överväg image scanning samt SHA-pinning. |

## Skydd som redan finns i repot

- Supabase-inloggning och JWT-middleware i Express-rutter.
- Validering med Zod och kontroller av gruppmedlemskap/ägarskap i flera rutter.
- Tester för backend, frontend och serverless-backend.
- GitHub Actions med tester, lint, npm audit, Gitleaks, Semgrep och build.
- Docker Compose med Postgres-volym och healthcheck.
- AWS-konfiguration för API Gateway-throttling och begränsad DynamoDB-åtkomst.

Detta är kod- och konfigurationsfynd. Körresultat, deploystatus och faktisk åtkomstkontroll är inte bekräftade här.

## Kvar att verifiera

1. Ta bort token- och onödig personuppgiftsloggning.
2. Testa åtkomstkontroller för anonym användare, ägare, annan användare, gruppmedlem och icke-medlem.
3. Kör CI-kontrollerna och dokumentera resultat samt åtgärder.
4. Starta Compose och dokumentera hur tjänster, konfiguration och beständig lagring fungerar.
5. Verifiera AWS-deploy via publik URL med testkonto. Kontrollera HTTPS, inloggning och ett centralt användarflöde.
6. Visa var driftloggar finns och demonstrera upptäckt av ett relevant fel eller nekad åtkomst.
7. Genomför en kort incidentövning, till exempel läckt testtoken, och dokumentera återkallelse och lärdomar.

## Avgränsningar

Använd syntetiska testkonton och testdata. Kursdemonstrationen ersätter inte extern penetrationstestning, jour, fullständig backup-/återställningsplan eller skydd mot storskalig överbelastning. Redovisa vilka delar som inte har verifierats och vilka risker som därför kvarstår.
