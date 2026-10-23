import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const studentSessionCookie = 'aral_student_session'
const studentSessionDuration = 12 * 60 * 60
const studentLoginAttempts = new Map()
const lessons = [
  { id: 'adding-within-10', title: 'Adding within 10', topic: 'ADDITION', guide: 'Start with the first number. Count forward once for each object in the second group.', workedExample: 'For 4 + 3, count 5, 6, 7 after 4.', question: '4 + 3', choices: [6, 7, 8], answer: 7, explanation: 'Start at 4 and count three steps: 5, 6, 7.' },
  { id: 'subtracting-within-10', title: 'Taking away within 10', topic: 'SUBTRACTION', guide: 'Start with the first number. Count backward once for each object you take away.', workedExample: 'For 9 - 5, count back five steps from 9.', question: '9 - 5', choices: [3, 4, 5], answer: 4, explanation: 'Start at 9 and count back five steps: 8, 7, 6, 5, 4.' },
  { id: 'make-10', title: 'Make 10', topic: 'NUMBER SENSE', guide: 'Look for the number that fills the gap to ten.', workedExample: 'If you have 6, count up to find how many more make 10.', question: '6 + 4', choices: [8, 9, 10], answer: 10, explanation: 'Six needs four more to make ten: 7, 8, 9, 10.' },
]
const practiceQuestions = [
  { expression: '4 + 3', answer: 7, choices: [6, 7, 8], explanation: 'Start at 4 and count three steps: 5, 6, 7.' },
  { expression: '9 - 5', answer: 4, choices: [3, 4, 5], explanation: 'Start at 9 and count back five steps: 8, 7, 6, 5, 4.' },
  { expression: '6 + 2', answer: 8, choices: [7, 8, 9], explanation: 'Start at 6 and count two steps: 7, 8.' },
  { expression: '10 - 6', answer: 4, choices: [4, 5, 6], explanation: 'Start at 10 and count back six steps: 9, 8, 7, 6, 5, 4.' },
]

const json = (response, status, body) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

const getCookie = (request, name) => {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=')
    if (separator >= 0 && item.slice(0, separator).trim() === name) {
      return item.slice(separator + 1).trim()
    }
  }
  return null
}

const studentCookieHeader = (token, maxAge = studentSessionDuration) => {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.VERCEL === '1' ? '; Secure' : ''
  return `${studentSessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

const getStudentSession = async (request, db) => {
  const token = getCookie(request, studentSessionCookie)
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null
  const result = await db.execute({
    sql: `SELECT students.id, students.name, students.grade, classrooms.id AS classroom_id,
      classrooms.name AS classroom_name
      FROM student_sessions
      JOIN students ON students.id = student_sessions.student_id
      JOIN classrooms ON classrooms.id = students.classroom_id
      WHERE student_sessions.token_hash = ? AND student_sessions.expires_at > ?`,
    args: [hashToken(token), Date.now()],
  })
  return result.rows[0] ?? null
}

const checkStudentLoginRate = (request) => {
  const address = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
    ?? request.socket?.remoteAddress
    ?? 'unknown'
  const now = Date.now()
  const recent = (studentLoginAttempts.get(address) ?? []).filter((time) => now - time < 15 * 60 * 1000)
  if (recent.length >= 10) return false
  recent.push(now)
  studentLoginAttempts.set(address, recent)
  return true
}

const readJson = async (request) => {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    const error = new Error('Please submit the form using JSON.')
    error.status = 415
    throw error
  }
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 10 * 1024) {
      const error = new Error('Request body is too large.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch {
    const error = new Error('Please submit valid form information.')
    error.status = 400
    throw error
  }
}

const ensureClassroom = async (db, userId) => {
  await db.execute({
    sql: `INSERT OR IGNORE INTO classrooms (owner_user_id, name, grade, created_at)
      VALUES (?, ?, ?, ?)`,
    args: [userId, 'My classroom', 1, Date.now()],
  })
  const existing = await db.execute({
    sql: 'SELECT id, name, grade FROM classrooms WHERE owner_user_id = ?',
    args: [userId],
  })
  const classroom = existing.rows[0]
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const access = await db.execute({
      sql: 'SELECT join_code FROM classroom_access WHERE classroom_id = ?',
      args: [classroom.id],
    })
    if (access.rows[0]) return { ...classroom, joinCode: access.rows[0].join_code }
    await db.execute({
      sql: 'INSERT OR IGNORE INTO classroom_access (classroom_id, join_code) VALUES (?, ?)',
      args: [classroom.id, randomBytes(4).toString('hex').toUpperCase()],
    })
  }
  const access = await db.execute({
    sql: 'SELECT join_code FROM classroom_access WHERE classroom_id = ?',
    args: [classroom.id],
  })
  if (!access.rows[0]) throw new Error('Could not create a classroom sign-in code.')
  return { ...classroom, joinCode: access.rows[0].join_code }
}

const getOwnedStudent = async (db, classroomId, studentId) => {
  const result = await db.execute({
    sql: 'SELECT id, name, grade FROM students WHERE id = ? AND classroom_id = ?',
    args: [studentId, classroomId],
  })
  return result.rows[0] ?? null
}

const addNotification = (db, classroomId, studentId, type, title, body, createdAt) =>
  db.execute({
    sql: `INSERT INTO notifications
      (classroom_id, student_id, type, title, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    args: [classroomId, studentId, type, title, body, createdAt],
  })

