# GitHub → Vercel och Codemagic

Ingen Vercel- eller Supabase-miljö är skapad av den här leveransen. Filerna i repot förbereder anslutningen; konton, projekt och nycklar behöver konfigureras separat.

## 1. GitHub

Använd `Fiskerik/companio`, gren `main`. GitHub Actions verifierar ändringar och pull requests. Lägg sedan till skydd för `main` med godkända kontroller som krav. GitHub, Vercel och Codemagic arbetar mot samma rot och samma `package-lock.json`.

## 2. Vercel: första demonstrationen

1. Skapa ett Vercel-projekt och importera `Fiskerik/companio`.
2. Root Directory: lämna som repots rot. Framework Preset: **Other**. Node.js: **24.x**.
3. Inställningarna i `vercel.json` använder `npm ci`, `npm run build:web` och resultatmappen `dist`.
4. Sätt `EXPO_PUBLIC_DEMO_ENABLED=true`. Inga Supabase-nycklar behövs för en demo.
5. Kontrollera en Preview Deployment innan produktionsdomänen tas i bruk.

Vercel hostar webbappen. Den bygger inte iOS-appen och ersätter inte databasen.

## 3. Supabase: ansluten testmiljö

Skapa först ett separat testprojekt i en vald EU-region. Skapa produktion först när piloten är redo. För varje miljö:

1. Installera Supabase CLI enligt dess dokumentation, logga in och länka projektet från repots rot.
2. Kör `supabase db push` efter granskning av migrationerna. Inga demoprofiler skapas i databasen.
3. Aktivera e-postinloggning. Appen använder en sexsiffrig engångskod: ändra Magic Link-mejlmallen så att den visar `{{ .Token }}` och konfigurera kodlängd 6. Ställ in riktig SMTP, avsändare, rate limits och leveransövervakning.
4. Ange webbdomänen som Site URL och tillåt endast avsedda redirect-adresser. Konfigurera Apple som inloggningsleverantör med det registrerade iOS-bundle-ID:t.
5. Migrationen skapar den privata bildbucketen `media`. Bilder laddas upp som väntande och behöver godkännas av moderator innan andra ser dem. Tilldela en verklig administratör genom en serveradministrerad rad i `moderators`.
6. Kontrollera behörigheter med minst två verkliga hushåll och en utomstående användare innan någon bjuds in.

Lägg endast dessa **publika** byggvärden i Vercel och Codemagic:

```text
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=projektets publishable/anon-nyckel
EXPO_PUBLIC_SUPPORT_EMAIL=verklig supportadress
EXPO_PUBLIC_PRIVACY_URL=https://er-domän/integritet
EXPO_PUBLIC_APP_URL=https://er-domän
EXPO_PUBLIC_DEMO_ENABLED=false
```

Variabelnamnet `ANON_KEY` kan innehålla antingen den publika publishable-nyckeln eller äldre anon-nyckel. **Service role/secret keys får aldrig finnas i appen eller i `EXPO_PUBLIC_*`.** Behörigheterna bygger på RLS och serverfunktioner, inte på att den publika nyckeln hålls hemlig. `.env` ignoreras av Git; `.env.example` innehåller endast mallvärden.

## 4. Codemagic: TestFlight

1. Anslut samma GitHub-repo med YAML-konfiguration i roten.
2. Skapa Apple Developer-konto, registrera ett eget tillgängligt bundle-ID och skapa appen i App Store Connect. Aktivera Sign in with Apple och Push Notifications.
3. Lägg till App Store Connect API-integrationen med namnet **Companio App Store Connect** eller ändra samma namn i YAML-filen.
4. Skapa Codemagic-gruppen **companio-production** med de publika värdena ovan samt `BUNDLE_ID=com.fiskerik.companio` och `APP_STORE_APPLE_ID` (App Store Connect → General → App Information → Apple ID). `BUNDLE_ID` finns även som en fast, icke-hemlig workflow-variabel så att signing-konfigurationen kan läsas innan gruppvariabler laddas.
5. Konfigurera automatisk signering med rätt certifikat och distributionsprofil. Codemagic använder macOS/Xcode, Expo prebuild och CocoaPods; inget EAS-konto krävs.
6. Kör verifieringsflödet först. En tagg som `ios-0.1.0-1` startar iOS-flödet och skickar ett lyckat signerat bygge till TestFlight. Build-steget hämtar senaste TestFlight-numret från App Store Connect och ökar det automatiskt. Skapa bara sådan tagg när ni avser att distribuera ett testbygge.

Expo SDK 57 kräver stödjande Xcode-version (minst 26.4 enligt versionsdokumentationen). YAML använder `latest`; välj en verifierad kompatibel Xcode-version i Codemagic före första bygget. Apple-team, certifikat och App Store Connect-avtal måste vara färdiga. Bygget är inte testkört på macOS i denna leverans.

## 5. Push och bildstädning

`notification-worker` använder APNs direkt för iOS. Aktivera funktionen med Supabase CLI och lägg serverhemligheter i Supabase, aldrig i appbygget:

```text
CRON_SECRET
APNS_PRIVATE_KEY
APNS_KEY_ID
APNS_TEAM_ID
APNS_BUNDLE_ID
APNS_SANDBOX=false
```

Supabase tillhandahåller också `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` i funktionsmiljön. APNs-nyckeln är Apple-nyckelns PEM-innehåll. Sandbox används endast för rätt utvecklingssignering; TestFlight använder produktions-APNs.

Schemalägg ett serveranrop ungefär varje minut med `Authorization: Bearer <CRON_SECRET>` till `/functions/v1/notification-worker`. Förvara schemaläggningens hemlighet i serverns hemlighetslager. Funktionen skapar påminnelser, kontrollerar aktuell läsrätt, hanterar kö och tar bort köade bildfiler. Schemat skapas inte av migrationerna. Testa ändrad tid/plats, avbokning, nekade notiser och upphörd tillgänglighet på fysisk iPhone.

## Referenser

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo på Vercel](https://docs.expo.dev/guides/publishing-websites/)
- [Codemagic React Native](https://docs.codemagic.io/yaml-quick-start/building-a-react-native-app/)
- [Codemagic App Store Connect](https://docs.codemagic.io/yaml-publishing/app-store-connect/)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
