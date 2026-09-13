# Companio – flöde, vardagsplanering och medlemskap

Uppdaterat 13 september 2026. Funktioner märkta **byggt** finns i koden. Premiumdelarna är produktförslag och prishypoteser; betalning är inte aktiverad.

## Så fungerar flödet nu

1. **Kom igång.** Apple eller e-postkod, därefter en vuxenprofil och ett hushåll. En vuxen kan börja själv; partnern bjuds in senare. TestFlight har också en tydligt märkt lokal demo via ”Fortsätt utan inloggning”.
2. **Upptäck → Kalender.** En lodrät tidslinje samlar lokala publika träffar, egna planer och synlig tillgänglighet. Bara dagar med innehåll visas. De första två aktiviteterna syns direkt, resten kan fällas ut per dag. ”Min kalender” visar egna tider och träffar som hushållet håller eller har accepterad plats på. Ett tryck på en träff öppnar information och anmälan.
3. **Upptäck → Sammanhang.** Bestående grupper med medlemskap, gruppchatt och träffar. Åtta förskapade exempel finns i demon. Samma idéer finns som redigerbara mallar för att starta riktiga grupper i det egna området. En mall publicerar inget förrän användaren sparar.
4. **Hitta sällskap.** Sök efter namn/område, filtrera hushåll och se varför de passar. Spara privat favorit eller skicka en hälsning. Accepterad kontaktförfrågan öppnar hushållschatten med verklig vuxen som avsändare. Ensamstående utan barn hittar sällskap genom grupper och träffar.
5. **Inkorg.** Kontaktförfrågningar, hushållschattar och grupp-/träffchattar. En chatt är platsen där deltagarna bestämmer detaljer tillsammans.
6. **Favoriter.** Hushållets sparade kontakter och de tider ni har behörighet att se. Favoriter ger inte åtkomst till privat tillgänglighet.
7. **Profil.** Redigera hushåll, språk, intressen och preferenser; lägg upp tillgänglighet, bjud in partner och hantera konto.

Vid verklig kontoinloggning används Supabase. Demoexemplen finns bara lokalt och är inte användare eller aktiviteter i den riktiga tjänsten. Att den lokala demon fungerar bekräftar inte i sig att alla driftintegrationer, pushnotiser eller modereringsrutiner är verifierade på en fysisk iPhone.

## Förändringar som är byggda

### En tätare startsida

Stora bilder på varje träff ersätts av tidsatta rader med rubrik, område, barnläge och platsstatus. Bildkort finns kvar i andra relevanta vyer. Egna planer behålls även om de ligger utanför den vanliga sökradien. Pågående aktiviteter syns tills de slutar; en aktivitet över midnatt flyttas till dagens lista medan den pågår.

Urval: alla kommande dagar, idag, kommande sju kalenderdagar, min kalender, med barn och utan barn. Utgångna tillfällen, blockerade hushåll och otillåten privat information ska aldrig synas. Tomt resultat ger ett ärligt meddelande.

### Filter utan betalspärr

Avstånd, hushållstyp, barnläge, aktivitet, publicerad tillgänglighet idag/veckan, gemensam tid, social takt, gemensamt samtalsspråk, språk för utbyte och frivilliga åldersintervall för barn. Sortering på relevans eller närhet. Filter kombineras och resultatantalet uppdateras direkt.

Profilens grundkrav gäller alltid. Sökradien utökas inte tyst. För större radie eller ändrade grundkrav finns en länk till profilredigering. Barnfri familjesammansättning och att vilja träffas utan barn hålls isär.

### Språkinlärning som social aktivitet

Två skilda frågor: **”Språk vi kan prata”** och **”Språk vi vill öva”**. Dessutom ett frivilligt val att vara öppen för språkutbyte. Svenska, engelska, tyska, spanska, franska, arabiska, ukrainska och finska går att välja. Appens gränssnitt är fortfarande svenska/engelska; samtalsspråk är en separat sak.

En person kan erbjuda svenska och vilja öva spanska. En annan kan prata arabiska/engelska och vilja öva svenska. Språkfiltret kan hitta båda rollerna. Inget antagande görs om nationalitet, ursprung eller språk utifrån namn. Ingen behöver vara lärare.

