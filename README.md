# DevSecOps

## User flows

1. **Registrera konto & logga in** — ny användare skapar konto (e-post/lösenord), loggar in, hamnar på sin startsida.

2. **Skapa grupp (circle)** — inloggad användare skapar en grupp, blir automatiskt ägare/admin.

3. **Bjuda in & gå med** — ägare genererar en inbjudningslänk/kod → vän öppnar länken → loggar in/registrerar sig → blir medlem i gruppen. (Kanske för ambitiöst?)

4. **Skapa quiz** — medlem skapar ett quiz i sin grupp: väljer kategori, lägger till frågor och rätt svar.

5. **Delta i quiz** — medlem öppnar ett quiz som finns i gruppen, svarar på frågorna, ser sitt resultat direkt efter.

6. **Se topplista** — medlem öppnar gruppens topplista, ser rankning baserat på totalpoäng.

7. **Utmana en vän** — medlem väljer en specifik gruppmedlem och skickar en utmaning kopplad till ett quiz.



## Feature slices

1. Användare kan registrera konto och logga in

2. Användare kan skapa en grupp (circle)

3. Gruppägare kan generera en inbjudan (länk/kod)

4. Inbjuden person kan gå med i gruppen via inbjudan

5. Medlem kan skapa ett quiz (kategori + frågor + rätt svar) i sin grupp

6. Medlem kan genomföra ett quiz och få sitt resultat beräknat

7. Grupp kan se en topplista baserad på totalpoäng

8. Icke-medlemmar nekas åtkomst till gruppens quiz/topplista (åtkomstkontroll)

9. Medlem kan utmana en annan medlem till ett specifikt quiz

10. Medlem kan lämna en grupp *(Om vi har tid att implementera detta)*

11. Ägare kan ta bort en medlem från gruppen *(Om vi har tid att implementera detta)*


## BDD-scenarier (Gherkin)

```gherkin
Feature: Kontoregistrering och inloggning

  Scenario: Ny användare registrerar konto
    Given jag är en ny besökare
    When jag registrerar mig med giltig e-post och lösenord
    Then ska ett konto skapas
    And jag ska vara inloggad

  Scenario: Felaktig inloggning
    Given jag har ett konto
    When jag loggar in med fel lösenord
    Then ska jag få ett felmeddelande
    And jag ska inte bli inloggad


Feature: Skapa och gå med i grupp

  Scenario: Skapa en grupp
    Given jag är inloggad
    When jag skapar en ny grupp med namnet "Fredagsquiz"
    Then ska gruppen skapas
    And jag ska bli ägare av gruppen

  Scenario: Gå med via inbjudan
    Given jag har fått en giltig inbjudningslänk till en grupp
    When jag öppnar länken och loggar in
    Then ska jag läggas till som medlem i gruppen


Feature: Skapa och genomföra quiz

  Scenario: Skapa ett quiz
    Given jag är medlem i en grupp
    When jag skapar ett quiz med kategorin "Historia" och minst en fråga
    Then ska quizet sparas
    And ska bara vara synligt för medlemmar i min grupp

  Scenario: Genomföra ett quiz
    Given jag är medlem i en grupp med ett publicerat quiz
    When jag svarar på alla frågor i quizet
    Then ska jag få ett poängresultat
    And resultatet ska sparas kopplat till mig och quizet


Feature: Topplista

  Scenario: Se gruppens topplista
    Given jag är medlem i en grupp där quiz har genomförts
    When jag öppnar topplistan
    Then ska medlemmarna rankas efter totalpoäng


Feature: Åtkomstbegränsning

  Scenario: Icke-medlem nekas åtkomst
    Given jag inte är medlem i en grupp
    When jag försöker öppna gruppens quiz eller topplista
    Then ska jag nekas åtkomst


Feature: Utmana en vän

  Scenario: Skicka en utmaning
    Given jag och en vän är medlemmar i samma grupp
    When jag utmanar min vän till ett specifikt quiz
    Then ska min vän få en notis om utmaningen
    And utmaningens resultat ska kunna jämföras mellan oss två
```

