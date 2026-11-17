# AralLink for Numbers

AralLink for Numbers is a desktop-first Grade 1 math learning app. Its seven lessons introduce addition, subtraction, number sense, equal groups, and fair sharing. Students can also take five-question quizzes on addition, subtraction, multiplication, division, and number sense. Teachers can create a classroom and student profiles, then follow lesson progress, practice results, stars, badges, and notifications.

This project is currently scoped to Increment 1. Prototype and classroom data are kept locally when using the local development setup; no mobile screens or mobile application are included.

## Requirements

- Node.js 24 or newer. The local API uses Node's built-in SQLite support.
- npm (included with Node.js).
- Git, if you are cloning the repository.

Check that Node and npm are available in a terminal:

```bash
node --version
npm --version
```

The Node version should be `v24` or newer.

## Get started locally

1. Clone the repository and enter its folder:

   ```bash
   git clone https://github.com/TheDownfallOfUsAll/Aral.git
   cd Aral
   ```

   If you already have the project, open a terminal in its root folder (the folder containing `package.json`).

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development servers:

   ```bash
   npm run dev
   ```

   This starts the Vite web app and the local API. Keep this terminal open while you use the app. Open the frontend URL printed by Vite (usually `http://localhost:5173`). The API runs at `http://127.0.0.1:3001`.

4. Try the teacher and student flow:
   - Register a teacher account with a name, email address, and password (at least 8 characters).
   - Create a classroom and add a student from the classroom setup or Classroom area.
   - Use the classroom's join code and the student's name and PIN to sign in as that student.
   - Open lessons or practice and check progress from the teacher view.

5. Stop the development servers with **Ctrl+C** in the terminal.

The local SQLite database is created automatically at `data/arallink.sqlite`. It holds local accounts, sessions, and learning data. Keep it private, back it up before deleting or replacing it, and do not commit it to the repository. Local accounts and data are separate from any deployed environment.

## Verify changes

Run these commands from the repository root before submitting changes:

```bash
npm run lint
npm run build
npm test
```

- `npm run lint` checks the source with Oxlint.
- `npm run build` runs the TypeScript build and creates the production frontend in `dist`.
- `npm test` runs the Node.js test suite.

## Run the production build locally

After installing dependencies, build the frontend and start the Node server:

```bash
npm run build
npm start
```

The server serves the built frontend and API on port `3001` by default. Open `http://127.0.0.1:3001`. To use another port, set `PORT` before starting the server. For example, in PowerShell:

```powershell
$env:PORT = "3002"
npm start
```

On macOS or Linux:

```bash
PORT=3002 npm start
```

## Deploy to Vercel

The Vercel deployment uses serverless API routes. Vercel's serverless environment does not provide a persistent local SQLite database, so production accounts and sessions use Turso (hosted libSQL, SQLite-compatible) instead. Create a Turso database and configure these environment variables in the Vercel project settings for the environments you deploy:

```text
TURSO_DATABASE_URL=libsql://your-database-name-your-account.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
```

Redeploy after configuring the variables. The API returns a clear `503` response if the required Turso settings are missing. Local records in `data/arallink.sqlite` are not copied to Turso; create accounts again in the deployed app or migrate data intentionally. Never commit database files, credentials, or tokens.

## Increment 1 scope

- Seven student lessons covering addition and subtraction within 10, number sense, equal groups, and fair sharing
- Five-question student quizzes for addition, subtraction, multiplication, division, and number sense
- Student lessons, progress, stars, badges, and completion views
- Teacher classroom roster and progress overview
- Classroom notifications for teachers and guardians
- Desktop web experience only; mobile screens and a mobile app are out of scope

## Learning API

Teacher learning routes require the HTTP-only `aral_session` cookie. Each teacher account owns its classroom and manages its student profiles. Student sign-in uses a separate HTTP-only session cookie.

