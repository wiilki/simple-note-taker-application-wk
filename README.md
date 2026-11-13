# Stillnote

Stillnote is a redesigned, responsive, local-first notes workspace. It replaces the original Express demo with a professional interface that works on free static hosting.

## Features

- Create and edit notes with automatic saves.
- Find notes by full-text search; organize with Personal, Work, Ideas, and Other collections.
- Pin, star, archive, move to trash, restore, and permanently delete.
- Sort notes by recency or title, see word counts, and switch between light and dark themes.
- Export and import JSON backups; imports merge without overwriting existing note IDs.
- Responsive two-pane layout with a mobile editor and keyboard shortcuts: Cmd/Ctrl + N new, Cmd/Ctrl + K search, Cmd/Ctrl + S save.
- Zero trackers, no account, and no required network requests after page load.

## Important storage limitation

**Notes are saved only to browser localStorage on the current device/browser.** They **do not sync across devices**, and clearing site data or using private browsing may remove them. Export backups regularly. The publicly hosted site has no account system or hosted notes database. Do not store sensitive secrets in localStorage.

This avoids the original app's insecure shared JSON-file backend and allows reliable free static hosting. The legacy Express server, filesystem database, and tracked node_modules have been removed.

## Run locally

Use any static HTTP server:

    python3 -m http.server 8080 --directory public

Open http://localhost:8080/notes.html (or / for the landing page).

Run tests with:

    npm test

Uses Node.js built-in test runner; no package installation required.

## Deploy to Vercel

Connect the GitHub repository to Vercel and set Root Directory = public. Framework preset = Other. No build command or environment variables. Vercel applies public/vercel.json, including clean URLs so /notes opens notes.html.

## Data format

Browser storage key: stillnote.notes.v1. JSON export includes a version field, timestamp, and notes array. Import accepts the exported object or a plain array.

## License

MIT.
