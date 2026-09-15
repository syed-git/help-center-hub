import { useState, type FormEvent } from 'react'
import { useHub } from '../lib/useHub'
import type { Session } from '../lib/types'
import { initials } from '../lib/format'
import { ChatWidget } from './ChatWidget'
import { DEFAULT_LANG, LANGUAGES, type Lang } from './i18n'
import './swift.css'

export default function SwiftApp() {
  const hub = useHub('user')
  if (hub.resuming) return <div className="sp-loading">Loading Swift Payments...</div>
  if (!hub.session) return <SwiftLogin hub={hub} />
  return <SwiftDashboard hub={hub} session={hub.session} />
}

function SwiftLogin({ hub }: { hub: ReturnType<typeof useHub> }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setLocalError('Please enter both your user ID and password.')
      return
    }
    setLocalError(null)
    hub.login(username, password)
  }

  return (
    <div className="sp-login">
      <div className="sp-login-card">
        <div className="sp-logo">
          <span className="sp-logo-mark">S</span> Swift Payments
        </div>
        <h1>Sign in to Online Banking</h1>
        <form onSubmit={submit} noValidate>
          <label>
            User ID
            <input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label>
            Password
            <input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {(localError || hub.loginError) && (
            <div className="sp-error" role="alert" data-testid="login-error">
              {localError ?? hub.loginError}
            </div>
          )}
          {hub.status !== 'open' && <div className="sp-warn">Connecting to Swift Payments...</div>}
          <button type="submit" className="sp-btn sp-btn-primary" data-testid="login-submit" disabled={hub.loggingIn || hub.status !== 'open'}>
            {hub.loggingIn ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="sp-hint">
          <strong>Demo customers</strong>
          <div>
            <code>user1</code> / <code>Swift@123</code> (Peter Parker)
          </div>
          <div>
            <code>user2</code> / <code>Swift@123</code> (Wanda Maximoff)
          </div>
        </div>
      </div>
    </div>
  )
}

const ACCOUNTS = [
  { name: 'Everyday Checking', number: '**** 4821', balance: 12480.35, currency: 'USD' },
  { name: 'Premier Savings', number: '**** 9034', balance: 58210.0, currency: 'USD' },
  { name: 'Swift Rewards Credit Card', number: '**** 7712', balance: -1342.18, currency: 'USD' },
]

const TRANSACTIONS = [
  { date: 'Sep 14, 2026', desc: 'Payroll - Stark Industries', amount: 6250.0 },
  { date: 'Sep 13, 2026', desc: 'Wire transfer - SP2026091401', amount: -1500.0 },
  { date: 'Sep 12, 2026', desc: 'Utility bill - Queens Power', amount: -184.22 },
  { date: 'Sep 11, 2026', desc: 'Grocery - Delmar Deli', amount: -62.5 },
]

const money = (n: number, ccy: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy }).format(n)

function SwiftDashboard({ hub, session }: { hub: ReturnType<typeof useHub>; session: Session }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatLaunched, setChatLaunched] = useState(false)
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  const [page, setPage] = useState('Accounts')
  const nav = ['Accounts', 'Payments', 'Reports', 'Cards', 'Services', 'Help Center']
  const openChat = () => {
    setChatLaunched(true)
    setChatOpen(true)
  }

  return (
    <div className="sp-app">
      <header className="sp-header">
        <div className="sp-logo">
          <span className="sp-logo-mark">S</span> Swift Payments
        </div>
        <nav className="sp-nav">
          {nav.map((n) => (
            <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>
              {n}
            </button>
          ))}
        </nav>
        <div className="sp-user">
          <span className="sp-avatar">{initials(session.name)}</span>
          <span className="sp-user-name" data-testid="user-name">{session.name}</span>
          <button className="sp-btn sp-btn-ghost" data-testid="logout" onClick={hub.logout}>
            Log out
          </button>
        </div>
      </header>

      {hub.status !== 'open' && <div className="sp-offline">Connection lost. Reconnecting...</div>}

      <main className="sp-main">
        <section className="sp-welcome">
          <div>
            <h1>Welcome back, {session.firstName ?? session.name}</h1>
            <p>Last login: today at 07:52 AM from Chrome on Windows · Customer ID {session.customerId}</p>
          </div>
          <div className="sp-chat-launch">
            <label className="sp-lang" title={chatLaunched ? 'Language can only be changed before launching the chatbot' : undefined}>
              <span>Chat language</span>
              <select
                data-testid="chat-language"
                value={lang}
                disabled={chatLaunched}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} ({l.label})
                  </option>
                ))}
              </select>
              {chatLaunched && <small data-testid="chat-language-locked">Locked while the chat is active</small>}
            </label>
            <button className="sp-btn sp-btn-primary" data-testid="open-chat" onClick={openChat}>
              Chat with Us
            </button>
          </div>
        </section>

        <section className="sp-cards">
          {ACCOUNTS.map((a) => (
            <div className="sp-card" key={a.number}>
              <div className="sp-card-title">{a.name}</div>
              <div className="sp-card-number">{a.number}</div>
              <div className={`sp-card-balance ${a.balance < 0 ? 'neg' : ''}`}>{money(a.balance, a.currency)}</div>
              <div className="sp-card-foot">Available balance</div>
            </div>
          ))}
        </section>

        <section className="sp-grid">
          <div className="sp-panel">
            <h2>Quick actions</h2>
            <div className="sp-actions">
              {['Make a Payment', 'Transfer Funds', 'Pay Bills', 'Download Statement', 'Manage Cards', 'Report a Claim', 'Manage Users', 'Mobile Token'].map((a) => (
                <button key={a} className="sp-action" onClick={() => setPage(a)}>
                  {a}
                </button>
              ))}
              <button className="sp-action sp-action-chat" data-testid="open-chat-tile" onClick={openChat}>
                Chat with Us
              </button>
            </div>
          </div>
          <div className="sp-panel">
            <h2>Recent transactions</h2>
            <table className="sp-table">
              <tbody>
                {TRANSACTIONS.map((t) => (
                  <tr key={t.desc}>
                    <td className="muted">{t.date}</td>
                    <td>{t.desc}</td>
                    <td className={`amt ${t.amount < 0 ? 'neg' : 'pos'}`}>{money(t.amount, 'USD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {page !== 'Accounts' && (
          <section className="sp-panel sp-placeholder">
            <h2>{page}</h2>
            <p>This section is a placeholder in the demo. Use <strong>Chat with Us</strong> for help with {page.toLowerCase()}.</p>
          </section>
        )}
      </main>

      <footer className="sp-footer">
        <a href="#/help">Help Center</a>
        <a href="#/privacy">Privacy</a>
        <a href="#/terms">Terms &amp; Conditions</a>
        <span className="sp-release">R: 1.0.0_swiftpay-main_EPF</span>
      </footer>

      {!chatOpen && (
        <button className="sp-need-help" data-testid="need-help" onClick={openChat}>
          <span className="sp-need-help-icon">&#128172;</span>
          <span className="sp-need-help-text">Need help?</span>
        </button>
      )}
      <ChatWidget hub={hub} session={session} lang={lang} open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