| Method and route | Description |
|---|---|
| `GET /api/learning/classroom` | Classroom and roster, including weekly activity, accuracy, stars, and completed lesson counts. |
| `POST /api/learning/students` | Create a student with `{ "name": "...", "pin": "1234" }`. |
| `PUT /api/learning/students/:id` | Rename a student in the signed-in teacher's classroom. |
| `PUT /api/learning/students/:id/pin` | Reset a student's PIN and revoke that student's active sessions. |
| `DELETE /api/learning/students/:id` | Remove a student from the classroom. |
| `GET /api/learning/classroom/guides` | Get teacher guides and answer keys. |
| `GET /api/learning/lessons?studentId=:id` | Get lesson catalog entries and saved progress. |
| `PUT /api/learning/lessons/:lessonId/progress` | Save progress from 0 to 100, for example `{ "studentId": 1, "progress": 0 }`. |
| `POST /api/learning/practice-sessions` | Save a practice result, for example `{ "studentId": 1, "activityId": "quick-practice", "correctCount": 3, "questionCount": 4, "durationSeconds": 90 }`. |
| `GET /api/learning/progress?studentId=:id` | Get lifetime and current-week results, completed lessons, stars, and earned badges. |
| `GET /api/learning/notifications` | List classroom notifications. |
| `PATCH /api/learning/notifications/read` | Mark notifications as read. |

Student sign-in uses `POST /api/student/login` with `{ "joinCode": "CLASSCODE", "name": "...", "pin": "1234" }`. Student sessions use a separate HTTP-only cookie from teacher sessions. `/api/student/lessons`, `/api/student/classroom/guides`, and the quiz endpoints omit answer keys. `GET /api/student/quizzes` lists topics, while `GET /api/student/quizzes/:topicId` returns a topic's questions and choices. Submit a quiz through `POST /api/student/practice` with an `activityId` such as `quiz:addition`, one selected choice per question, and an optional `durationSeconds`. Student practice and teacher practice submissions are graded on the server and return worked explanations after submission.

## Spring Boot classroom management

The desktop management page at `http://localhost:5173/management` requires a
signed-in teacher account. Open it from the teacher dashboard or the sign-in
page; if you are signed out, follow the sign-in link and return to management.
The teacher and management overviews show the current date and digital and
analog time in the `Asia/Manila` time zone.

The Students section manages real AralLink student logins through the
authenticated Node learning API. Create a student with a 4–8 digit PIN, then
share the displayed classroom code, the student's name, and PIN for sign-in.
You can rename a student or reset their PIN; the PIN is stored as a hash and
cannot be viewed later. These students appear in the teacher's classroom roster.

The Teachers and Classrooms sections are the separate Spring Boot CRUD
coursework API. Those records use the Spring Boot SQLite database and are not
AralLink sign-in accounts or the login classroom used by the student roster.

During Vite development, `/spring-api` is proxied to the Spring Boot API at
`http://127.0.0.1:8081` by default, keeping the existing Node `/api` routes
unchanged. If Spring Boot is running on another port, set the target before
starting Vite. For example, to use port 8080:

```powershell
$env:VITE_SPRING_API_TARGET = "http://127.0.0.1:8080"
npm run dev
```

Five saved practice sessions award the Number Explorer badge.

Student sign-in uses `POST /api/student/login` with `{ "joinCode": "CLASSCODE", "name": "...", "pin": "1234" }`. Other student routes are under `/api/student/`.

## Authentication and data notes

Teacher passwords are stored as scrypt hashes. Session tokens are random, expiring values stored as hashes in SQLite and sent in HTTP-only, same-site cookies. Names and email addresses entered for accounts are stored in the database. Use test data for local development and protect database backups and deployment credentials.

The standalone Spring Boot coursework API in [`backend/README.md`](backend/README.md) uses a separate database. `npm run dev` starts the Node API and frontend; start Spring Boot separately. The management page loads both APIs, so both servers must be running. The Vite proxy is for local development and preview; the production Node server does not automatically proxy requests to Spring Boot.
