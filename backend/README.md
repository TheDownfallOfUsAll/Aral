# AralLink Spring Boot Backend

This backend implements CRUD for the Increment 1 core entities: teachers
(`users`), classrooms, and students. Maven metadata:

- Group: `com.it342g02.groupname.thedownfallofusall`
- Artifact: `arallink`
- Java: 17+
- SQLite database: `backend/arallink.db`

The existing Node API remains unchanged. The backend uses the existing core
table names (`users`, `classrooms`, and `students`). The SQLite database file
is created automatically on startup. Hibernate's `update` mode does not drop
the earlier `item` table or delete its data.

## Database and startup

No MySQL installation, database setup, or database credentials are required.
From PowerShell, run the backend:

```powershell
Set-Location "C:\path\to\Aral\backend"
mvn spring-boot:run
```

The API listens on port 8080. The SQLite database is saved at
`backend/arallink.db`. Override the JDBC URL with `DB_URL` if needed.

## CRUD endpoints

All request and response bodies use JSON.

| Entity | Create | List / read one | Update | Delete |
|---|---|---|---|---|
| Teacher | `POST /api/teachers` | `GET /api/teachers`, `GET /api/teachers/{id}` | `PUT /api/teachers/{id}` | `DELETE /api/teachers/{id}` |
| Classroom | `POST /api/classrooms` | `GET /api/classrooms`, `GET /api/classrooms/{id}` | `PUT /api/classrooms/{id}` | `DELETE /api/classrooms/{id}` |
| Student | `POST /api/students` | `GET /api/students`, `GET /api/students/{id}` | `PUT /api/students/{id}` | `DELETE /api/students/{id}` |

Filter students by classroom with `GET /api/students?classroomId=1`.

Create a teacher with:

```json
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "password": "choose-a-password"
}
```

Passwords must contain at least eight characters and are stored as salted
PBKDF2 hashes. Teacher responses never include password hashes or salts. To
change a teacher's password, include a new `password` in the update request;
omit it to keep the current password.

Create a classroom with `{"name":"Grade 1 - A","grade":1,"ownerUserId":1}`.
Each teacher can own one classroom. Create a student with
`{"name":"Student Name","grade":1,"classroomId":1}`.

The project ERD's security and learning-support tables (sessions, credentials,
practice records, lesson progress, badges, and notifications) are not exposed
as general CRUD endpoints in this Increment 1 backend. These CRUD routes are
intended for local coursework and do not implement authentication or
authorization; do not expose them to the public internet.
