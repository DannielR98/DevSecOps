@requires-live-supabase
Feature: Registrering och inloggning via Supabase Auth

    Scenario: Ny användare registrerar sig och loggar in med samma uppgifter
        Given jag är på inloggningssidan
        When jag väljer "Registrera dig"
        And jag registrerar mig med en unik e-postadress och ett giltigt lösenord
        Then ska ett konto skapas i Supabase
        When jag loggar ut från Supabase
        And jag loggar in med samma e-postadress och lösenord
        Then ska jag vara inloggad med det nyskapade kontot
        And profilen ska synkroniseras till den lokala databasen
