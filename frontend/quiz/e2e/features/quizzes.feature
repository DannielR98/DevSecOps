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