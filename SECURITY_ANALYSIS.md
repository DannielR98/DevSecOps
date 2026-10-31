
## 2. Tillgångar och skyddsvärde

| Tillgång | Exempel / plats | Konfidentialitet | Integritet / tillgänglighet |
|---|---|---:|---|
| Identiteter och profiluppgifter | E-post, användarnamn, namn, Supabase-ID i `users` | Hög | Hög |
| Autentiseringsuppgifter och sessioner | Supabase-lösenord hos Supabase; JWT i klientens session | Hög | Hög |
| Signerings- och API-hemligheter | Supabase JWT-/anon-nyckel, databaskonto, eventuellt legacy `JWT_SECRET` | Mycket hög | Mycket hög |
| Grupper och inbjudningskoder | Gruppnamn, ägare, medlemskap, kod | Medel | Hög |
| Quizinnehåll | Frågor, alternativ och facit | Medel | Hög |
| Resultat | Poäng, quiz-ID, användar-ID och tidpunkt | Hög | Hög |
| Databas och driftkonfiguration | PostgreSQL-data/volym, miljövariabler, container images | Hög | Mycket hög |
| Källkod och leveranskedja | Git, npm-paket, GitHub Actions och GHCR-images | Medel | Mycket hög |

## 3. Attackytor och riskprioritering

Skala: sannolikhet (S) och konsekvens (K) 1–5. Riskvärde = S × K: 1–4 låg, 5–9 medel, 10–15 hög, 16–25 kritisk. Värdena är initiala uppskattningar för kursprojektet och bör omprövas efter verifiering.

