# AralLink for Numbers

A desktop-first web app for Grade 1 addition and subtraction. Teachers register with email and password, create student profiles in their own classroom, and track lessons, practice results, progress, badges, and notifications. Students sign in with a teacher's classroom code, their classroom name, and a teacher-issued PIN. Student learning data is stored in SQLite locally and Turso on Vercel.

## Run locally

Use Node.js 24 or newer (the local API uses Node's built-in SQLite support).

```powershell
npm install
npm run dev
```

Open the local address shown by Vite. The development command starts both the Vite frontend and the local API. Create a teacher account, add a student from the new-classroom screen, and start at the first lesson. Classroom, student, lesson, practice, progress, badge, and notification data is saved in `data/arallink.sqlite`. The signed-in teacher name can be changed under **Settings**.

For a production-style local run, build the frontend and then run `npm start`. The Node server serves `dist` and the authentication API on port 3001. Set `PORT` to change the server port. To verify a production build, run `npm run build`.

Run backend tests with `npm test`.

Passwords are stored as scrypt hashes, and login sessions are random, expiring tokens stored hashed in SQLite and sent in HTTP-only, same-site cookies. Names and email addresses for accounts used on the current browser are remembered locally to make switching accounts easier; passwords are never stored in the browser. For an HTTPS deployment, set `HOST=0.0.0.0` and `COOKIE_SECURE=true` so the server is reachable by the platform and session cookies are sent only over HTTPS.

## Deploy to Vercel

Vercel runs API routes as serverless functions and does not provide a persistent local SQLite file. The `/api` function uses Turso (hosted libSQL, compatible with SQLite) for production users and sessions. Create a Turso database, then add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the Vercel project’s Environment Variables for Production (and Preview if needed). Redeploy after adding the variables. The function initializes its schema on first use.

The serverless auth route will fail with a clear 503 if these variables are missing, instead of crashing with a generic runtime error. The exact Vercel settings are:

```bash
TURSO_DATABASE_URL=libsql://your-database-name-your-account.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

Local accounts in `data/arallink.sqlite` are separate from Turso accounts and are not copied automatically. Create accounts again on the deployed app or migrate them intentionally. Never commit database tokens or passwords.

## Increment 1 scope

- Addition and subtraction practice within 10
- Student progress, stars, badges, and lesson completion views
- Teacher classroom roster and progress overview
- Guardian/teacher notification feed
- Desktop web experience only; mobile screens and a mobile app are out of scope

## Learning API

Teacher learning routes require the HTTP-only `aral_session` cookie. Each teacher account owns a classroom; teachers create and remove student profiles there. The Classroom tab shows a generated classroom code and teacher-only answer keys. Students sign in using that code, their classroom name, and a teacher-issued 4–8 digit PIN. PINs are stored as salted scrypt hashes, student sessions use a separate HTTP-only cookie, and student requests are scoped to their profile. Student lesson and guide responses omit answer keys; the server grades submitted answers and returns explanations afterward. New student profiles begin with zero progress and lesson one unlocked. Student IDs are checked against their teacher's classroom before teacher routes read or write progress.

- `GET /api/learning/classroom` returns the classroom and roster with weekly activity, accuracy, stars, and completed lesson counts.
- `POST /api/learning/students` creates a student with `{ "name": "...", "pin": "1234" }`; `PUT /api/learning/students/:id/pin` resets a PIN and revokes that student's active sessions; `DELETE /api/learning/students/:id` removes that student's learning records.
- `GET /api/learning/classroom/guides` returns teacher guides and answer keys.
- `GET /api/learning/lessons?studentId=:id` returns lesson catalog entries and saved progress.
- `PUT /api/learning/lessons/:lessonId/progress` saves `{ "studentId": 1, "progress": 0 }` with progress between 0 and 100.
- `POST /api/learning/practice-sessions` saves `{ "studentId": 1, "activityId": "quick-practice", "correctCount": 3, "questionCount": 4, "durationSeconds": 90 }`; five sessions award the Number Explorer badge once.
- `GET /api/learning/progress?studentId=:id` returns lifetime and current-week results, completed lessons, stars, and earned badges.
- `GET /api/learning/notifications` lists classroom notifications; `PATCH /api/learning/notifications/read` marks them read.

Student sign-in uses `POST /api/student/login` with `{ "joinCode": "CLASSCODE", "name": "...", "pin": "1234" }`. Student sessions use a separate HTTP-only cookie from teacher sessions. `/api/student/lessons` and `/api/student/classroom/guides` omit answer keys; `POST /api/student/practice` and teacher practice submissions are graded on the server and return worked explanations after submission.
