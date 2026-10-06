import { createClient } from '@libsql/client'
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const sessionCookie = 'aral_session'
const sessionDuration = 7 * 24 * 60 * 60
const maximumBodySize = 10 * 1024
const maximumAttempts = 10
const attemptWindow = 15 * 60 * 1000
const attemptsByAddress = new Map()
let client
let schemaReady

const getClient = () => {
  if (client) return client
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) {
    const error = new Error(
      'Authentication is not configured for this Vercel deployment. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Project Settings → Environment Variables, then redeploy.',
    )
    error.status = 503
    throw error
  }
  client = createClient({ url, authToken })
  return client
}

const ensureSchema = async (db) => {
  if (!schemaReady) {
    schemaReady = db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash BLOB NOT NULL,
        password_salt BLOB NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)',
    ], 'write').catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  await schemaReady
}

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  response.end(JSON.stringify(body))
}

const readJson = async (request) => {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maximumBodySize) {
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

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

const cookieHeader = (token, maxAge = sessionDuration) => {
  const secure = process.env.COOKIE_SECURE === 'false' ? '' : '; Secure'
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

const safeUser = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
})

const getAuthenticatedUser = async (request, db) => {
  const token = getCookie(request, sessionCookie)
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null
  const result = await db.execute({
    sql: `SELECT users.id, users.name, users.email
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    args: [hashToken(token), Date.now()],
  })
  return result.rows[0] ? safeUser(result.rows[0]) : null
}

const createSession = async (userId, response, db) => {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + sessionDuration * 1000
  await db.batch([
    { sql: 'DELETE FROM sessions WHERE expires_at <= ?', args: [Date.now()] },
    {
      sql: 'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      args: [hashToken(token), userId, expiresAt],
    },
  ], 'write')
  response.setHeader('Set-Cookie', cookieHeader(token))
}

const validateEmail = (email) =>
  typeof email === 'string' &&
  email.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const validateName = (name) =>
  typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 80

const validatePassword = (password) =>
  typeof password === 'string' && password.length >= 8 && password.length <= 128

const checkRateLimit = (request) => {
  const address = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
    ?? request.socket.remoteAddress
    ?? 'unknown'
  const now = Date.now()
  const recent = (attemptsByAddress.get(address) ?? []).filter(
    (time) => now - time < attemptWindow,
  )
  if (recent.length >= maximumAttempts) return false
  recent.push(now)
  attemptsByAddress.set(address, recent)
  return true
}

const handleApi = async (request, response, db, pathname) => {
  if (request.method === 'GET' && pathname === '/api/me') {
    const user = await getAuthenticatedUser(request, db)
    return json(response, 200, { user })
  }

  if (request.method === 'PATCH' && pathname === '/api/me') {
    const user = await getAuthenticatedUser(request, db)
    if (!user) return json(response, 401, { error: 'Sign in to update your profile.' })
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return json(response, 415, { error: 'Please submit the form using JSON.' })
    }
    const input = await readJson(request)
    if (!validateName(input.name)) {
      return json(response, 400, { error: 'Enter your name (up to 80 characters).' })
    }
    await db.execute({
      sql: 'UPDATE users SET name = ? WHERE id = ?',
      args: [input.name.trim(), user.id],
    })
    return json(response, 200, {
      user: safeUser({
        ...user,
        name: input.name.trim(),
      }),
    })
  }

  if (request.method === 'POST' && pathname === '/api/logout') {
    const token = getCookie(request, sessionCookie)
    if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      await db.execute({
        sql: 'DELETE FROM sessions WHERE token_hash = ?',
        args: [hashToken(token)],
      })
    }
    return json(
      response,
      200,
      { ok: true },
      { 'Set-Cookie': cookieHeader('', 0) },
    )
  }

  if (request.method === 'POST' && (pathname === '/api/login' || pathname === '/api/register')) {
    if (!checkRateLimit(request)) {
      return json(response, 429, { error: 'Too many attempts. Please try again later.' })
    }
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return json(response, 415, { error: 'Please submit the form using JSON.' })
    }
    const input = await readJson(request)
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    const password = input.password

    if (!validateEmail(email)) {
      return json(response, 400, { error: 'Enter a valid email address.' })
    }
    if (!validatePassword(password)) {
      return json(response, 400, { error: 'Password must be between 8 and 128 characters.' })
    }

    if (pathname === '/api/register') {
      if (!validateName(input.name)) {
        return json(response, 400, { error: 'Enter your name (up to 80 characters).' })
      }
      const salt = randomBytes(16)
      const passwordHash = await scrypt(password, salt, 64)
      try {
        await db.execute({
          sql: `INSERT INTO users (name, email, password_hash, password_salt, created_at)
            VALUES (?, ?, ?, ?, ?)`,
          args: [input.name.trim(), email, passwordHash, salt, Date.now()],
        })
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT') {
          return json(response, 409, { error: 'An account with this email already exists.' })
        }
        throw error
      }
      const created = await db.execute({
        sql: 'SELECT id, name, email FROM users WHERE email = ?',
        args: [email],
      })
      const user = safeUser(created.rows[0])
      await createSession(user.id, response, db)
      return json(response, 201, { user })
    }

    const result = await db.execute({
      sql: 'SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ?',
      args: [email],
    })
    const user = result.rows[0]
    const salt = user?.password_salt ? Buffer.from(user.password_salt) : Buffer.alloc(16)
    const expected = user?.password_hash ? Buffer.from(user.password_hash) : Buffer.alloc(64)
    const actual = await scrypt(password, salt, 64)
    if (!user || !timingSafeEqual(expected, actual)) {
      return json(response, 401, { error: 'Email or password is incorrect.' })
    }
    await createSession(Number(user.id), response, db)
    return json(response, 200, { user: safeUser(user) })
  }

  return json(response, 404, { error: 'Not found.' })
}

export default async function handler(request, response) {
  try {
    const url = new URL(request.url ?? '/', `https://${request.headers.host ?? 'localhost'}`)
    if (!url.pathname.startsWith('/api/')) {
      return json(response, 404, { error: 'Not found.' })
    }
    const db = getClient()
    await ensureSchema(db)
    await handleApi(request, response, db, url.pathname)
  } catch (error) {
    console.error('Vercel auth request failed:', error)
    if (!response.headersSent) {
      json(response, error.status ?? 500, {
        error: error.status
          ? error.message
          : 'The sign-in service could not complete the request. Check the Vercel function logs and database configuration.',
      })
    } else {
      response.destroy(error)
    }
  }
}
