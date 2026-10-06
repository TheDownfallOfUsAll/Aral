import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { promisify } from 'node:util'
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { createReadStream, mkdirSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('.', import.meta.url))
const databaseDirectory = resolve(directory, '../data')
const databasePath = join(databaseDirectory, 'arallink.sqlite')
const buildDirectory = resolve(directory, '../dist')
const scrypt = promisify(scryptCallback)
const sessionCookie = 'aral_session'
const sessionDuration = 7 * 24 * 60 * 60
const maximumBodySize = 10 * 1024
const maximumAttempts = 10
const attemptWindow = 15 * 60 * 1000
const attemptsByAddress = new Map()
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

mkdirSync(databaseDirectory, { recursive: true })
const database = new DatabaseSync(databasePath)
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash BLOB NOT NULL,
    password_salt BLOB NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
`)

const statements = {
  createUser: database.prepare(
    'INSERT INTO users (name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)',
  ),
  findUserByEmail: database.prepare(
    'SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ?',
  ),
  findUserById: database.prepare(
    'SELECT id, name, email FROM users WHERE id = ?',
  ),
  updateUserName: database.prepare(
    'UPDATE users SET name = ? WHERE id = ?',
  ),
  createSession: database.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
  ),
  findSession: database.prepare(`
    SELECT users.id, users.name, users.email
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `),
  deleteSession: database.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteExpiredSessions: database.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
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
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Expected a JSON object.')
    }
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
    if (separator < 0) continue
    if (item.slice(0, separator).trim() === name) {
      return item.slice(separator + 1).trim()
    }
  }
  return null
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

const cookieHeader = (token, maxAge = sessionDuration) => {
  const secure = process.env.COOKIE_SECURE === 'true'
    ? '; Secure'
    : ''
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

const safeUser = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
})

const createSession = (userId, request, response) => {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + sessionDuration * 1000
  statements.deleteExpiredSessions.run(Date.now())
  statements.createSession.run(hashToken(token), userId, expiresAt)
  response.setHeader('Set-Cookie', cookieHeader(token))
}

const getAuthenticatedUser = (request) => {
  const token = getCookie(request, sessionCookie)
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null
  const user = statements.findSession.get(hashToken(token), Date.now())
  return user ? safeUser(user) : null
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
  const address = request.socket.remoteAddress ?? 'unknown'
  const now = Date.now()
  const recent = (attemptsByAddress.get(address) ?? []).filter(
    (time) => now - time < attemptWindow,
  )
  if (recent.length >= maximumAttempts) return false
  recent.push(now)
  attemptsByAddress.set(address, recent)
  return true
}

const handleApi = async (request, response, url) => {
  if (request.method === 'GET' && url.pathname === '/api/me') {
    const user = getAuthenticatedUser(request)
    return json(response, 200, { user })
  }

  if (request.method === 'PATCH' && url.pathname === '/api/me') {
    const user = getAuthenticatedUser(request)
    if (!user) return json(response, 401, { error: 'Sign in to update your profile.' })
    if (!request.headers['content-type']?.startsWith('application/json')) {
      return json(response, 415, { error: 'Please submit the form using JSON.' })
    }
    const input = await readJson(request)
    if (!validateName(input.name)) {
      return json(response, 400, { error: 'Enter your name (up to 80 characters).' })
    }
    statements.updateUserName.run(input.name.trim(), user.id)
    return json(response, 200, {
      user: safeUser(statements.findUserById.get(user.id)),
    })
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    const token = getCookie(request, sessionCookie)
    if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      statements.deleteSession.run(hashToken(token))
    }
    return json(
      response,
      200,
      { ok: true },
      { 'Set-Cookie': cookieHeader('', 0) },
    )
  }

  if (
    request.method === 'POST' &&
    (url.pathname === '/api/login' || url.pathname === '/api/register')
  ) {
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

    if (url.pathname === '/api/register') {
      if (!validateName(input.name)) {
        return json(response, 400, { error: 'Enter your name (up to 80 characters).' })
      }
      const salt = randomBytes(16)
      const passwordHash = await scrypt(password, salt, 64)
      let result
      try {
        result = statements.createUser.run(
          input.name.trim(),
          email,
          passwordHash,
          salt,
          Date.now(),
        )
      } catch (error) {
        if (error.errcode === 2067) {
          return json(response, 409, { error: 'An account with this email already exists.' })
        }
        throw error
      }
      const id = Number(result.lastInsertRowid)
      const user = safeUser(statements.findUserById.get(id))
      createSession(id, request, response)
      return json(response, 201, { user })
    }

    const user = statements.findUserByEmail.get(email)
    const salt = user?.password_salt ?? Buffer.alloc(16)
    const expected = user?.password_hash ?? Buffer.alloc(64)
    const actual = await scrypt(password, salt, 64)
    if (!user || !timingSafeEqual(expected, actual)) {
      return json(response, 401, { error: 'Email or password is incorrect.' })
    }
    createSession(Number(user.id), request, response)
    return json(response, 200, { user: safeUser(user) })
  }

  return json(response, 404, { error: 'Not found.' })
}

const serveStatic = (request, response, url) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }
  let requested
  try {
    requested = decodeURIComponent(url.pathname)
  } catch {
    response.writeHead(400)
    response.end('Invalid URL path.')
    return
  }
  const relativePath = normalize(requested).replace(/^([/\\]|(\.\.[/\\])+)/, '')
  let filePath = resolve(buildDirectory, relativePath || 'index.html')
  if (!filePath.startsWith(`${buildDirectory}\\`) && filePath !== buildDirectory) {
    response.writeHead(403)
    response.end()
    return
  }
  try {
    const stream = createReadStream(filePath)
    stream.once('open', () => {
      response.writeHead(200, {
        'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      })
      if (request.method === 'HEAD') {
        stream.destroy()
        response.end()
      } else {
        stream.pipe(response)
      }
    })
    stream.once('error', (error) => {
      if (error.code === 'ENOENT') {
        filePath = join(buildDirectory, 'index.html')
        const fallback = createReadStream(filePath)
        fallback.once('open', () => {
          response.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
          })
        })
        fallback
          .on('error', (fallbackError) => {
            console.error('Unable to serve the frontend:', fallbackError)
            if (!response.headersSent) response.writeHead(404)
            response.end('Build the frontend with npm run build first.')
          })
        if (request.method === 'HEAD') {
          fallback.destroy()
          response.end()
        } else {
          fallback.pipe(response)
        }
        return
      }
      console.error('Unable to serve a frontend asset:', error)
      if (!response.headersSent) response.writeHead(500)
      response.end('Unable to serve the frontend.')
    })
  } catch (error) {
    console.error('Unable to serve the frontend:', error)
    response.writeHead(500)
    response.end('Unable to serve the frontend.')
  }
}

export const startApiServer = ({ host = '127.0.0.1', port = Number(process.env.PORT ?? 3001) } = {}) => {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
      if (url.pathname.startsWith('/api/')) {
        await handleApi(request, response, url)
      } else if (process.env.NODE_ENV === 'production') {
        serveStatic(request, response, url)
      } else {
        json(response, 404, { error: 'Not found.' })
      }
    } catch (error) {
      console.error('Request failed:', error)
      if (!response.headersSent) {
        json(response, error.status ?? 500, {
          error: error.status ? error.message : 'The request could not be completed.',
        })
      } else {
        response.destroy(error)
      }
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.once('close', () => database.close())
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      resolve(server)
    })
  })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startApiServer({ host: process.env.HOST ?? '127.0.0.1' })
  console.log(`AralLink API listening at http://${process.env.HOST ?? '127.0.0.1'}:${server.address().port}`)
  const close = () => server.close()
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
}
