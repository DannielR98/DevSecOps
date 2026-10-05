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