# AralLink for Numbers

A desktop-first web prototype for Grade 1 addition and subtraction. The app includes email/password registration and login backed by a local SQLite database, followed by a student learning dashboard, lessons, a short interactive practice flow, progress and achievements, classroom student overview, and guardian/teacher notifications. Learning and classroom data remains prototype data in local React state.

## Run locally

Use Node.js 24 or newer (the local API uses Node's built-in SQLite support).

```powershell
npm install
npm run dev
```

Open the local address shown by Vite. The development command starts both the Vite frontend and the local authentication API. Create an account on the registration screen; the SQLite database is created at `data/arallink.sqlite` on first run. The signed-in account name is shown in the dashboard and can be changed under **Settings**. Sign out from Settings or the account controls.

For a production-style local run, build the frontend and then run `npm start`. The Node server serves `dist` and the authentication API on port 3001. Set `PORT` to change the server port. To verify a production build, run `npm run build`.

Passwords are stored as scrypt hashes, and login sessions are random, expiring tokens stored hashed in SQLite and sent in HTTP-only, same-site cookies. Names and email addresses for accounts used on the current browser are remembered locally to make switching accounts easier; passwords are never stored in the browser. For an HTTPS deployment, set `HOST=0.0.0.0` and `COOKIE_SECURE=true` so the server is reachable by the platform and session cookies are sent only over HTTPS.

## Increment 1 scope

- Addition and subtraction practice within 10
- Student progress, stars, badges, and lesson completion views
- Teacher classroom roster and progress overview
- Guardian/teacher notification feed
- Desktop web experience only; mobile screens and a mobile app are out of scope
