import type { ConnectionStatus, Role, ServerEvent } from './types'

type Listener = (event: ServerEvent) => void
type StatusListener = (status: ConnectionStatus) => void

const wsUrl = () => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

/**
 * Thin auto-reconnecting WebSocket wrapper. On every (re)connect it resumes the
 * sessionStorage-backed session for the given role so a page refresh keeps you logged in.
 */
export class HubSocket {
  private ws: WebSocket | null = null
  private listeners = new Set<Listener>()
  private statusListeners = new Set<StatusListener>()
  private retry = 0
  private closedByUser = false
  private queue: string[] = []
  private role: Role
  status: ConnectionStatus = 'connecting'

  constructor(role: Role) {
    this.role = role
  }

  private get tokenKey() {
    return `hch.${this.role}.token`
  }

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey)
  }

  set token(value: string | null) {
    if (value) sessionStorage.setItem(this.tokenKey, value)
    else sessionStorage.removeItem(this.tokenKey)
  }

  connect() {
    this.closedByUser = false
    this.open()
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.statusListeners.forEach((l) => l(status))
  }

  private open() {
    const ws = new WebSocket(wsUrl())
    this.ws = ws
    ws.onopen = () => {
      this.retry = 0
      this.setStatus('open')
      if (this.token) ws.send(JSON.stringify({ type: 'resume', token: this.token }))
      for (const raw of this.queue.splice(0)) ws.send(raw)
    }
    ws.onmessage = (e) => {
      let event: ServerEvent
      try {
        event = JSON.parse(e.data as string) as ServerEvent
      } catch {
        return
      }
      if (event.type === 'session') this.token = event.session.token
      if (event.type === 'resume_error') this.token = null
      this.listeners.forEach((l) => l(event))
    }
    ws.onclose = () => {
      if (this.closedByUser) {
        this.setStatus('closed')
        return
      }
      this.setStatus('reconnecting')
      const delay = Math.min(1000 * 2 ** this.retry, 8000)
      this.retry += 1
      setTimeout(() => this.open(), delay)
    }
    ws.onerror = () => ws.close()
  }

  send(payload: Record<string, unknown>) {
    const raw = JSON.stringify(payload)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(raw)
    else this.queue.push(raw)
  }

  logout() {
    this.send({ type: 'logout' })
    this.token = null
  }

  close() {
    this.closedByUser = true
    this.ws?.close()
  }

  on(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }
}
