import { useState, type FormEvent } from 'react'
import { useHub } from '../lib/useHub'
import { AgentDesktop } from './AgentDesktop'
import './avengers.css'

export default function AvengersApp() {
  const hub = useHub('agent')
  if (hub.resuming) return <div className="ah-loading">Loading Avengers Hub...</div>
  if (!hub.session) return <AgentLogin hub={hub} />
  return <AgentDesktop hub={hub} session={hub.session} />
}

function AgentLogin({ hub }: { hub: ReturnType<typeof useHub> }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setLocalError('Please enter both your agent ID and password.')
      return
    }
    setLocalError(null)
    hub.login(username, password)
  }

  return (
    <div className="ah-login">
      <div className="ah-login-card">
        <div className="ah-logo">
          <span className="ah-logo-mark">A</span> Avengers Hub
        </div>
        <p className="ah-login-sub">Agent Desktop · Web Messaging</p>
        <form onSubmit={submit} noValidate>
          <label>
            Agent ID
            <input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label>
            Password
            <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {(localError || hub.loginError) && (
            <div className="ah-error" role="alert" data-testid="login-error">
              {localError ?? hub.loginError}
            </div>
          )}
          {hub.status !== 'open' && <div className="ah-muted">Connecting to Avengers Hub...</div>}
          <button type="submit" className="ah-btn ah-btn-primary" data-testid="login-submit" disabled={hub.loggingIn || hub.status !== 'open'}>
            {hub.loggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="ah-hint">
          <strong>Demo agents</strong> (password <code>Avengers@123</code>)
          <div>
            <code>agent1</code> Steve Rogers · <code>agent2</code> Natasha Romanoff · <code>agent3</code> Bruce Banner
          </div>
        </div>
      </div>
    </div>
  )
}