| ID / hot (STRIDE, OWASP) | Attackväg och möjlig konsekvens | S × K | Nuläge i repot | Prioriterad åtgärd |
|---|---|---:|---|---|
| **T1 – BOLA/IDOR och dataexponering** (E, I; OWASP API1/API5, A01) | Ändra UUID i `/api/user/:user_id`, quiz-/grupp-ID eller resultatfråga. Profilrutterna `GET /api/users` och `GET /api/user/:user_id` saknar middleware i aktiv `app.js`; första returnerar hela användarobjekt. Kan exponera e-post/profil och möjliggöra åtkomst över gruppgränser om en route saknar objektskontroll. | 4 × 5 = **20 Kritisk** | Flera quiz/group-routes använder `verifyJWT` och medlems-/ägarkontroller. Publika user GET-routes synliga. | Kräv autentisering och ägarskap för profil-GET; returnera uttrycklig allowlist av publika fält, aldrig hela ORM-objekt. Kontrollera ägare/medlemskap för varje objekt på servern. Lägg till negativa tester med två användare och två grupper. Överväg PostgreSQL RLS endast om DB-anslutningen sätter och säkert återställer identitetskontext; annars är den inte ett extra skydd i denna arkitektur. |
| **T2 – Tokenförfalskning eller kapning** (S; A07, API2) | Stulen JWT ger angriparen användarens behörighet. Fallback till symmetrisk hemlighet/testlogik kan acceptera felaktiga token om produktionskonfiguration saknas eller testinställning följer med. `localStorage`/webbläsarsession är åtkomlig för script i origin. | 3 × 5 = **15 Hög** | `supabaseAuth.js` verifierar JWKS och har HMAC/API-fallback; `verifyJWT.js` innehåller test-/mockfallback. Klienten använder Supabase SDK. | Begränsa prod till verifiering med förväntad issuer/audience/algoritm och giltighet; neka start om nödvändig konfiguration saknas. Ta bort testfallback från produktionskod eller isolera till testmodul. Rotera exponerade nycklar. Kort access-tokenlivslängd och fungerande återkallelseflöde. Utvärdera HttpOnly/Secure/SameSite-cookie om sessionarkitekturen byggs om; cookie kräver även CSRF-skydd. |
| **T3 – Skadligt användarinnehåll / Stored XSS** (T, E; A03, API8) | Skadligt gruppnamn, quiztitel, fråga eller alternativ sparas och senare visas för andra medlemmar. Script i origin kan läsa session, agera som användaren eller manipulera quiz. | 3 × 4 = **12 Hög** | Zod längd-/formatvalidering för grupp/quiz; React renderar normalt text escaped, men måste granskas i alla renderingsvägar. | Behåll Reacts text-rendering och undvik `dangerouslySetInnerHTML`. Om HTML-stöd införs ska innehållet saneras. Lägg till in-/utdatatester med `<script>`, event-handler och URL-payloads. Lägg till Content-Security-Policy och säkerhetsheaders. |
| **T4 – API brute force, gissning av inbjudningskod och överbelastning** (D; A04/A05, API4) | Upprepade inloggnings-, registrerings- eller kodförsök kan kapa konton, hitta privata grupper eller förbruka API-/databasresurser. | 3 × 4 = **12 Hög** | Inbjudningskoden skapas med 5 slumpmässiga kryptografiska byte (40 bitar), men rate limit-middleware hittades inte. CORS är globalt öppen. | Lägg till IP-/kontobaserad begränsning på auth- och inbjudningsrutter, måttlig fördröjning och generiskt inloggningsfel. Begränsa CORS till tillåtna origin. CORS ersätter inte autentisering. Lägg till gränser för request body, förfrågningstid och antal kodförsök. |
| **T5 – SQL injection / osäker fråga** (T; A03) | Formaterad indata ändrar en databasfråga och läser eller ändrar data. | 2 × 5 = **10 Hög** | Koden använder huvudsakligen Sequelize-modellmetoder och where-villkor; ingen dynamiskt byggd raw SQL hittades i den granskade koden. | Använd bind-parametrar för SQL och bygg aldrig frågesträngar från användarindata. Granska nya raw queries med Semgrep. Behåll Zod-typ- och längdgränser. Verifiera med payload i DAST-/API-test. |
| **T6 – Sårbara beroenden / CI- eller supply-chain-angrepp** (T, E; A06) | Sårbar npm dependency eller manipulerad build action/image kan ge kodkörning, dataläckage eller komprometterad leverans. | 3 × 5 = **15 Hög** | Workflow kör `npm audit --audit-level=high`, Semgrep, Gitleaks och bygger/pushar images till GHCR. GitHub Actions pekar på versions-taggar, inte commit-SHA. | Behåll låsfil + `npm ci`; granska och åtgärda advisories. Lägg till Dependabot/Renovate och container image scan (t.ex. Trivy), signering/provenance vid rimlig omfattning. Pinna Actions till full SHA och begränsa `GITHUB_TOKEN`-behörighet per jobb. Skanna PR och image innan publicering. |
| **T7 – Hemlighetsläcka och osäker driftskonfiguration** (S, T, D; A05) | Nyckel i Git, image, logg eller frontend bundle kan missbrukas. Dev-defaults, exponerade DB-/pgAdmin-portar eller produktionskörning med Vite/nodemon kan ge obehörig åtkomst. | 3 × 5 = **15 Hög** | `.env` ignoreras; Gitleaks finns i CI. Compose har utvecklingsvolymmounts, `npm run dev`, publicerade DB/pgAdmin-portar och standardlösenord i variabel-defaults. | Använd secret store i drift och unika starka hemligheter; inga standardlösenord. Separera dev/prod Compose; kör byggda images som icke-root, minimala och utan källkodsbind mounts. Exponera bara ingress, stäng DB/pgAdmin utåt, TLS. Rotera hemlighet om den någonsin checkats in. |

**STRIDE:** S = Spoofing, T = Tampering, R = Repudiation, I = Information Disclosure, D = Denial of Service, E = Elevation of Privilege. Riskerna fokuserar på de sannolika och allvarliga attackvägarna för denna applikation.

## 4. Prioriterad åtgärdsplan (Shift Left)

