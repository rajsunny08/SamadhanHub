# SamadhanHub — native app shell

This folder turns the SamadhanHub website into a real Android/iOS app using
[Capacitor](https://capacitorjs.com/) — it wraps the same frontend you already
have, calling your deployed backend's API instead of a local server.

**Full walkthrough (deploying the backend, generating icons, building, and
submitting to the App Store / Play Store):** see
`SamadhanHub-App-Store-Play-Store-Guide.pdf` in the project root.

## Quick commands

```bash
npm install                 # installs Capacitor itself
npm run sync-web            # copies ../css ../js ../images etc. into www/
npx cap add android         # one-time: creates the android/ native project
npx cap add ios             # one-time: creates the ios/ native project (Mac + Xcode only)
npm run assets              # generates all app icons + splash screens from images/icons/icon-512.png
npm run sync                # re-copies the web files AND syncs them into android/ + ios/
npm run open:android        # opens the project in Android Studio
npm run open:ios            # opens the project in Xcode (Mac only)
```

Before building, set `PRODUCTION_API_URL` near the top of `../js/app.js` to
your deployed backend's URL, then run `npm run sync` again.
