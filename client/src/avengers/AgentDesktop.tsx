import { Icon } from './icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hub } from '../lib/useHub'
import type { AgentInfo, Conversation, HubState, Offer, Session } from '../lib/types'
import { formatTime, initials } from '../lib/format'
import { OfferPopup } from './OfferPopup'
import { CaseView } from './CaseView'
import { TransferModal } from './TransferModal'

interface CaseEntry {
  conv: Conversation
  closedReason: string | null
  unread: number
}

interface Toast {
  id: number
  text: string
  tone: 'info' | 'error' | 'success'
}

export function AgentDesktop({ hub, session }: { hub: Hub; session: Session }) {
  const [hubState, setHubState] = useState<HubState | null>(null)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [cases, setCases] = useState<Record<string, CaseEntry>>({})
  const [tab, setTab] = useState<string>('dashboard')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [transferFor, setTransferFor] = useState<string | null>(null)
  const [customerTyping, setCustomerTyping] = useState<Record<string, boolean>>({})
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])
  const typingTimers = useRef<Record<string, number>>({})

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  useEffect(
    () =>
      hub.subscribe((event) => {
        switch (event.type) {
          case 'hub_state':
            setHubState(event.state)
            break
          case 'offer':
            setOffer(event.offer)
            break
          case 'offer_cancelled':
            setOffer((o) => (o && o.convId === event.convId ? null : o))
            if (event.reason === 'timeout') toast('Incoming request timed out and was routed to another agent.', 'error')
            else if (event.reason === 'cancelled') toast('The customer left before the request was answered.', 'info')
            break
          case 'conversation': {
            const c = event.conversation
            setCases((prev) => {
              const existing = prev[c.id]
              const wasNew = !existing
              const newMessages = existing ? c.messages.length - existing.conv.messages.length : 0
              const isViewing = tabRef.current === c.id
              const unread = isViewing || wasNew ? 0 : (existing?.unread ?? 0) + Math.max(0, newMessages)
              return { ...prev, [c.id]: { conv: c, closedReason: c.status === 'ended' ? existing?.closedReason ?? 'Conversation ended' : null, unread } }
            })
            if (c.status === 'active' && c.agentUsername === session.username) {
              setOffer((o) => (o && o.convId === c.id ? null : o))
              setTab((current) => (current === 'dashboard' || !current ? c.id : current))
            }
            if (c.status === 'ended') setCustomerTyping((t) => ({ ...t, [c.id]: false }))
            break
          }
          case 'conversation_closed':
            setCases((prev) => ({ ...prev, [event.convId]: { conv: event.conversation, closedReason: event.message, unread: 0 } }))
            setTransferFor((t) => (t === event.convId ? null : t))
            break
          case 'transfer_result':
            toast(event.message, event.ok ? 'success' : 'error')
            if (event.ok) setTransferFor(null)
            break
          case 'typing':
            if (event.from !== 'user') break
            setCustomerTyping((t) => ({ ...t, [event.convId]: event.isTyping }))
            if (typingTimers.current[event.convId]) window.clearTimeout(typingTimers.current[event.convId])
            if (event.isTyping) {
              typingTimers.current[event.convId] = window.setTimeout(() => setCustomerTyping((t) => ({ ...t, [event.convId]: false })), 4000)
            }
            break
          case 'error':
            toast(event.message, 'error')
            break
          default:
            break
        }
      }),
    [hub, session.username, toast],
  )

  const me: AgentInfo | undefined = hubState?.agents.find((a) => a.username === session.username)
  const myStatus = me?.status ?? 'away'
  const toggleReadiness = () => {
    hub.send({ type: 'set_status', status: myStatus === 'away' ? 'available' : 'away' })
  }

  const openCases = useMemo(() => Object.values(cases).sort((a, b) => a.conv.createdAt.localeCompare(b.conv.createdAt)), [cases])
  const current = tab !== 'dashboard' ? cases[tab] : undefined

  const closeTab = (id: string) => {
    setCases((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (tab === id) setTab('dashboard')
  }

  const selectTab = (id: string) => {
    setTab(id)
    setCases((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], unread: 0 } } : prev))
  }

  const queueCount = hubState?.queue.length ?? 0

  return (
    <div className="ah">
      <header className="ah-topbar">
        <div className="ah-topbar-left">
          <span className="ah-brand">
            <span className="ah-logo-mark">A</span> Avengers Hub
          </span>
          <button className="ah-link-btn">+ New</button>
        </div>
        <div className="ah-search">
          <select aria-label="Search scope" defaultValue="Cases">
            <option>Cases</option>
            <option>Customers</option>
            <option>Agents</option>
          </select>
          <input placeholder="Search..." aria-label="Search" />
          <button aria-label="Search"><Icon name="search" size={14} /></button>
        </div>
        <div className="ah-topbar-right">
          <span className="ah-env">UAT1</span>
          <span className="ah-app">AVENGERS HUB</span>
          <span className="ah-version">( V 01.00.00 )</span>
          <span className="ah-icon ah-icon-bell" title={`${queueCount} waiting in queue`}>
            <Icon name="bell" />
            {queueCount > 0 && <span className="ah-badge" data-testid="queue-badge">{queueCount}</span>}
          </span>
          <span className="ah-icon ah-icon-mail" title="Mail"><Icon name="mail" /></span>
          <span className="ah-icon ah-icon-chat" title="Web Messaging"><Icon name="chat" /></span>
          <span className="ah-icon ah-icon-phone" title="Phone"><Icon name="phone" /></span>
          <button
            className={`ah-status ah-status-${myStatus}`}
            data-testid="toggle-status"
            onClick={toggleReadiness}
            disabled={myStatus === 'busy' || hub.status !== 'open'}
            title={myStatus === 'busy' ? 'You are in an active conversation' : 'Toggle availability'}
          >
            <span className="ah-status-dot" />
            {statusLabel(myStatus)}
          </button>
          <span className="ah-avatar" title={session.name} data-testid="agent-name">
            {initials(session.name)}
          </span>
          <button className="ah-link-btn" data-testid="logout" onClick={hub.logout}>
            Log out
          </button>
        </div>
      </header>

      {hub.status !== 'open' && <div className="ah-offline">Connection lost. Reconnecting to Avengers Hub...</div>}

      <div className="ah-tabs" role="tablist">
        <button role="tab" className={`ah-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => selectTab('dashboard')} data-testid="tab-dashboard">
          <Icon name="home" size={13} /> Dashboard
        </button>
        {openCases.map(({ conv, closedReason, unread }) => (
          <div key={conv.id} className={`ah-tab ${tab === conv.id ? 'active' : ''} ${closedReason ? 'closed' : ''}`} data-testid="tab-case">
            <button role="tab" onClick={() => selectTab(conv.id)}>
              <Icon name="chat" size={13} /> Chat : {conv.caseNumber ?? conv.userName}
              {unread > 0 && <span className="ah-badge">{unread}</span>}
            </button>
            <button className="ah-tab-close" aria-label="Close tab" onClick={() => closeTab(conv.id)} disabled={!closedReason} title={closedReason ? 'Close tab' : 'End the conversation before closing the tab'}>
              &times;
            </button>
          </div>
        ))}
      </div>

      <main className="ah-main">
        {current ? (
          <CaseView
            key={current.conv.id}
            hub={hub}
            session={session}
            conv={current.conv}
            closedReason={current.closedReason}
            customerTyping={Boolean(customerTyping[current.conv.id])}
            onTransfer={() => setTransferFor(current.conv.id)}
            onClose={() => closeTab(current.conv.id)}
          />
        ) : (
          <Dashboard hubState={hubState} session={session} myStatus={myStatus} onToggle={toggleReadiness} onOpenCase={selectTab} cases={openCases} />
        )}
      </main>

      {offer && <OfferPopup offer={offer} onAccept={() => hub.send({ type: 'accept_offer', convId: offer.convId })} onDecline={() => hub.send({ type: 'decline_offer', convId: offer.convId })} />}

      {transferFor && cases[transferFor] && (
        <TransferModal
          conv={cases[transferFor].conv}
          agents={(hubState?.agents ?? []).filter((a) => a.username !== session.username)}
          onTransfer={(toAgent) => hub.send({ type: 'transfer', convId: transferFor, toAgent })}
          onClose={() => setTransferFor(null)}
        />
      )}

      <div className="ah-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`ah-toast ah-toast-${t.tone}`} role="status">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function statusLabel(status: AgentInfo['status']) {
  switch (status) {
    case 'available':
      return 'Available'
    case 'busy':
      return 'Busy'
    case 'away':
      return 'Away'
    case 'reconnecting':
      return 'Reconnecting'
    default:
      return 'Offline'
  }
}

function Dashboard({
  hubState,
  session,
  myStatus,
  onToggle,
  onOpenCase,
  cases,
}: {
  hubState: HubState | null
  session: Session
  myStatus: AgentInfo['status']
  onToggle: () => void
  onOpenCase: (id: string) => void
  cases: CaseEntry[]
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const waiting = (iso: string) => {
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
  }

  return (
    <div className="ah-dashboard">
      <section className="ah-card ah-card-status">
        <div>
          <div className="ah-card-title">Welcome, {session.name}</div>
          <div className="ah-muted">
            You are currently <strong data-testid="my-status">{statusLabel(myStatus)}</strong>.{' '}
            {myStatus === 'away' && 'Go available to start receiving Web Messaging conversations.'}
            {myStatus === 'available' && 'Incoming conversations will pop up at the top right.'}
            {myStatus === 'busy' && 'You will receive new requests once your current conversation ends.'}
          </div>
        </div>
        <button className={`ah-btn ${myStatus === 'away' ? 'ah-btn-primary' : ''}`} data-testid="dashboard-toggle-status" onClick={onToggle} disabled={myStatus === 'busy'}>
          {myStatus === 'away' ? 'Go Available' : myStatus === 'available' ? 'Go Away' : 'In conversation'}
        </button>
      </section>

      <div className="ah-stats">
        <div className="ah-stat">
          <div className="ah-stat-value" data-testid="stat-queue">{hubState?.queue.length ?? 0}</div>
          <div className="ah-stat-label">Waiting in queue</div>
        </div>
        <div className="ah-stat">
          <div className="ah-stat-value">{hubState?.activeCount ?? 0}</div>
          <div className="ah-stat-label">Active conversations</div>
        </div>
        <div className="ah-stat">
          <div className="ah-stat-value">{hubState?.agents.filter((a) => a.status === 'available').length ?? 0}</div>
          <div className="ah-stat-label">Agents available</div>
        </div>
        <div className="ah-stat">
          <div className="ah-stat-value">{hubState?.endedCount ?? 0}</div>
          <div className="ah-stat-label">Resolved today</div>
        </div>
      </div>

      <div className="ah-grid">
        <section className="ah-card">
          <div className="ah-card-head">
            <span className="ah-card-title">Web Messaging queue</span>
            <select aria-label="Filter" defaultValue="My team">
              <option>My team</option>
              <option>All queues</option>
            </select>
          </div>
          <table className="ah-table" data-testid="queue-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Waiting</th>
                <th>Status</th>
                <th>Offered to</th>
              </tr>
            </thead>
            <tbody>
              {(hubState?.queue ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="ah-empty">
                    <div className="ah-empty-icon"><Icon name="tray" size={32} /></div>No items
                  </td>
                </tr>
              )}
              {(hubState?.queue ?? []).map((q) => (
                <tr key={q.id}>
                  <td>
                    {q.userName} {q.priority && <span className="ah-pill ah-pill-red">Priority</span>}
                  </td>
                  <td>{waiting(q.queuedAt)}</td>
                  <td>{q.status === 'offering' ? 'Offered' : 'Queued'}</td>
                  <td>{q.offeredTo ? hubState?.agents.find((a) => a.username === q.offeredTo)?.name ?? q.offeredTo : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ah-card">
          <div className="ah-card-head">
            <span className="ah-card-title">Team availability</span>
          </div>
          <table className="ah-table" data-testid="agents-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Status</th>
                <th>Current case</th>
              </tr>
            </thead>
            <tbody>
              {(hubState?.agents ?? []).map((a) => (
                <tr key={a.username} data-testid={`agent-row-${a.username}`}>
                  <td>
                    {a.name} {a.username === session.username && <span className="ah-muted">(you)</span>}
                  </td>
                  <td>
                    <span className={`ah-pill ah-pill-${a.status}`}>{statusLabel(a.status)}</span>
                  </td>
                  <td>{a.activeConvId ? 'In conversation' : a.pendingOfferConvId ? 'Offer pending' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="ah-card">
        <div className="ah-card-head">
          <span className="ah-card-title">My work</span>
          <select aria-label="View" defaultValue="Default view">
            <option>Default view</option>
          </select>
        </div>
        <table className="ah-table">
          <thead>
            <tr>
              <th>Case</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="ah-empty">
                  <div className="ah-empty-icon"><Icon name="tray" size={32} /></div>No items
                </td>
              </tr>
            )}
            {cases.map(({ conv, closedReason }) => (
              <tr key={conv.id}>
                <td>{conv.caseNumber ?? '-'}</td>
                <td>{conv.userName}</td>
                <td>{closedReason ? closedReason : conv.status === 'transferring' ? 'Transferring' : 'Open'}</td>
                <td>{formatTime(conv.createdAt)}</td>
                <td>
                  <button className="ah-link-btn ah-link-blue" onClick={() => onOpenCase(conv.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