Tekniskt sparas frivilliga övningsspråk som `practice_<språkkod>` i hushållets befintliga intresselista. `language_learning` anger öppenhet för utbyte. Talade språk ligger kvar i `languages`. Etiketterna visas som språknamn, används inte som personlighetspoäng och följer befintliga serverbehörigheter, export och radering. En senare datamodell kan flytta dem till egna fält om nivåer eller målsättningar behövs.

### Sammanhang att prova

- Småbarn & stora kaffekoppar.
- En till vid spelbordet.
- Språkfika – svenska & fler språk.
- Middag utan barn ibland.
- Ny i stan – promenadkompisar.
- Helgutflykter med matsäck.
- Bokprat & kultur.
- Rörelse i lagom takt.

Sparade demochattar och användarskapade planer behålls när de nya exemplen läggs till. I liveversionen kräver ett verkligt sammanhang en värd; vi visar inga påhittade medlemmar.

### Kalenderinmatning

Både start och slut i träffar och tillgänglighet väljs med en månadskalender och valbara timmar/minuter. Samma komponent används när man redigerar eller planerar om en träff. Att flytta starten flyttar slutet med samma längd. Sluttid måste fortfarande ligga efter start, och befintlig gräns på högst 24 timmar gäller. Datum lagras som UTC och visas i enhetens tidszon. Sommartidsomställning och byte av enhetens tidszon behöver också provas på fysisk iPhone; datumväljaren använder enhetens datumhantering, som kan flytta en obefintlig klocktid framåt.

## Gratis och Companio Plus – förslag

**Princip: alla ska kunna hitta en vän och ses igen gratis. Betalningen gör planeringen bekvämare.** Ett betalande hushåll behöver inte kunna kräva att vännerna också betalar för att svara eller delta.

| Funktion                                                        | Gratis, även efter piloten                          | Plus, föreslaget                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Profiler och partneranslutning                                  | Ja, hela hushållet                                  | Samma                                                                                  |
| Matchning, alla relevanta filter, kontakt och chatt             | Ja                                                  | Samma                                                                                  |
| Favoriter, tillgänglighet och aviseringar om matchade favoriter | Ja                                                  | Personliga listor och samlade planeringsöversikter                                     |
| Delta i och skapa träffar/grupper                               | Ja; gemensamma missbruksgränser                     | Verktyg för återkommande värdskap                                                      |
| Kalender och manuell planering                                  | Ja                                                  | Återkommande serier med undantag och automatisk planeringshjälp                        |
| Sökningar                                                       | Använd alla filter direkt                           | Flera namngivna sparade sökningar och valbara bevakningar                              |
| Språkutbyte                                                     | Alla språk och språkfilter                          | Inga betalda språkgränser                                                              |
| Värdskap                                                        | Beskrivning, plats, deltagare, väntelista och chatt | Omröstningar om tider, uppgiftslistor, samvärdar och återanvändbara upplägg            |
| Extern kalender                                                 | Manuell hantering; överväg enstaka export gratis    | Valbara kalenderkopplingar och konflikthjälp utan att andra ser privata kalendertitlar |
| Säkerhet och kontohantering                                     | Blockera, rapportera, exportera och radera          | Samma                                                                                  |

Plus ska inte få bättre tillgång till privata uppgifter, förtur i andras inkorgar eller betalt företräde i matchningsresultat. Grundläggande favoritnotiser och återträffar ska fortsätta fungera gratis. Ingen annonsfinansiering baserad på privata samtal.

### Priser att testa – per hushåll

Detta är egna testhypoteser, inte verifierade marknadspriser eller beslutade erbjudanden.

| Alternativ | Förslag i Sverige | Varför                                                        |
| ---------- | ----------------- | ------------------------------------------------------------- |
| Månad      | 59 kr/månad       | Låg tröskel, lätt att prova en intensiv period                |
| År         | 499 kr/år         | Cirka 42 kr/månad, cirka 30 % lägre än tolv månadsbetalningar |
| Lifetime   | 1 999 kr en gång  | För dem som vill stödja tjänsten och slippa förnyelse         |

