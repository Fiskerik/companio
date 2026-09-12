# Status och arbete före publik lansering

## Implementerat för utveckling och utvärdering

- Fem huvudflikar, svenskt och engelskt gränssnitt, mobil- och datorvy.
- Tydligt separerat lokalt demo med interaktiva profiler, kontaktförfrågningar, chatt, favoriter, tillgänglighet, träffar och grupper.
- Ansluten kod för engångskod via e-post, Apple-inloggning, hushåll och partnerinbjudan.
- Serverstyrda mutationer, RLS, privat tillgänglighet, blockering, väntelista och transaktioner för personkapacitet.
- Chatt med text, bilder för manuell granskning, svar, reaktioner och träffkort. Pollning och realtime för inkommande meddelanden.
- Rapporteringsvy, moderatorroller, serverfunktion för modereringsåtgärder, dataexport och kontoradering.
- Konfiguration för GitHub-kontroller, Vercel och Codemagic/TestFlight.

## Kända begränsningar

Detta är en första implementation, inte ett påstående om att hela produktplanen är färdig. Följande behöver slutföras eller verifieras innan piloten/publik lansering:

- Ingen ansluten Supabase-miljö, Vercel-publicering eller signerad iOS/TestFlight-körning har verifierats. E-post, Apple, lagring, realtime, push och återställning av säkerhetskopia behöver verkliga integrationstester.
- Den vanliga ögonblicksbilden innehåller högst 500 senaste meddelanden över konversationerna. Serverfunktionen för äldre historik finns, men behöver anslutas i chattvyn.
- Pushregistrering och leveranskö finns. Tryck på notis behöver kopplas till verifierad navigering via `resolve_notification`.
- ”Planera igen” behöver bättre förifyllning och granskning av återinbjudna deltagare. Demonstrationens återkoppling och privata inbjudningar simulerar inte alla serverfall.
- Moderatorvyn kan hantera rapportstatus och bilder. Serverns avstängning/borttagning behöver ett fullständigt granskat arbetsflöde, överklagan och genomgående kontroll av avstängda kontons behörigheter.
- Bildgranskningen är manuell. Textfiltret är grundläggande och behöver utvärderas på svenska och engelska. Ingen bildklassificering eller BankID finns.
- Onboarding tillåter att vuxenbild läggs till senare. Profilens ortval behöver en bättre nationell ortsökning än listan med orter och manuell platsinmatning.
- Apple-tokenåterkallelse vid kontoradering behöver serverstöd och verifiering. Raderade bilagor ligger kvar tills bildstädningen körts; signerade bildlänkar kan gälla kort efter återkallad behörighet.
- Kalenderfilter, svagt nätverk, stor text och VoiceOver måste testas på fysisk iPhone. Mobiltester i Chromium är inte iOS-tester.
- Beroendegranskningen visar måttliga varningar i beroendekedjan. Granska och uppgradera med hänsyn till Expo-kompatibilitet före release; använd inte okontrollerad `audit fix --force`.

## Mänskliga beslut och drift

1. Kontrollera namn, domän och varumärke. Companio är arbetsnamn.
2. Fastställ ansvarig verksamhet, support och moderatorberedskap. Publicera granskade användarvillkor, integritetstext och gemenskapsregler.
3. Dokumentera rättsliga grunder, leverantörer, överföringar, lagringstider, radering, incidentrutin och bedömning av konsekvensbedömning. Bestäm och implementera städning av audit-/notisköer. EU-region är inte ensam GDPR-efterlevnad.
4. Genomför direktanropstester för främmande, blockerade, avstängda och före detta hushållsmedlemmar; försök kringgå UI:t. Använd separat testmiljö.
5. Kör fysisk iPhone-matris, backup/restore-övning och App Store-underlag innan offentlig distribution.
6. Intervjua cirka 15 hushåll. Starta därefter sex veckors lokal pilot med 50–100 verkliga hushåll och verkliga värdar. All nationell registrering kan vara öppen medan rekryteringen koncentreras lokalt.

Mät slutförd profil, tid till första svar, faktisk träff och återträff. Separera hushåll med/utan barn. Pilotens 70/25/30-procentsmål är hypoteser, inte verifierade resultat. Granska sammanställda mått från `pilot_metrics` på servern; samla inte privata meddelanden för matchningsanalys.
