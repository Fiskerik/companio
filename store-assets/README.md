# App Store listing assets

This folder contains a first listing draft for Companio.

## Included

- `AppStoreIcon-1024.png`: opaque 1024×1024 app icon.
- `ios/6.9-inch/*.png`: 1320×2868 portrait screenshots.
- `ios/6.5-inch/*.png`: 1242×2688 portrait screenshots.
- `asset-manifest.json`: dimensions and source information.
- `app-store-metadata.md`: suggested App Store text.

The screenshots are rendered from the real Companio demo UI at phone-sized viewports. They are useful as listing drafts and product review assets. Before submission, replace them with screenshots from the signed native iOS/TestFlight build so the status bar, font rendering, permissions and final native behavior are represented accurately.

Apple accepts one to ten screenshots per localization. The current portrait sizes follow Apple's current 6.9-inch and 6.5-inch specifications. Images are PNG files without transparency.

To regenerate the screenshots after a UI change, export the demo build, start the local preview server, and run `npm run store:assets` from the project root. The script uses the same five flows for both device sizes.

## Suggested upload order

1. Discover: local meetups and availability.
2. People: household matching.
3. Chat: conversations after matching.
4. Event: a concrete meetup with capacity and child mode.
5. Profile: preferences and household settings.

The App Store listing should use the Swedish localization first, then the English localization after the English copy and screenshots have been reviewed by a native speaker.
