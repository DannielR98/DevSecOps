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

