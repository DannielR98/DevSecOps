Feature: Inloggning med Auth0-testidentitet

    Scenario: Besökare öppnar appen med en Auth0-testidentitet
        Given jag är en ny besökare
        When jag loggar in med en lokal Auth0-testidentitet
        Then ska jag vara inloggad
        And testprofilen ska synkroniseras till den lokala databasen