| Prioritet | Åtgärd | Leveransbevis |
|---|---|---|
| **P0 – före demo med riktiga användardata** | Stäng oautentiserad bulk- och profilåtkomst på `/api/users` och `/api/user/:user_id`; minimera profilfält. Granska alla aktiva rutter för auth + objektbehörighet (BOLA). | PR/diff, route-matris, tester som visar 401/403 för obehörig användare och 200 för rätt användare. |
| **P0** | Säkerställ att produktions-JWT inte kan gå igenom test-/HMAC-fallback och att prod vägrar starta med saknad auth-konfiguration. | Negativa token-tester: fel signatur, fel issuer/audience, utgången token, saknad secret och testlik token nekas. |
| **P1 – CI** | Lägg till negativa accesskontroll-/injektions-/XSS-tester, Dependabot, action-SHA-pinning och container scanning. Gör lint aktivt om det ingår i kvalitetskravet. | CI-logg från grön körning och en kontrollerad testkörning som demonstrerar att kritiskt fynd stoppar leverans. |
| **P1 – API/klient** | CORS allowlist, rate limits på auth/invite, begränsningar för body/request, security headers/CSP. | Automatiska API-/header-/throttle-tester och dokumenterad konfiguration. |
| **P1 – container/drift** | Separat produktionsprofil: statiska frontendfiler, backend `node`, icke-root, inga bind mounts/dev-server, DB privat och secrets från plattformens secret store. | `docker compose config`, image scan, container healthcheck och driftchecklista. |
| **P2 – data/övervakning** | Definiera retention, backup/restore och logg-/larmflöde; överväg RLS endast med korrekt identity propagation. | Restore-övning, larmbevis, loggexempel utan token/personhemlighet. |

## 5. Verifieringsplan och nulägesstatus

Kör verifiering i isolerat testprojekt med testkonton och syntetiska data. Dokumentera **datum, commit, kommando/verktyg, resultat, antal fynd och ansvarig**. Lägg inte in riktiga tokens eller personuppgifter i rapport/loggar.

| Kontroll | Hur verifieras | Nuläge i repot / resultat |
|---|---|---|
| Enhetstester och API-behörighet | `npm test` i `backend` och `frontend/quiz`; testa 401/403, ägarskap, gruppmedlemskap och IDOR mellan två konton. | Testfiler finns i båda delarna, inklusive grupp/quiz/auth. **Körresultat ej verifierat vid denna granskning.** Befintliga tester ersätter inte kontroll av alla aktiva rutter. |
| BDD/E2E | `npm run test:ui` med testmiljö och testidentiteter; komplettera scenarier för obehörig åtkomst, fel token och skadlig text. | Gherkin-filer och Playwright BDD finns; workflow försöker köra E2E. **Senaste gröna körning ej verifierad.** |
| SAST | Semgrep i GitHub Actions; granska fynd och konfigurera blockeringsnivå för high/critical. | Steg finns i `.github/workflows/ci-cd.yaml`. Senaste findings/CI status är **ej verifierad**. |
| SCA och hemligheter | `npm audit --audit-level=high` för båda paketen; Gitleaks på repo/PR; granska falska positiva. | Båda audit-stegen och Gitleaks finns i workflow. Gällande utfall **ej verifierat**; Dependabot/container scan hittades inte. |
| DAST/API | Starta isolerad stack, kör OWASP ZAP baseline/API scan mot testinstansen; testa unauth/auth access, injection, XSS, CORS och headers. Triagera fynd. | Ingen ZAP-/DAST-konfiguration hittades. **Återstår.** |
| Auktorisationsmatris | För varje GET/POST/PUT/DELETE: anonym, egen användare, annan användare, medlem, icke-medlem, ägare. Verifiera minsta behörighet och datafält. | En del routes verifierar token och medlemskap; publika användar-GET-routes upptäckta. Full matris **återstår**. |
| Container | Bygg/kör Compose; kontrollera användar-ID, öppna portar, mounts, health, secrets och image CVE. | Dockerfiles/Compose finns, men körningen är utvecklingskonfigurerad. Ingen prod-hardening/image scan hittades. |
| Cloud deployment | Publicera till vald plattform; testa HTTPS, secrets, access, health endpoint, DB private networking och återställning. | CI publicerar GHCR-images på `main`/`dev`; ingen cloud runtime deployment hittades. **Återstår/kan inte styrkas från repot.** |
| Loggning/incident | Simulera upprepade nekade auth-/invite-försök; verifiera larm, triage, begränsning, nyckelrotation och efteranalys. | Koden loggar vissa serverfel med `console`; ingen central logg/alert eller incidentövning hittades. **Återstår.** |

