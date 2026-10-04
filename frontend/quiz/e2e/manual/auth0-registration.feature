@requires-live-auth0
Feature: Registrering och inloggning via Auth0

    Scenario: Ny användare registrerar sig och loggar in med samma uppgifter
        Given jag är på Auth0s inloggningssida
        When jag väljer "Sign up"
        And jag registrerar mig med en unik e-postadress och ett giltigt lösenord
        Then ska ett konto skapas i Auth0
        When jag loggar ut från Auth0
        And jag loggar in med samma e-postadress och lösenord
        Then ska jag vara inloggad med det nyskapade kontot
        And profilen ska synkroniseras till den lokala databasen