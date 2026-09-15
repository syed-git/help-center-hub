import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { WebSocketServer } from 'ws'
import { Hub, OFFER_TIMEOUT_MS, DISCONNECT_GRACE_MS } from './hub.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3000)
const clientDist = path.join(__dirname, '..', 'client', 'dist')

const app = express()
const hub = new Hub()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, agentsOnline: hub.agents.size, conversations: hub.conversations.size, uptime: process.uptime() })
})

app.get('/api/config', (_req, res) => {
  res.json({ offerTimeoutMs: OFFER_TIMEOUT_MS, disconnectGraceMs: DISCONNECT_GRACE_MS })
})

app.use(express.static(clientDist))
app.get(/^(?!\/api|\/ws).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run `npm run build` first.')
  })
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  socket.isAlive = true
  socket.on('pong', () => {
    socket.isAlive = true
  })
  socket.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      hub.send(socket, { type: 'error', message: 'Malformed message.' })
      return
    }
    if (!msg || typeof msg.type !== 'string') return
    try {
      hub.handle(socket, msg)
    } catch (err) {
      console.error('hub error', err)
      hub.send(socket, { type: 'error', message: 'Something went wrong on the server.' })
    }
  })
  socket.on('close', () => hub.socketClosed(socket))
  socket.on('error', () => hub.socketClosed(socket))
})

// Detect half-open connections (e.g. laptop lid closed) so agents drop out of the roster.
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!socket.isAlive) {
      socket.terminate()
      continue
    }
    socket.isAlive = false
    socket.ping()
  }
}, 15_000)
wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, () => {
  console.log(`Help Center Hub listening on http://localhost:${PORT}`)
  console.log(`  Swift Payments (customers): http://localhost:${PORT}/swift`)
  console.log(`  Avengers Hub (agents):      http://localhost:${PORT}/avengers`)
})