### Föreslagna BDD-scenarier för verifiering

```gherkin
Feature: Åtkomstkontroll
  Scenario: Oautentiserad klient kan inte läsa användarlistan
    When klienten anropar GET /api/users utan token
    Then API:t svarar 401
    And inget användarobjekt returneras

  Scenario: Gruppmedlem kan inte läsa en annan grupps quiz
    Given användare A är medlem i grupp A och inte medlem i grupp B
    When användare A hämtar ett quiz från grupp B
    Then API:t svarar 403 eller 404
    And quizinnehåll och facit returneras inte

  Scenario: Klient kan inte välja en annan användares resultatägare
    Given användare A är autentiserad
    When användare A skickar in ett quizresultat med manipulerat user_id
    Then servern ignorerar klientens user_id och använder identiteten från verifierad token

  Scenario: Ogiltig JWT nekas
    When klienten anropar en skyddad route med ändrad signatur eller utgången token
    Then API:t svarar 401
```

## 6. Genomförda skydd och vad som måste styrkas

| Område | Synligt genomfört i kod/config | Verifiering att redovisa |
|---|---|---|
| Autentisering | Supabase Auth i frontend; JWT-middleware i många skyddade routes. | Testa giltig, ogiltig och utgången token; granska fallback-paths i produktionsläge. |
| Auktorisation | Gruppmedlemskap/ägarskap kontrolleras i flera grupp-/quiz-routes; delete user begränsas till egen identitet. | Negativa testfall per aktiv route. `GET /api/users` och `GET /api/user/:user_id` behöver åtgärdas/granskas först. |
| Indatavalidering | Zod-scheman för grupp, quiz, frågor och användare. Sequelize-modeller används för persistens. | Testa gränsvärden, fel typer, extra fält och payloads. |
| SQLi | ORM-baserade sökningar dominerar den granskade koden. | Semgrep och manuellt review av eventuell raw SQL; detta är inte ett bevis på fullständig frånvaro. |
| Lösenord | Supabase Auth är den avsedda inloggningen. Legacy `/register` och `/login` är också monterade i `app.js`; lokal registrering hashar lösenord med bcrypt. | Besluta om legacy auth ska tas bort eller stödjas; verifiera rate limit och tokenlivscykel. |
| Säker utvecklingspipeline | npm audit, Gitleaks, Semgrep, enhetstester/build och Playwright-steg finns i workflow. | Länka till gröna CI-körningar och fyndrapport; uppdatera README om steg avviker. |
| XSS, CSRF, headers | Reacts normala textescaping minskar XSS-risk. | DAST/CSP/header-verifiering saknas. Bearer-token i header har annan CSRF-profil än cookies; om cookie införs krävs CSRF-skydd. |

## 7. Kvarstående risker och avgränsningar

| Risk / avgränsning | Hantering inom kursprojektet |
|---|---|
| Kontokapning via stulen JWT | Begränsa tokenlivslängd, använd TLS, exponera aldrig token i loggar och testa återkallelse. Acceptera viss kvarvarande risk för klientbaserad session i demo. |
| Publik internetdrift och DoS | Om tjänsten bara används för avgränsad kursdemo begränsas exponering och testdata används. Vid publik lansering krävs plattformsbaserat DDoS-skydd, skalning och larm; detta är utanför en lokal kursstack. |
| Supabase-/molnleverantör | Leverantören ansvarar för sin plattforms drift och underliggande infrastruktur; projektgruppen ansvarar för policies, nycklar, applikationsbehörighet, dataminimering och deploymentkonfiguration. Kontrollera faktisk delad ansvarsfördelning för vald plan. |
| Backup, retention och radering | Fastställ om kursdatan är syntetisk och radera testkonton efter kursen. Backup/restore och gallring behöver styrkas om tjänsten ska leva vidare. |
| RLS saknas som skyddslager | Backend-API:t använder direkt PostgreSQL via Sequelize. RLS prioriteras först när identitetskontext förs säkert till DB; API-auktorisation är kritisk tills dess. |
| DAST/penetrationstest | Full extern penetrationstestning ryms inte nödvändigtvis i kursen. Avgränsa ZAP till egen testmiljö och åtgärda kritiska/höga fynd före demo. |
| Incidentberedskap | En mindre övning med läckt testtoken/abnorm auth-försök räcker för kursbevis, men ersätter inte jour, SLA eller produktionsincidentorganisation. |