Samma Plus-funktioner i alla tre alternativ. Lifetime avser permanent rätt till köpta Plus-funktioner så länge tjänsten tillhandahålls, med tydliga villkor före köp; lova inte evig drift. Prissätt inte lifetime som bara ett eller två års medlemskap. Med dessa hypoteser motsvarar lifetime cirka fyra års årsbetalningar. Pilotdata om lagring, support och retention måste visa att framtida drift kan finansieras innan erbjudandet säljs.

Ett alternativ är ett genuint begränsat grundarerbjudande för lifetime under starten, därefter omprövning utifrån faktiska kostnader. Begränsningen måste vara verklig; inga falska nedräkningar eller låtsasrabatter. Köpta rättigheter ska inte tas bort bara för att nyförsäljningen upphör.

### Hur gratis leder till Plus

Första Plus-erbjudandet visas vid ett tydligt planeringsbehov: ”Vill ni göra det här varje torsdag?”, ”Spara den här sökningen?” eller ”Hitta en tid som passar gruppen?”. Visa det konkreta värdet, fullständigt pris och ett lika tydligt sätt att fortsätta gratis. Ingen betalvägg under onboarding eller vid första svaret i en chatt.

Mät genomförda och återkommande träffar även bland gratishushållen. Följ därefter betalningsvilja, användning av planeringsfunktioner, uppsägningar och faktisk driftkostnad. Bygg först återkommande planer och sparade sökningar; de har tydligt vardagsvärde och relativt låg löpande kostnad. Testa priserna i intervjuer med par utan barn, barnfamiljer och ensamstående föräldrar innan ett skarpt erbjudande.

### Betalning – ännu inte byggd

Månad och år hör till en grupp för automatiskt förnyade prenumerationer. Lifetime passar som ett icke förbrukningsbart engångsköp. För iOS används StoreKit/in-app purchase som standard för att låsa upp digitala Plus-funktioner. Se [Apples köpformer](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-types) och [regler för digitala köp](https://developer.apple.com/app-store/review/guidelines/).

Innan lansering behövs riktiga produkter i App Store Connect, lokaliserade priser från butiken, återställ köp, hantera prenumeration, serververifiering och händelser för förnyelse, återbetalning och avslut. Kundens köphistorik får aldrig avgöras av en lokal flagga. Köp kopplas till den vuxna som köper och ger rättigheter till dennes nuvarande hushåll; hantera partnerbyte och utträde uttryckligen så gamla hushåll inte behåller åtkomst av misstag. Visa befintlig hushållsaccess för partnern så dubbla köp undviks. En övergång till lifetime måste också hantera en pågående prenumeration tydligt.

## Rörelser från transitions.dev

Källan beskriver främst webbövergångar. Den är visuell inspiration för egna React Native-varianter, inte ett iOS-bibliotek att lägga in direkt. [Transitions.dev](https://transitions.dev/) granskades 13 september 2026.

| Mönster                    | Passar här                                                                    | Status                                                             |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Panel reveal               | Filterrelaterat innehåll, kalenderpaneler och byte mellan Kalender/Sammanhang | Byggt som kort toning och 6 punkters förflyttning, 180 ms          |
| Accordion / Card resize    | Fäll ut fler aktiviteter på en dag                                            | Utfällning med toning byggd; animerad höjdförändring är nästa steg |
| Modal open/close           | Träffdetaljer och formulär                                                    | Befintlig toning tar nu hänsyn till minskad rörelse                |
| Tabs sliding               | Markerare mellan Kalender/Sammanhang                                          | Kandidat; behöver bara animera markeringen                         |
| Like button / Icon swap    | Spara favorit                                                                 | Kandidat: liten hjärtreaktion, utan partiklar                      |
| Skeleton loader and reveal | Inläsning av verkliga serverdata                                              | Kandidat när laddningsflödena förbättras                           |

Undvik konfetti, 3D-kort, suddiga textbyten och stora sidoförflyttningar i huvudflödena. Små rörelser ska förklara vad som öppnats eller sparats och inte försena ett tryck. Reducerad rörelse använder omedelbara byten; React Native tillhandahåller inställningen och ändringshändelser genom [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo). Fysisk iPhone och VoiceOver behöver kontrolleras inför publik release.
