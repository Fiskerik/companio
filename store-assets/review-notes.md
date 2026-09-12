# App Review notes draft

Replace the bracketed values before submitting a production build.

## Test account

- Email: `[CREATE A REVIEW-ONLY ACCOUNT]`
- One-time code delivery: `[DESCRIBE HOW APP REVIEW RECEIVES THE CODE]`
- Review environment: production Supabase project, Swedish locale
- The account must be an adult household with a completed profile and example events available nearby.

## Review path

1. Sign in with the review account.
2. Complete or inspect the adult household profile.
3. Open Discover and inspect a local meetup.
4. Open Find your people and inspect household preferences.
5. Open Inbox and send a message in the shared household chat.
6. Open Favorites and save a household. Explain that a favorite does not grant access to private availability.
7. Open Profile to request data export or account deletion.

The app is for adults 18 and over. Children do not receive accounts or searchable profiles. The app supports user-generated content, reporting, blocking and moderation. Meetups are designed around public places by default; a private location is shown only to accepted attendees.

## Review contact

- Support email: `[REAL SUPPORT EMAIL]`
- Review contact: `[REAL REVIEW CONTACT]`
- Notes on any unavailable feature: `[COMPLETE BEFORE SUBMISSION]`

Do not submit the local demo build as the production review build. A production build must have `EXPO_PUBLIC_DEMO_ENABLED=false` and a working Supabase environment.
