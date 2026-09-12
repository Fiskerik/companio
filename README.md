# Companio · Hitta ditt sällskap

En första fungerande utvecklingsversion för iPhone och webben: hushållsprofiler, kontaktförfrågningar, gemensam chatt, favoriter, tillgänglighet, lokala träffar och grupper. Svenska och engelska ingår. **Detta är ännu inte en lanserad eller produktionsgodkänd tjänst.**

## En projektmapp, ett GitHub-repo

Använd denna mapp som projektrot:

```text
C:\Users\eriabr\OneDrive - Excillum AB\Documents\Extensions\LinkedinCRM\Companio
```

GitHub: <https://github.com/Fiskerik/companio>, huvudgren `main`.

Den tidigare undermappen `Companio\companio` var en separat, nästan tom klon. Dess historik har slagits ihop med appens historik. Kopian är bevarad lokalt i `.local-backups/companio-20260912`, som inte skickas till GitHub. Fortsätt arbeta i projektroten; skapa inte en ny klon inuti den.

GitHub Desktop: välj **File → Add local repository** och projektroten ovan. Vercel och Codemagic ska också använda repots rot, inte en undermapp. Git synkar vid commit/push/pull, inte automatiskt efter varje sparning. Kör `git pull --ff-only` innan arbete på en annan dator och skicka färdiga ändringar med commit/push.

## Prova utan molnkonton

Installera Node.js 24 och kör i projektroten:

```sh
npm ci
npm run web
```

Välj **Fortsätt utan inloggning**. Exempelprofiler och träffar är tydligt märkta. Ändringar i demot sparas på den aktuella enheten; det är ingen fleranvändartjänst. Varken Supabase eller Vercel behövs för att prova. Under **Profil → Tillbaka till inloggning** kan du återvända till kontoinloggningen. Demodata förs inte över till ett konto.

TestFlight-flödet har tills vidare `EXPO_PUBLIC_DEMO_ENABLED=true`, så samma knapp finns i nästa iOS-bygge. För att kräva konto igen: sätt värdet till `false` i `codemagic.yaml` och bygg om. E-post- och Apple-inloggningen finns kvar.

För en byggd webbversion:

```sh
npm run build:web
npm run preview
```

Öppna <http://localhost:4173>. För iOS-utveckling används `npm start`; en signerad fristående iOS-app byggs på Codemagic. Apple-inloggning och push måste verifieras på en fysisk iPhone.

## Projektets delar

| Del                                       | Ansvar                                                               |
| ----------------------------------------- | -------------------------------------------------------------------- |
| `src/`                                    | Expo/React Native-app, webbvy, svenska/engelska, separat demo        |
| `supabase/migrations/`                    | Datamodell, serverfunktioner, behörigheter och bokningstransaktioner |
| `supabase/functions/notification-worker/` | Serverfunktion för iOS-push och borttagning av bildfiler             |
| `.github/workflows/verify.yml`            | Automatiska kod-, databas- och webbläsarkontroller                   |
| `codemagic.yaml`                          | Verifiering samt signerat iOS-bygge till TestFlight                  |
| `vercel.json`                             | Webbbygge, säkerhetshuvuden och routning                             |

## Kontroller

```sh
npm run check
npm run format:check
npm run build:web
npx playwright install chromium
npm run test:e2e
```

Databastesterna använder PostgreSQL via PGlite och simulerade autentiseringsroller. Webbläsartesterna kör desktop och en mobil viewport; detta ersätter inte fysisk iPhone, VoiceOver eller en ansluten Supabase-miljö.

Se [driftsättning](docs/DEPLOYMENT.md) för nästa steg och [återstående lanseringsarbete](docs/RELEASE.md) för gränsen mellan den här versionen och en publik produkt.

App Store-material finns i [store-assets](store-assets/README.md), inklusive ikon, iPhone-skärmbilder och metadatautkast.
