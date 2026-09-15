import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HubSocket } from './socket'
import type { ConnectionStatus, Role, ServerEvent, Session } from './types'

/**
 * Owns one HubSocket per mounted app and exposes login state plus an event subscription.
 */
export function useHub(role: Role) {
  const socket = useMemo(() => new HubSocket(role), [role])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [session, setSession] = useState<Session | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [resuming, setResuming] = useState(Boolean(socket.token))
  const handlers = useRef(new Set<(e: ServerEvent) => void>())

  useEffect(() => {
    const offStatus = socket.onStatus(setStatus)
    const off = socket.on((event) => {
      if (event.type === 'session') {
        setSession(event.session)
        setLoginError(null)
        setLoggingIn(false)
        setResuming(false)
      } else if (event.type === 'login_error') {
        setLoginError(event.message)
        setLoggingIn(false)
      } else if (event.type === 'resume_error') {
        setSession(null)
        setResuming(false)
      }
      handlers.current.forEach((h) => h(event))
    })
    socket.connect()
    return () => {
      off()
      offStatus()
      socket.close()
    }
  }, [socket])

  const login = useCallback(
    (username: string, password: string) => {
      setLoggingIn(true)
      setLoginError(null)
      socket.send({ type: 'login', role, username, password })
    },
    [socket, role],
  )

  const logout = useCallback(() => {
    socket.logout()
    setSession(null)
  }, [socket])

  const send = useCallback((payload: Record<string, unknown>) => socket.send(payload), [socket])

  const subscribe = useCallback((handler: (e: ServerEvent) => void) => {
    handlers.current.add(handler)
    return () => {
      handlers.current.delete(handler)
    }
  }, [])

  return { status, session, login, logout, loginError, loggingIn, resuming, send, subscribe }
}

export type Hub = ReturnType<typeof useHub>