Riskacceptans ska vara uttrycklig: ange ansvarig, motivering, tidsgräns och villkor. Kritisk/hög risk för obehörig läsning av användardata bör inte beskrivas som accepterad innan profilrutterna och samtliga objektskontroller är säkrade och verifierade.

## 8. Översikt över uppgiftens sju delar

Status avser det som kan styrkas från repo-filerna vid granskningen, inte eventuella externa manuella aktiviteter.

| Del | Status | Belägg i repo | Saknas för full redovisning |
|---|---|---|---|
| 1. Säkerhetsanalys och hotmodellering | **Delvis genomfört** | Denna analys; arkitektur/dataflöde och tillgångar härledda från appen. | Bekräfta verksamhetskrav/riskaptit med gruppen och håll riskloggen uppdaterad. |
| 2. Säkerhetsåtgärder och verifiering | **Delvis genomfört** | JWT-middleware, Zod, medlems-/ägarkontroller, tester samt SAST/SCA/secret scan-steg. | Åtgärda publika profil-GET-routes; verifiera CI-resultat; utöka authz-tester; DAST och faktisk kontrollrapport. |
| 3. Containerisering och infrastruktur | **Delvis genomfört** | Dockerfiles, `docker-compose.yaml`, Postgres-volym/healthcheck. | Visa fungerande körning; dokumentera service-nätverk/secrets; separera utveckling/produktion; förklara Compose som lokal orkestrering. |
| 4. CI/CD med säkerhetskontroller | **Klart (?)** | `.github/workflows/ci-cd.yaml`: Gitleaks, npm audit, tester/build, Semgrep, Playwright, image push till GHCR. | bekräfta faktisk branch protection och stopvillkor; pinna Actions; komplettera image scan. CI bygger/pushar image men kör inte tjänsten i moln. |
| 5. Deployment i molnmiljö | **Delvist** | GHCR-image publiceras på push till main/dev. | Vi kör supabase, det kanske räknas?. GHCR är registry, inte körmiljö. |
| 6. Loggning och övervakning | **Delvis genomfört** | Vissa fel skrivs till `console`. | Strukturerade och sanerade loggar, central insamling, mätvärden/larm och konkret upptäcktsbevis. |
| 7. Incidenthantering | **Saknas i repot / ej styrkt** | Ingen incidentplan/övningsrapport upptäckt. | Välj tokenläcka eller misstänkt brute force, kör bordssimulering, dokumentera upptäckt, begränsning, återställning och lärdomar. |

## 9. Loggbok för resultat

Fyll i efter faktisk körning, undvik att skriva att kontroller passerat innan det finns CI-/verktygsresultat.

| Datum | Commit | Kontroll/övning | Resultat och fynd | Åtgärd / ansvarig |
|---|---|---|---|---|
| YYYY-MM-DD | `<sha>` | Backend/frontend tester, SAST/SCA/Gitleaks | `<resultat>` | `<åtgärd>` |
| YYYY-MM-DD | `<sha>` | OWASP ZAP mot testmiljö | `<resultat>` | `<åtgärd>` |
| YYYY-MM-DD | `<sha>` | Incidentövning | `<upptäckt, tid, begränsning, lärdom>` | `<förbättring>` |
