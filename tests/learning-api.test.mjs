import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'
import {
  ensureLearningSchema,
  handleLearningApi,
  handleStudentApi,
  handleStudentLogin,
} from '../server/learning-api.mjs'

const createHarness = async () => {
  const database = new DatabaseSync(':memory:')
  database.exec('CREATE TABLE users (id INTEGER PRIMARY KEY)')
  database.exec('INSERT INTO users (id) VALUES (1), (2)')
  const db = {
    execute: async ({ sql, args = [] }) => {
      const statement = database.prepare(sql)
      if (/^(SELECT|WITH|PRAGMA)\b/i.test(sql.trim())) {
        return { rows: statement.all(...args) }
      }
      const result = statement.run(...args)
      return {
        rows: [],
        lastInsertRowid: Number(result.lastInsertRowid),
        rowsAffected: Number(result.changes),
      }
    },
  }
  await ensureLearningSchema(db)
  return { database, db }
}

const createResponse = () => ({
  writeHead(statusCode, headers) {
    this.statusCode = statusCode
    this.headers = { ...this.headers, ...headers }
  },
  setHeader(name, value) {
    this.headers = { ...this.headers, [name]: value }
  },
  end(bodyText) {
    this.body = bodyText ? JSON.parse(bodyText) : null
  },
})

const createRequest = (method, body, cookie) => {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  request.method = method
  request.headers = {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(cookie ? { cookie } : {}),
  }
  request.socket = { remoteAddress: '127.0.0.1' }
  return request
}

const callApi = async (db, userId, method, pathname, body) => {
  const request = createRequest(method, body)
  const response = createResponse()
  const url = new URL(pathname, 'http://localhost')
  await handleLearningApi(request, response, db, url.pathname, url.searchParams, userId)
  return response
}

const callStudentLogin = async (db, body) => {
  const request = createRequest('POST', body)
  const response = createResponse()
  await handleStudentLogin(request, response, db)
  return response
}

const callStudentApi = async (db, method, pathname, cookie, body) => {
  const request = createRequest(method, body, cookie)
  const response = createResponse()
  const url = new URL(pathname, 'http://localhost')
  await handleStudentApi(request, response, db, url.pathname, url.searchParams)
  return response
}