const startOfCurrentWeek = () => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.getTime()
}

export const ensureLearningSchema = async (db) => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS classrooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS classroom_access (
      classroom_id INTEGER PRIMARY KEY REFERENCES classrooms(id) ON DELETE CASCADE,
      join_code TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS student_credentials (
      student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
      pin_hash BLOB NOT NULL,
      pin_salt BLOB NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS student_sessions (
      token_hash TEXT PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      activity_id TEXT NOT NULL,
      correct_count INTEGER NOT NULL,
      question_count INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS lesson_progress (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      progress INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, lesson_id)
    )`,
    `CREATE TABLE IF NOT EXISTS student_badges (
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL,
      awarded_at INTEGER NOT NULL,
      PRIMARY KEY (student_id, badge_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      classroom_id INTEGER NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER
    )`,
    'CREATE INDEX IF NOT EXISTS students_classroom ON students(classroom_id)',
    'CREATE INDEX IF NOT EXISTS student_sessions_expiry ON student_sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS practice_student_created ON practice_sessions(student_id, created_at)',
    'CREATE INDEX IF NOT EXISTS notifications_classroom_created ON notifications(classroom_id, created_at)',
  ]
  for (const sql of statements) await db.execute({ sql })
}

export const handleLearningApi = async (request, response, db, pathname, searchParams, userId) => {
  const classroom = await ensureClassroom(db, userId)

  if (request.method === 'GET' && pathname === '/api/learning/classroom') {
    const result = await db.execute({
      sql: `SELECT students.id, students.name, students.grade,
        COALESCE(practice.sessions, 0) AS sessions,
        COALESCE(practice.activities_this_week, 0) AS activities_this_week,
        COALESCE(practice.correct, 0) AS correct,
        COALESCE(practice.questions, 0) AS questions,
        COALESCE(lesson_totals.lessons_completed, 0) AS lessons_completed
        FROM students
        LEFT JOIN (
          SELECT student_id, COUNT(*) AS sessions,
            SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS activities_this_week,
            SUM(correct_count) AS correct, SUM(question_count) AS questions
          FROM practice_sessions GROUP BY student_id
        ) AS practice ON practice.student_id = students.id
        LEFT JOIN (
          SELECT student_id, SUM(CASE WHEN progress >= 100 THEN 1 ELSE 0 END) AS lessons_completed
          FROM lesson_progress GROUP BY student_id
        ) AS lesson_totals ON lesson_totals.student_id = students.id
        WHERE students.classroom_id = ? ORDER BY students.name COLLATE NOCASE`,
      args: [startOfCurrentWeek(), classroom.id],
    })
    const students = result.rows.map((row) => {
      const correct = Number(row.correct)
      const questions = Number(row.questions)
      return {
        id: Number(row.id),
        name: row.name,
        grade: Number(row.grade),
        sessions: Number(row.sessions),
        activitiesThisWeek: Number(row.activities_this_week),
        accuracy: questions ? Math.round(correct / questions * 100) : 0,
        stars: correct,
        lessonsCompleted: Number(row.lessons_completed),
      }
    })
    return json(response, 200, { classroom, students })
  }

  if (request.method === 'POST' && pathname === '/api/learning/students') {
    const input = await readJson(request)
    if (typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 80) {
      return json(response, 400, { error: 'Enter a student name (up to 80 characters).' })
    }
    if (typeof input.pin !== 'string' || !/^\d{4,8}$/.test(input.pin)) {
      return json(response, 400, { error: 'Set a student PIN containing 4 to 8 digits.' })
    }
    const duplicate = await db.execute({
      sql: 'SELECT id FROM students WHERE classroom_id = ? AND name = ? COLLATE NOCASE',
      args: [classroom.id, input.name.trim()],
    })
    if (duplicate.rows[0]) return json(response, 409, { error: 'A student with this name is already in the classroom.' })
    const created = await db.execute({
      sql: 'INSERT INTO students (classroom_id, name, grade, created_at) VALUES (?, ?, ?, ?)',
      args: [classroom.id, input.name.trim(), 1, Date.now()],
    })
    const studentId = Number(created.lastInsertRowid)
    const pinSalt = randomBytes(16)
    const pinHash = await scrypt(input.pin, pinSalt, 64)
    await db.execute({
      sql: 'INSERT INTO student_credentials (student_id, pin_hash, pin_salt) VALUES (?, ?, ?)',
      args: [studentId, pinHash, pinSalt],
    })
    return json(response, 201, {
      student: { id: studentId, name: input.name.trim(), grade: 1 },
    })
  }

  const studentMatch = pathname.match(/^\/api\/learning\/students\/(\d+)$/)
  if (request.method === 'DELETE' && studentMatch) {
    const student = await getOwnedStudent(db, classroom.id, Number(studentMatch[1]))
    if (!student) return json(response, 404, { error: 'Student not found.' })
    await db.execute({
      sql: 'DELETE FROM students WHERE id = ? AND classroom_id = ?',
      args: [student.id, classroom.id],
    })
    return json(response, 200, { ok: true })
  }

  const studentPinMatch = pathname.match(/^\/api\/learning\/students\/(\d+)\/pin$/)
  if (request.method === 'PUT' && studentPinMatch) {
    const student = await getOwnedStudent(db, classroom.id, Number(studentPinMatch[1]))
    if (!student) return json(response, 404, { error: 'Student not found.' })
    const input = await readJson(request)
    if (typeof input.pin !== 'string' || !/^\d{4,8}$/.test(input.pin)) {
      return json(response, 400, { error: 'Set a student PIN containing 4 to 8 digits.' })
    }
    const salt = randomBytes(16)
    const pinHash = await scrypt(input.pin, salt, 64)
    await db.execute({
      sql: `INSERT INTO student_credentials (student_id, pin_hash, pin_salt) VALUES (?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt`,
      args: [student.id, pinHash, salt],
    })
    await db.execute({ sql: 'DELETE FROM student_sessions WHERE student_id = ?', args: [student.id] })
    return json(response, 200, { ok: true })
  }

  if (request.method === 'GET' && pathname === '/api/learning/classroom/guides') {
    return json(response, 200, {
      lessons: lessons.map(({ id, title, topic, guide, workedExample, answer }) => ({
        id, title, topic, guide, workedExample, answer,
      })),
    })
  }

  if (request.method === 'GET' && pathname === '/api/learning/lessons') {
    const studentId = Number(searchParams.get('studentId'))
    if (!Number.isSafeInteger(studentId) || studentId < 1) {
      return json(response, 400, { error: 'Choose a valid student.' })
    }
    if (!await getOwnedStudent(db, classroom.id, studentId)) {
      return json(response, 404, { error: 'Student not found.' })
    }
    const result = await db.execute({
      sql: 'SELECT lesson_id, progress, updated_at FROM lesson_progress WHERE student_id = ?',
      args: [studentId],
    })
    const progressById = new Map(result.rows.map((row) => [row.lesson_id, row]))
    return json(response, 200, {
      lessons: lessons.map((lesson) => ({
        ...lesson,
        progress: Number(progressById.get(lesson.id)?.progress ?? 0),
      })),
    })
  }

  const lessonMatch = pathname.match(/^\/api\/learning\/lessons\/([a-z0-9-]+)\/progress$/)
  if (request.method === 'PUT' && lessonMatch) {
    const lesson = lessons.find(({ id }) => id === lessonMatch[1])
    if (!lesson) return json(response, 404, { error: 'Lesson not found.' })
    const input = await readJson(request)
    const studentId = Number(input.studentId)
    if (!Number.isSafeInteger(studentId) || studentId < 1 || !Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100) {
      return json(response, 400, { error: 'Choose a valid student and lesson progress from 0 to 100.' })
    }
    const student = await getOwnedStudent(db, classroom.id, studentId)
    if (!student) return json(response, 404, { error: 'Student not found.' })
    const prior = await db.execute({
      sql: 'SELECT progress FROM lesson_progress WHERE student_id = ? AND lesson_id = ?',
      args: [studentId, lesson.id],
    })
    const updatedAt = Date.now()
    await db.execute({
      sql: `INSERT INTO lesson_progress (student_id, lesson_id, progress, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id, lesson_id) DO UPDATE SET progress = excluded.progress, updated_at = excluded.updated_at`,
      args: [studentId, lesson.id, input.progress, updatedAt],
    })
    if (input.progress === 100 && Number(prior.rows[0]?.progress ?? 0) < 100) {
      await addNotification(
        db, classroom.id, studentId, 'lesson-complete', 'A lesson is complete',
        `${student.name} completed ${lesson.title}.`, updatedAt,
      )
    }
    return json(response, 200, { lessonId: lesson.id, progress: input.progress, updatedAt })
  }

  if (request.method === 'GET' && pathname === '/api/learning/practice-questions') {
    const studentId = Number(searchParams.get('studentId'))
    const activityId = searchParams.get('activityId') ?? 'quick-practice'
    if (!Number.isSafeInteger(studentId) || studentId < 1 || !await getOwnedStudent(db, classroom.id, studentId)) {
      return json(response, 404, { error: 'Student not found.' })
    }
    const lesson = activityId === 'quick-practice' ? null : lessons.find(({ id }) => id === activityId)
    if (activityId !== 'quick-practice' && !lesson) return json(response, 404, { error: 'Lesson not found.' })
    const questionSet = lesson ? [lesson] : practiceQuestions
    return json(response, 200, {
      questions: questionSet.map(({ expression, question, choices }) => ({ expression: expression ?? question, choices })),
    })
  }

  if (request.method === 'POST' && pathname === '/api/learning/practice-sessions') {
    const input = await readJson(request)
    const studentId = Number(input.studentId)
    const durationSeconds = input.durationSeconds ?? 0
    const activityId = typeof input.activityId === 'string' ? input.activityId : ''
    const lesson = activityId === 'quick-practice' ? null : lessons.find(({ id }) => id === activityId)
    const questionSet = lesson ? [lesson] : activityId === 'quick-practice' ? practiceQuestions : null
    if (!Number.isSafeInteger(studentId) || studentId < 1 ||
      !questionSet || !Array.isArray(input.answers) || input.answers.length !== questionSet.length ||
      input.answers.some((answer, index) => !Number.isInteger(answer) || !questionSet[index].choices.includes(answer)) ||
      !Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86_400) {
      return json(response, 400, { error: 'Submit a valid practice result.' })
    }
    const student = await getOwnedStudent(db, classroom.id, studentId)
    if (!student) return json(response, 404, { error: 'Student not found.' })
    const correctCount = questionSet.reduce((sum, question, index) => sum + (input.answers[index] === question.answer ? 1 : 0), 0)
    const createdAt = Date.now()
    const created = await db.execute({
      sql: `INSERT INTO practice_sessions
        (student_id, activity_id, correct_count, question_count, duration_seconds, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [studentId, activityId, correctCount, questionSet.length, durationSeconds, createdAt],
    })
    if (lesson) {
      const prior = await db.execute({
        sql: 'SELECT progress FROM lesson_progress WHERE student_id = ? AND lesson_id = ?',
        args: [studentId, lesson.id],
      })
      const updatedProgress = Math.round(correctCount / questionSet.length * 100)
      await db.execute({
        sql: `INSERT INTO lesson_progress (student_id, lesson_id, progress, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, lesson_id) DO UPDATE SET progress = MAX(progress, excluded.progress), updated_at = excluded.updated_at`,
        args: [studentId, lesson.id, updatedProgress, createdAt],
      })
      if (updatedProgress === 100 && Number(prior.rows[0]?.progress ?? 0) < 100) {
        await addNotification(db, classroom.id, studentId, 'lesson-complete', 'A lesson is complete', `${student.name} completed ${lesson.title}.`, createdAt)
      }
    }
    await addNotification(
      db, classroom.id, studentId, 'practice-complete', 'Practice session complete',
      `${student.name} completed a practice session.`, createdAt,
    )
    const completedSessions = await db.execute({
      sql: 'SELECT COUNT(*) AS count FROM practice_sessions WHERE student_id = ?',
      args: [studentId],
    })
    if (Number(completedSessions.rows[0].count) >= 5) {
      const badge = await db.execute({
        sql: 'INSERT OR IGNORE INTO student_badges (student_id, badge_id, awarded_at) VALUES (?, ?, ?)',
        args: [studentId, 'number-explorer', createdAt],
      })
      if (Number(badge.rowsAffected) > 0) {
        await addNotification(
          db, classroom.id, studentId, 'badge-earned', 'A new badge was earned',
          `${student.name} earned the Number Explorer badge.`, createdAt,
        )
      }
    }
    return json(response, 201, {
      id: Number(created.lastInsertRowid),
      createdAt,
      correctCount,
      questionCount: questionSet.length,
      explanations: questionSet.map((question, index) => ({
        expression: question.expression ?? question.question,
        selectedAnswer: input.answers[index],
        answer: question.answer,
        correct: input.answers[index] === question.answer,
        explanation: question.explanation,
      })),
    })
  }

  if (request.method === 'GET' && pathname === '/api/learning/progress') {
    const studentId = Number(searchParams.get('studentId'))
    if (!Number.isSafeInteger(studentId) || studentId < 1) {
      return json(response, 400, { error: 'Choose a valid student.' })
    }
    if (!await getOwnedStudent(db, classroom.id, studentId)) {
      return json(response, 404, { error: 'Student not found.' })
    }
    const [practice, weeklyPractice, lessonResult, badgeResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) AS sessions, COALESCE(SUM(correct_count), 0) AS correct,
          COALESCE(SUM(question_count), 0) AS questions,
          COALESCE(SUM(duration_seconds), 0) AS duration_seconds
          FROM practice_sessions WHERE student_id = ?`,
        args: [studentId],
      }),
      db.execute({
        sql: `SELECT COUNT(*) AS sessions, COALESCE(SUM(correct_count), 0) AS correct,
          COALESCE(SUM(question_count), 0) AS questions
          FROM practice_sessions WHERE student_id = ? AND created_at >= ?`,
        args: [studentId, startOfCurrentWeek()],
      }),
      db.execute({
        sql: 'SELECT COUNT(*) AS completed FROM lesson_progress WHERE student_id = ? AND progress >= 100',
        args: [studentId],
      }),
      db.execute({
        sql: 'SELECT badge_id, awarded_at FROM student_badges WHERE student_id = ? ORDER BY awarded_at',
        args: [studentId],
      }),
    ])
    const totals = practice.rows[0]
    const weeklyTotals = weeklyPractice.rows[0]
    const correct = Number(totals.correct)
    const questions = Number(totals.questions)
    const weeklyCorrect = Number(weeklyTotals.correct)
    const weeklyQuestions = Number(weeklyTotals.questions)
    return json(response, 200, {
      sessions: Number(totals.sessions),
      correct,
      questions,
      accuracy: questions ? Math.round(correct / questions * 100) : 0,
      weeklySessions: Number(weeklyTotals.sessions),
      weeklyCorrect,
      weeklyQuestions,
      weeklyAccuracy: weeklyQuestions ? Math.round(weeklyCorrect / weeklyQuestions * 100) : 0,
      durationSeconds: Number(totals.duration_seconds),
      lessonsCompleted: Number(lessonResult.rows[0].completed),
      badges: badgeResult.rows.map((row) => ({ id: row.badge_id, awardedAt: Number(row.awarded_at) })),
      stars: correct,
    })
  }

  if (request.method === 'GET' && pathname === '/api/learning/notifications') {
    const result = await db.execute({
      sql: `SELECT id, student_id, type, title, body, created_at, read_at
        FROM notifications WHERE classroom_id = ? ORDER BY created_at DESC LIMIT 100`,
      args: [classroom.id],
    })
    return json(response, 200, { notifications: result.rows })
  }

  if (request.method === 'PATCH' && pathname === '/api/learning/notifications/read') {
    await db.execute({
      sql: 'UPDATE notifications SET read_at = ? WHERE classroom_id = ? AND read_at IS NULL',
      args: [Date.now(), classroom.id],
    })
    return json(response, 200, { ok: true })
  }

  return json(response, 404, { error: 'Not found.' })
}

export const handleStudentLogin = async (request, response, db) => {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' })
  if (!checkStudentLoginRate(request)) {
    return json(response, 429, { error: 'Too many student sign-in attempts. Please try again later.' })
  }
  const input = await readJson(request)
  const joinCode = typeof input.joinCode === 'string' ? input.joinCode.trim().toUpperCase() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const pin = input.pin
  const invalidResponse = () => json(response, 401, { error: 'Classroom code, student name, or PIN is incorrect.' })
  if (!/^[A-F0-9]{8}$/.test(joinCode) || !name || name.length > 80 || typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) {
    return invalidResponse()
  }
  const lookup = await db.execute({
    sql: `SELECT students.id, students.name, students.grade, classrooms.id AS classroom_id,
      classrooms.name AS classroom_name, student_credentials.pin_hash, student_credentials.pin_salt
      FROM classroom_access
      JOIN classrooms ON classrooms.id = classroom_access.classroom_id
      JOIN students ON students.classroom_id = classrooms.id
      JOIN student_credentials ON student_credentials.student_id = students.id
      WHERE classroom_access.join_code = ? AND students.name = ? COLLATE NOCASE`,
    args: [joinCode, name],
  })
  const student = lookup.rows[0]
  const salt = student?.pin_salt ? Buffer.from(student.pin_salt) : Buffer.alloc(16)
  const expected = student?.pin_hash ? Buffer.from(student.pin_hash) : Buffer.alloc(64)
  const actual = await scrypt(pin, salt, 64)
  if (!student || !timingSafeEqual(expected, actual)) return invalidResponse()

  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + studentSessionDuration * 1000
  await db.execute({ sql: 'DELETE FROM student_sessions WHERE expires_at <= ?', args: [Date.now()] })
  await db.execute({
    sql: 'INSERT INTO student_sessions (token_hash, student_id, expires_at) VALUES (?, ?, ?)',
    args: [hashToken(token), Number(student.id), expiresAt],
  })
  response.setHeader('Set-Cookie', studentCookieHeader(token))
  return json(response, 200, {
    student: { id: Number(student.id), name: student.name, grade: Number(student.grade) },
    classroom: { id: Number(student.classroom_id), name: student.classroom_name },
  })
}

export const handleStudentApi = async (request, response, db, pathname) => {
  if (request.method === 'POST' && pathname === '/api/student/logout') {
    const token = getCookie(request, studentSessionCookie)
    if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      await db.execute({ sql: 'DELETE FROM student_sessions WHERE token_hash = ?', args: [hashToken(token)] })
    }
    return json(response, 200, { ok: true }, { 'Set-Cookie': studentCookieHeader('', 0) })
  }

  const student = await getStudentSession(request, db)
  if (!student) return json(response, 401, { error: 'Sign in with your classroom code, name, and PIN.' })

  if (request.method === 'GET' && pathname === '/api/student/me') {
    return json(response, 200, {
      student: { id: Number(student.id), name: student.name, grade: Number(student.grade) },
      classroom: { id: Number(student.classroom_id), name: student.classroom_name },
    })
  }

  if (request.method === 'GET' && pathname === '/api/student/lessons') {
    const progress = await db.execute({ sql: 'SELECT lesson_id, progress FROM lesson_progress WHERE student_id = ?', args: [student.id] })
    const progressById = new Map(progress.rows.map((row) => [row.lesson_id, Number(row.progress)]))
    return json(response, 200, {
      lessons: lessons.map(({ id, title, topic, guide, question, choices }) => ({
        id, title, topic, guide, question, choices,
        progress: progressById.get(id) ?? 0,
      })),
    })
  }

  if (request.method === 'GET' && pathname === '/api/student/classroom/guides') {
    return json(response, 200, {
      lessons: lessons.map(({ id, title, topic, guide }) => ({ id, title, topic, guide })),
    })
  }

  if (request.method === 'GET' && pathname === '/api/student/progress') {
    const [practice, lessonResult, badgeResult] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) AS sessions, COALESCE(SUM(correct_count), 0) AS correct,
          COALESCE(SUM(question_count), 0) AS questions
          FROM practice_sessions WHERE student_id = ?`,
        args: [student.id],
      }),
      db.execute({ sql: 'SELECT COUNT(*) AS completed FROM lesson_progress WHERE student_id = ? AND progress >= 100', args: [student.id] }),
      db.execute({ sql: 'SELECT badge_id, awarded_at FROM student_badges WHERE student_id = ? ORDER BY awarded_at', args: [student.id] }),
    ])
    const result = practice.rows[0]
    const correct = Number(result.correct)
    const questionCount = Number(result.questions)
    return json(response, 200, {
      sessions: Number(result.sessions),
      correct,
      questions: questionCount,
      accuracy: questionCount ? Math.round(correct / questionCount * 100) : 0,
      lessonsCompleted: Number(lessonResult.rows[0].completed),
      badges: badgeResult.rows.map((row) => ({ id: row.badge_id, awardedAt: Number(row.awarded_at) })),
      stars: correct,
    })
  }

  if (request.method === 'POST' && pathname === '/api/student/practice') {
    const input = await readJson(request)
    const activityId = typeof input.activityId === 'string' ? input.activityId : 'quick-practice'
    const lesson = activityId === 'quick-practice' ? null : lessons.find(({ id }) => id === activityId)
    if (activityId !== 'quick-practice' && !lesson) return json(response, 404, { error: 'Lesson not found.' })
    const questionSet = lesson ? [lesson] : practiceQuestions
    if (!Array.isArray(input.answers) || input.answers.length !== questionSet.length || input.answers.some((answer) => !Number.isInteger(answer))) {
      return json(response, 400, { error: 'Submit one answer for each practice question.' })
    }
    const correctCount = questionSet.reduce((sum, question, index) => sum + (input.answers[index] === question.answer ? 1 : 0), 0)
    const completedAt = Date.now()
    await db.execute({
      sql: `INSERT INTO practice_sessions (student_id, activity_id, correct_count, question_count, duration_seconds, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [student.id, activityId, correctCount, questionSet.length, 0, completedAt],
    })
    if (lesson) {
      const prior = await db.execute({
        sql: 'SELECT progress FROM lesson_progress WHERE student_id = ? AND lesson_id = ?',
        args: [student.id, lesson.id],
      })
      const value = Math.round(correctCount / questionSet.length * 100)
      await db.execute({
        sql: `INSERT INTO lesson_progress (student_id, lesson_id, progress, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, lesson_id) DO UPDATE SET progress = MAX(progress, excluded.progress), updated_at = excluded.updated_at`,
        args: [student.id, lesson.id, value, completedAt],
      })
      if (value === 100 && Number(prior.rows[0]?.progress ?? 0) < 100) {
        await addNotification(db, classroomId, Number(student.id), 'lesson-complete', 'A lesson is complete', `${student.name} completed ${lesson.title}.`, completedAt)
      }
    }
    const classroomId = Number(student.classroom_id)
    await addNotification(db, classroomId, Number(student.id), 'practice-complete', 'Practice session complete', `${student.name} finished a practice session.`, completedAt)
    const total = await db.execute({ sql: 'SELECT COUNT(*) AS count FROM practice_sessions WHERE student_id = ?', args: [student.id] })
    if (Number(total.rows[0].count) >= 5) {
      const badge = await db.execute({
        sql: 'INSERT OR IGNORE INTO student_badges (student_id, badge_id, awarded_at) VALUES (?, ?, ?)',
        args: [student.id, 'number-explorer', completedAt],
      })
      if (Number(badge.rowsAffected) > 0) await addNotification(db, classroomId, Number(student.id), 'badge-earned', 'A new badge was earned', `${student.name} earned the Number Explorer badge.`, completedAt)
    }
    return json(response, 201, {
      correctCount,
      questionCount: questionSet.length,
      explanations: questionSet.map((question, index) => ({
        expression: question.question ?? question.expression,
        selectedAnswer: input.answers[index],
        answer: question.answer,
        correct: input.answers[index] === question.answer,
        explanation: question.explanation,
      })),
    })
  }

  return json(response, 404, { error: 'Not found.' })
}