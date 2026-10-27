Feature: Inloggning med Supabase-testidentitet

    Scenario: Besökare öppnar appen med en Supabase-testidentitet
        Given jag är en ny besökare
        When jag loggar in med en lokal Supabase-testidentitet
        Then ska jag vara inloggad
        And testprofilen ska synkroniseras till den lokala databasen