describe('learning API', () => {
  it('persists roster, lesson completion, practice progress, and notifications per classroom', async () => {
    const { database, db } = await createHarness()
    try {
      const added = await callApi(db, 1, 'POST', '/api/learning/students', { name: 'Mia Chen', pin: '1739' })
      assert.equal(added.statusCode, 201)
      const studentId = added.body.student.id

      const roster = await callApi(db, 1, 'GET', '/api/learning/classroom')
      assert.equal(roster.statusCode, 200)
      assert.equal(roster.body.students.length, 1)
      assert.equal(roster.body.students[0].name, 'Mia Chen')

      const invalidResult = await callApi(db, 1, 'POST', '/api/learning/practice-sessions', {
        studentId,
        activityId: 'quick-practice',
        answers: [7, 4],
      })
      assert.equal(invalidResult.statusCode, 400)

      const savedResult = await callApi(db, 1, 'POST', '/api/learning/practice-sessions', {
        studentId,
        activityId: 'quick-practice',
        answers: [7, 4, 8, 6],
        durationSeconds: 90,
      })
      assert.equal(savedResult.statusCode, 201)
      assert.equal(savedResult.body.correctCount, 3)
      assert.equal(savedResult.body.explanations.length, 4)

      const lessonPath = '/api/learning/lessons/adding-within-10/progress'
      assert.equal((await callApi(db, 1, 'PUT', lessonPath, { studentId, progress: 100 })).statusCode, 200)
      assert.equal((await callApi(db, 1, 'PUT', lessonPath, { studentId, progress: 100 })).statusCode, 200)

      const progress = await callApi(db, 1, 'GET', `/api/learning/progress?studentId=${studentId}`)
      assert.deepEqual(progress.body, {
        sessions: 1,
        correct: 3,
        questions: 4,
        accuracy: 75,
        weeklySessions: 1,
        weeklyCorrect: 3,
        weeklyQuestions: 4,
        weeklyAccuracy: 75,
        durationSeconds: 90,
        lessonsCompleted: 1,
        badges: [],
        stars: 3,
      })

      const classroomProgress = await callApi(db, 1, 'GET', '/api/learning/classroom')
      assert.deepEqual(classroomProgress.body.students[0], {
        id: studentId,
        name: 'Mia Chen',
        grade: 1,
        sessions: 1,
        activitiesThisWeek: 1,
        accuracy: 75,
        stars: 3,
        lessonsCompleted: 1,
      })

      const notifications = await callApi(db, 1, 'GET', '/api/learning/notifications')
      assert.equal(notifications.body.notifications.length, 2)
      assert.equal(notifications.body.notifications[0].type, 'lesson-complete')
      assert.equal((await callApi(db, 1, 'PATCH', '/api/learning/notifications/read')).statusCode, 200)
      const readNotifications = await callApi(db, 1, 'GET', '/api/learning/notifications')
      assert.ok(readNotifications.body.notifications.every(({ read_at }) => read_at !== null))

      const otherClassroom = await callApi(db, 2, 'GET', `/api/learning/progress?studentId=${studentId}`)
      assert.equal(otherClassroom.statusCode, 404)
    } finally {
      database.close()
    }
  })

  it('rejects invalid student names', async () => {
    const { database, db } = await createHarness()
    try {
      const invalidStudent = await callApi(db, 1, 'POST', '/api/learning/students', { name: '   ' })
      assert.equal(invalidStudent.statusCode, 400)
      assert.equal(invalidStudent.body.error, 'Enter a student name (up to 80 characters).')
    } finally {
      database.close()
    }
  })

  it('starts a new classroom and student at lesson one with zero saved progress', async () => {
    const { database, db } = await createHarness()
    try {
      const firstClassroom = await callApi(db, 2, 'GET', '/api/learning/classroom')
      assert.equal(firstClassroom.statusCode, 200)
      assert.deepEqual(firstClassroom.body.students, [])

      const added = await callApi(db, 2, 'POST', '/api/learning/students', { name: 'Avery Reed', pin: '2846' })
      const studentId = added.body.student.id
      const initialLessons = await callApi(db, 2, 'GET', `/api/learning/lessons?studentId=${studentId}`)
      assert.deepEqual(initialLessons.body.lessons.map(({ progress }) => progress), [0, 0, 0])

      const initialProgress = await callApi(db, 2, 'GET', `/api/learning/progress?studentId=${studentId}`)
      assert.equal(initialProgress.body.sessions, 0)
      assert.equal(initialProgress.body.accuracy, 0)
      assert.equal(initialProgress.body.stars, 0)
      assert.deepEqual(initialProgress.body.badges, [])
    } finally {
      database.close()
    }
  })

  it('isolates student PIN login and reveals answer explanations only after submission', async () => {
    const { database, db } = await createHarness()
    try {
      const added = await callApi(db, 1, 'POST', '/api/learning/students', { name: 'Sam Lee', pin: '5482' })
      assert.equal(added.statusCode, 201)
      const classroom = await callApi(db, 1, 'GET', '/api/learning/classroom')
      const joinCode = classroom.body.classroom.joinCode

      const wrongPin = await callStudentLogin(db, { joinCode, name: 'Sam Lee', pin: '0000' })
      assert.equal(wrongPin.statusCode, 401)

      const login = await callStudentLogin(db, { joinCode, name: 'Sam Lee', pin: '5482' })
      assert.equal(login.statusCode, 200)
      const studentCookie = login.headers['Set-Cookie'].split(';')[0]
      const studentGuides = await callStudentApi(db, 'GET', '/api/student/lessons', studentCookie)
      assert.equal(studentGuides.statusCode, 200)
      assert.equal(Object.hasOwn(studentGuides.body.lessons[0], 'answer'), false)
      assert.equal(Object.hasOwn(studentGuides.body.lessons[0], 'workedExample'), false)

      const teacherGuides = await callApi(db, 1, 'GET', '/api/learning/classroom/guides')
      assert.equal(teacherGuides.body.lessons[0].answer, 7)

      const submitted = await callStudentApi(db, 'POST', '/api/student/practice', studentCookie, {
        activityId: 'adding-within-10',
        answers: [6],
      })
      assert.equal(submitted.statusCode, 201)
      assert.deepEqual(submitted.body.explanations[0], {
        expression: '4 + 3',
        selectedAnswer: 6,
        answer: 7,
        correct: false,
        explanation: 'Start at 4 and count three steps: 5, 6, 7.',
      })

      const reset = await callApi(db, 1, 'PUT', `/api/learning/students/${added.body.student.id}/pin`, { pin: '6814' })
      assert.equal(reset.statusCode, 200)
      assert.equal((await callStudentApi(db, 'GET', '/api/student/me', studentCookie)).statusCode, 401)
      assert.equal((await callStudentLogin(db, { joinCode, name: 'Sam Lee', pin: '5482' })).statusCode, 401)
      const relogin = await callStudentLogin(db, { joinCode, name: 'Sam Lee', pin: '6814' })
      assert.equal(relogin.statusCode, 200)
      const reloginCookie = relogin.headers['Set-Cookie'].split(';')[0]

      const loggedOut = await callStudentApi(db, 'POST', '/api/student/logout', reloginCookie)
      assert.equal(loggedOut.statusCode, 200)
      const expiredSession = await callStudentApi(db, 'GET', '/api/student/me', reloginCookie)
      assert.equal(expiredSession.statusCode, 401)
    } finally {
      database.close()
    }
  })

  it('awards the Number Explorer badge once after five practice sessions', async () => {
    const { database, db } = await createHarness()
    try {
      const added = await callApi(db, 1, 'POST', '/api/learning/students', { name: 'Leo Chen', pin: '3927' })
      const studentId = added.body.student.id
      for (let session = 0; session < 6; session += 1) {
        const result = await callApi(db, 1, 'POST', '/api/learning/practice-sessions', {
          studentId,
          activityId: 'quick-practice',
          answers: [7, 4, 8, 4],
        })
        assert.equal(result.statusCode, 201)
      }
      const progress = await callApi(db, 1, 'GET', `/api/learning/progress?studentId=${studentId}`)
      assert.deepEqual(progress.body.badges.map(({ id }) => id), ['number-explorer'])

      const notifications = await callApi(db, 1, 'GET', '/api/learning/notifications')
      assert.equal(notifications.body.notifications.filter(({ type }) => type === 'badge-earned').length, 1)
    } finally {
      database.close()
    }
  })
})
