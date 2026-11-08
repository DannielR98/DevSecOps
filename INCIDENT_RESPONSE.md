# Incidentövning: läckt testtoken

## Syfte

Öva på att upptäcka, begränsa och följa upp en misstänkt läckt inloggningstoken. Övningen görs med ett testkonto och syntetiska data. Använd aldrig en riktig användares token.

## Roller

- **Övningsledare:** läser upp scenariot och antecknar tider.
- **Incidentansvarig:** leder beslut och åtgärder.
- **Teknikansvarig:** undersöker loggar och beskriver tekniska åtgärder.
- **Observatör:** antecknar vad som fungerade och vad som saknades.

En person kan ha flera roller om ni är få.

## Förberedelser

1. Bestäm datum, deltagare och övningsledare.
2. Använd ett separat Supabase-testkonto utan riktiga personuppgifter.
3. Kontrollera i förväg hur testkontots sessioner kan återkallas i Supabase.
4. Bestäm var ni skulle kontrollera klient- och driftloggar. Exempel: webbläsarkonsolen och AWS CloudWatch för Lambda-loggar.
5. Sätt av cirka 20–30 minuter. Övningen är en diskussion; sprid eller använd ingen riktig token.

## Scenario

Övningsledaren läser upp:

> En utvecklare upptäcker att en inloggad användares access token har skrivits ut i webbläsarkonsolen under test. Det gäller ett testkonto. Ni vet inte om någon annan har hunnit kopiera token.

## Genomförande

Övningsledaren tar ett steg i taget. Gruppen beskriver vad den faktiskt skulle göra och vem som ansvarar. Anteckna beslut och tider.

### 1. Upptäckt och rapportering

- Hur upptäcktes händelsen och vem tar emot rapporten?
- Vilka uppgifter behöver ni för att bedöma omfattningen, utan att kopiera token till rapporten?
- Vilka loggar eller ändringar granskar ni för att se om token kan ha exponerats vidare?

**Förväntat arbetssätt:** behandla token som komprometterad. Spara tidpunkt, berört testkonto, miljö och var token visades. Lägg aldrig själva token i incidentanteckningarna.

### 2. Begränsning

- Vem återkallar testkontots session/token och hur verifierar ni att den gamla token inte längre fungerar?
- Behöver testkontot eller någon miljö tillfälligt stängas av?
- Vem ansvarar för att token inte längre skrivs ut eller samlas in av klientloggar?

**Förväntat arbetssätt:** återkalla testkontots session via Supabase, kontrollera att den gamla sessionen nekas och ta bort källan till tokenloggningen. Använd inte token för att testa åtkomst till andra användares data.

### 3. Undersökning och åtgärd

- Vilka klient- och driftloggar granskas, av vem och för vilken tidsperiod?
- Hur kontrollerar ni att loggarna inte innehåller fler token eller onödiga personuppgifter?
- Finns det tecken på missbruk eller åtkomst till data?
- Krävs fler åtgärder, till exempel återkallning av fler testsessioner eller ändring av exponerade hemligheter?

**Förväntat arbetssätt:** begränsa granskningen till relevanta loggar och tidsperiod. Dokumentera resultat utan att kopiera hemligheter. Om omfattningen inte kan avgöras, skriv det som en kvarstående osäkerhet och eskalera till ansvarig.

### 4. Återställning och uppföljning

- Vem bekräftar att loggningen är borttagen och att en ny testinloggning fungerar?
- Vilka tester eller kontroller ska köras innan ändringen levereras?
- Vem informeras och var dokumenteras beslut och åtgärder?
- Vilken förbättring minskar risken för att det händer igen?

**Förväntat arbetssätt:** verifiera att den gamla token nekas, att klienten inte längre loggar token och att normal testinloggning fungerar. Lägg till en kodgranskning eller kontroll som fångar loggning av hemligheter.

## Resultat från genomförd övning

Fyll i efter övningen. Skriv inte att en åtgärd lyckades om ni bara diskuterade den.

| Fält | Resultat |
|---|---|
| Datum och ungefärlig längd |  |
| Deltagare och roller |  |
| Hur händelsen upptäcktes i övningen |  |
| Loggkälla som granskades eller skulle granskas |  |
| Beslut om begränsning/återkallning |  |
| Hur gammal token verifierades som ogiltig (om praktiskt test genomfördes) |  |
| Vad fungerade bra |  |
| Vad var oklart eller saknades |  |
| Kvarstående risk |  |

## Åtgärder efter övningen

| Åtgärd | Ansvarig | Klart senast | Status |
|---|---|---|---|
|  |  |  | Ej startad |
|  |  |  | Ej startad |

## Godkänt underlag

Övningen är dokumenterad när scenariot, deltagarna, besluten, resultatet och minst en lärdom finns ifyllda. Bifoga gärna en redigerad skärmbild eller länk till relevant logg-/kontrollresultat, men aldrig en faktisk token eller personuppgift.
