import { createServer } from 'vite'
import { startApiServer } from '../server/index.mjs'

const apiUrl = 'http://127.0.0.1:3001'
let apiServer
let vite

try {
  try {
    apiServer = await startApiServer()
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error

    let response
    try {
      response = await fetch(`${apiUrl}/api/me`, {
        signal: AbortSignal.timeout(2_000),
      })
    } catch (probeError) {
      throw new Error(
        `Port 3001 is already in use, but the existing service is not a reachable AralLink API. Stop that service or set up the API port before restarting.`,
        { cause: probeError },
      )
    }

    let result
    try {
      result = await response.json()
    } catch (probeError) {
      throw new Error(
        `Port 3001 is already in use by a service that did not return an AralLink API response.`,
        { cause: probeError },
      )
    }
    if (!response.ok || !result || !Object.hasOwn(result, 'user')) {
      throw new Error(
        `Port 3001 is already in use by a service that did not return an AralLink API response.`,
      )
    }
    console.log(`Reusing the existing AralLink API at ${apiUrl}`)
  }

  vite = await createServer()
  await vite.listen()
  vite.printUrls()
} catch (error) {
  if (apiServer) await new Promise((resolve) => apiServer.close(resolve))
  throw error
}

let closing = false
const closeServers = async () => {
  if (closing) return
  closing = true
  const closeOperations = [vite.close()]
  if (apiServer) {
    closeOperations.push(new Promise((resolve, reject) => {
      apiServer.close((error) => error ? reject(error) : resolve())
    }))
  }
  await Promise.all(closeOperations)
}

process.once('SIGINT', () => {
  void closeServers().catch((error) => {
    console.error('Failed to stop development servers cleanly:', error)
    process.exitCode = 1
  })
})
process.once('SIGTERM', () => {
  void closeServers().catch((error) => {
    console.error('Failed to stop development servers cleanly:', error)
    process.exitCode = 1
  })
})
