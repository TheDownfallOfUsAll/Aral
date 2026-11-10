# AralLink Spring Boot Backend

Spring Boot REST API for Increment 1 CRUD of AralLink's three core entities:
teachers, classrooms, and students. This is a standalone coursework backend;
the existing Node.js frontend/API continues to run separately.

## Project metadata

| Setting | Value |
|---|---|
| Group | `com.it342g02.groupname.thedownfallofusall` |
| Artifact | `arallink` |
| Java | 17 or newer |
| Framework | Spring Boot 3.5.6 |
| Database | SQLite |
| Default API port | 8080 |

Java sources are in `src/main/java/com/it342g02/groupname/thedownfallofusall`,
organized into `entity`, `repository`, `service`, and `controller` packages.

## Requirements

- Java Development Kit (JDK) 17 or newer
- Maven 3.6.3 or newer

MySQL and MySQL Workbench are **not required**. The SQLite JDBC driver is
included as a Maven dependency.

Check the installed tools from PowerShell:

```powershell
java -version
mvn -version
```

## Run the API

Open PowerShell and change to the backend directory:

```powershell
Set-Location "C:\Users\YOUR_USERNAME\Documents\GitHub\Aral\backend"
mvn spring-boot:run
```

Replace `YOUR_USERNAME` with your Windows account folder. Alternatively, open
PowerShell at the repository root and run:

```powershell
mvn -f backend\pom.xml spring-boot:run
```

Spring Boot creates the SQLite database and tables automatically on first
startup. The default database file is `backend/arallink.db` (relative to the
backend working directory). Keep the PowerShell window open while using the
API. Stop the server with **Ctrl+C**.

If Maven is not installed but the temporary Maven distribution from this
workspace is available, run:

```powershell
Set-Location "C:\Users\YOUR_USERNAME\Documents\GitHub\Aral\backend"
& "$env:TEMP\apache-maven-3.9.11\bin\mvn.cmd" spring-boot:run
```

### Port already in use

If another application is using port 8080, start this API on 8081 instead:

```powershell
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

Use the port selected at startup when sending requests.

## Database configuration

The defaults are in `src/main/resources/application.properties`:

```properties
spring.datasource.url=${DB_URL:jdbc:sqlite:./arallink.db}
spring.datasource.driver-class-name=org.sqlite.JDBC
spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect
spring.jpa.hibernate.ddl-auto=update
server.port=8080
```

No database name, user, or password needs to be created. Hibernate's `update`
mode creates missing entity tables and updates their schema; it does not
automatically delete the existing `item` table. The SQLite database is local to
the Spring backend and is separate from the Node application's
`data/arallink.sqlite` database. The applications do not share data.

To use a different SQLite file, set `DB_URL` before starting Spring Boot:

```powershell
$env:DB_URL = "jdbc:sqlite:C:/Users/YOUR_USERNAME/Documents/arallink.db"
mvn spring-boot:run
```

Back up the database file before replacing or removing it. Deleting the SQLite
file permanently deletes the Spring backend's stored records.

## API endpoints

Base URL: `http://localhost:8080`. All request and response bodies use JSON.

| Entity | Create | List / read one | Update | Delete |
|---|---|---|---|---|
| Teacher | `POST /api/teachers` | `GET /api/teachers`, `GET /api/teachers/{id}` | `PUT /api/teachers/{id}` | `DELETE /api/teachers/{id}` |
| Classroom | `POST /api/classrooms` | `GET /api/classrooms`, `GET /api/classrooms/{id}` | `PUT /api/classrooms/{id}` | `DELETE /api/classrooms/{id}` |
| Student | `POST /api/students` | `GET /api/students`, `GET /api/students/{id}` | `PUT /api/students/{id}` | `DELETE /api/students/{id}` |

Filter the student list by classroom with
`GET /api/students?classroomId=1`.

### Create a teacher

`POST /api/teachers`

```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "password": "choose-a-password"
}
```

Names and emails are required, emails must be valid and unique, and passwords
must contain at least eight characters. Passwords are stored as salted PBKDF2
hashes. Password hashes and salts are never included in teacher responses.
When updating a teacher, omit `password` to keep the current password or
provide a new password to change it.

### Create a classroom

`POST /api/classrooms`

```json
{
  "name": "Grade 1 - A",
  "grade": 1,
  "ownerUserId": 1
}
```

The owner must be an existing teacher, and each teacher can own one classroom.

### Create a student

`POST /api/students`

```json
{
  "name": "Student Name",
  "grade": 1,
  "classroomId": 1
}
```

The classroom must already exist. Deleting a classroom also deletes its
associated students; deleting a teacher also deletes their classroom and its
students.

## Test the API from PowerShell

Check the teacher list:

```powershell
Invoke-RestMethod "http://localhost:8080/api/teachers"
```

Create a teacher:

```powershell
$teacher = @{
    name = "Teacher Name"
    email = "teacher@example.com"
    password = "choose-a-password"
} | ConvertTo-Json

Invoke-RestMethod `
    -Uri "http://localhost:8080/api/teachers" `
    -Method Post `
    -ContentType "application/json" `
    -Body $teacher
```

For an API running on port 8081, change `localhost:8080` to
`localhost:8081` in the request URL.

## Responses and validation

- Successful creation returns **201 Created** and the saved record.
- Successful reads and updates return **200 OK**.
- Successful deletion returns **204 No Content**.
- Invalid request data returns **400 Bad Request** with a JSON error.
- A missing teacher, classroom, or student returns **404 Not Found**.
- Duplicate teacher emails or classroom owners return **409 Conflict**.

## Run automated tests

From the backend directory:

```powershell
mvn test
```

Or from the repository root:

```powershell
mvn -f backend\pom.xml test
```

## Frontend and CORS

The React/Vite frontend and its existing Node API are separate from this Spring
Boot backend. `npm run dev` starts the existing frontend and Node API; it does
not start Spring Boot or route frontend API calls to it. Spring permits browser
requests from `http://localhost:5173` by default. Override the allowed origin
with `FRONTEND_ORIGIN` if needed:

```powershell
$env:FRONTEND_ORIGIN = "http://localhost:5173"
```

Changing the allowed origin only enables cross-origin browser requests; it
does not connect the frontend to Spring endpoints.

## Scope and security

This Increment 1 backend exposes CRUD for teachers, classrooms, and students.
The session, credential, practice, lesson progress, badge, and notification
tables from the full ERD are outside this backend increment.

These example CRUD endpoints do not implement authentication or authorization.
Do not expose the backend to the public internet or use real personal data
without adding appropriate access controls.
