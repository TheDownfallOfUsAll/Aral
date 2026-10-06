import { createServer } from 'vite'
import { startApiServer } from '../server/index.mjs'

const apiServer = await startApiServer()
const vite = await createServer()

try {
  await vite.listen()
  vite.printUrls()
} catch (error) {
  await apiServer.close()
  throw error
}

let closing = false
const closeServers = async () => {
  if (closing) return
  closing = true
  await Promise.all([vite.close(), new Promise((resolve, reject) => {
    apiServer.close((error) => error ? reject(error) : resolve())
  })])
}

process.once('SIGINT', () => { void closeServers() })
process.once('SIGTERM', () => { void closeServers() })
