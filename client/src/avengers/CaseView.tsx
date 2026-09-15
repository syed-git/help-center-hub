import { Icon } from './icons'
import { languageName } from '../swift/i18n'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Hub } from '../lib/useHub'
import type { ChatMessage, Conversation, Session } from '../lib/types'
import { formatDateTime, formatTimeWithSeconds } from '../lib/format'
import { downloadTranscript } from '../lib/transcript'

const PHRASES = (agent: string) => [
  `Thank you for contacting Swift Payments. My name is ${agent}. Give me a moment while I review your information.`,
  'Could you please confirm the registered email address on your profile for verification?',
  'Thanks for confirming. I have located your account and I am looking into this now.',
  'I have raised this with our back-office team. You will receive an update within 2 business days.',
  'Is there anything else I can help you with today?',
  'Thank you for chatting with Swift Payments. Have a great day!',
]

const ACCOUNTS = [
  { number: '**** 4821', branch: 'Manhattan - 5th Ave', source: 'CAS' },
  { number: '**** 9034', branch: 'Brooklyn Heights', source: 'CAS' },
]

export function CaseView({
  hub,
  session,
  conv,
  closedReason,
  customerTyping,
  onTransfer,
  onClose,
}: {
  hub: Hub
  session: Session
  conv: Conversation
  closedReason: string | null
  customerTyping: boolean
  onTransfer: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pane, setPane] = useState<'transcript' | 'context'>('transcript')
  const [showAddress, setShowAddress] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [submittedAccount, setSubmittedAccount] = useState<string | null>(null)
  const [dcsClient, setDcsClient] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef(false)
  const typingTimer = useRef<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closed = Boolean(closedReason) || conv.status === 'ended'
  const transferring = conv.status === 'transferring'
  const canSend = !closed && !transferring

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [conv.messages.length, customerTyping, pane])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const setTyping = (isTyping: boolean) => {
    if (typingRef.current === isTyping) return
    typingRef.current = isTyping
    hub.send({ type: 'typing', convId: conv.id, isTyping })
  }

  const onDraft = (value: string) => {
    setDraft(value)
    if (!canSend) return
    setTyping(value.length > 0)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    if (value.length > 0) typingTimer.current = window.setTimeout(() => setTyping(false), 2500)
  }

  const send = () => {
    const text = draft.trim()
    if (!text || !canSend) return
    hub.send({ type: 'send_message', convId: conv.id, text })
    setDraft('')
    setTyping(false)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const download = () => {
    downloadTranscript(
      conv.messages,
      {
        title: `Avengers Hub - Web Messaging transcript`,
        caseNumber: conv.caseNumber,
        customerName: conv.userName,
        agentName: conv.agentName ?? session.name,
        startedAt: conv.createdAt,
        endedAt: conv.endedAt,
      },
      `${conv.caseNumber ?? 'conversation'}-transcript.txt`,
    )
    setMenuOpen(false)
  }

  const endConversation = () => {
    hub.send({ type: 'end_conversation', convId: conv.id })
    setConfirmEnd(false)
    setMenuOpen(false)
  }

  const lastAgentMessage = useMemo(() => [...conv.messages].reverse().find((m) => m.kind === 'agent'), [conv.messages])
  const deadline = new Date(new Date(conv.createdAt).getTime() + 2 * 24 * 3600 * 1000).toISOString()
  const phrases = PHRASES(session.name)

  return (
    <div className="ah-case" data-testid="case-view">
      <div className="ah-case-top">
        <div className="ah-customer">
          <div className="ah-customer-name" data-testid="case-customer">
            {conv.userName} <span className="ah-doc"><Icon name="doc" /></span>
          </div>
          <span className="ah-owner">Owner</span>
          <div className="ah-muted ah-small">Customer ID {conv.customerId}</div>
        </div>
        <div className="ah-info-col">
          <div className="ah-col-title">CONTACT INFORMATION</div>
          <dl>
            <dt>Phone</dt>
            <dd>{conv.userPhone}</dd>
            <dt>Email</dt>
            <dd className="ah-dashed">{conv.userEmail}</dd>
            <dt>Address</dt>
            <dd>
              {showAddress ? conv.userAddress : `${conv.userAddress.slice(0, 28)}...`}
              <br />
              <button className="ah-link-btn ah-link-blue" onClick={() => setShowAddress((s) => !s)}>
                {showAddress ? 'Hide address' : 'Show address'}
              </button>
            </dd>
          </dl>
          <button className="ah-link-btn ah-link-blue ah-more" onClick={() => setPane('context')}>
            More&gt;&gt;
          </button>
        </div>
        <div className="ah-info-col">
          <div className="ah-col-title">CUSTOMER SUMMARY</div>
          <dl>
            <dt>Open Cases</dt>
            <dd>{closed ? 0 : 1}</dd>
            <dt>Reason</dt>
            <dd>{conv.reason}</dd>
            <dt>Language</dt>
            <dd data-testid="case-language">{languageName(conv.language)}</dd>
            <dt>Channel</dt>
            <dd>Web Messaging · Swift Payments</dd>
          </dl>
        </div>
        <div className="ah-info-col">
          <div className="ah-col-title">RELATIONSHIP - INTERNAL USE ONLY</div>
          <dl>
            <dt>Segment</dt>
            <dd>Retail Banking</dd>
            <dt>Customer since</dt>
            <dd>2019</dd>
            <dt>Risk rating</dt>
            <dd>Low</dd>
          </dl>
        </div>
      </div>

      <div className="ah-case-body">
        <section className="ah-case-pane">
          <div className="ah-ribbon" data-testid="case-ribbon">
            <span className="ah-ribbon-icon"><Icon name="doc" /></span>
            {closed ? closedReason : lastAgentMessage ? lastAgentMessage.text : `${conv.userName} has connected. Greet the customer to get started.`}
          </div>
          <div className="ah-case-head">
            <span className="ah-case-head-title">
              <Icon name="inbox" /> <strong>Select an account</strong> <span className="ah-muted">({conv.caseNumber ?? 'pending'})</span>
            </span>
            <span className="ah-icon"><Icon name="bell" /></span>
            <span className="ah-icon"><Icon name="clock" /></span>
            <div className="ah-case-meta">
              <div>
                <div className="ah-meta-label">Case Perceptible</div>
                <div>Yes</div>
              </div>
              <div>
                <div className="ah-meta-label">Urgency</div>
                <div>{conv.priority ? 8 : 5}</div>
              </div>
              <div>
                <div className="ah-meta-label">Deadline</div>
                <div>{formatDateTime(deadline)}</div>
              </div>
              <div>
                <div className="ah-meta-label">Status</div>
                <div data-testid="case-status">{closed ? 'Resolved' : transferring ? 'Transferring' : 'Open'}</div>
              </div>
            </div>
            <span className="ah-icon ah-icon-blue">&#8942;</span>
          </div>
          <div className="ah-case-instructions">
            <span>Please select an account from the below list or press submit to continue</span>
            <label className="ah-check">
              DCS Client? <input type="checkbox" checked={dcsClient} onChange={(e) => setDcsClient(e.target.checked)} /> <span className="ah-help">?</span>
            </label>
            <span className="ah-source">
              <span className="ah-link-blue">Change Account Source</span> <strong>CAS</strong>
            </span>
          </div>
          <table className="ah-table ah-accounts">
            <thead>
              <tr>
                <th></th>
                <th>Account Number</th>
                <th>Branch</th>
                <th>Account Source</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS.map((a) => (
                <tr key={a.number} className={selectedAccount === a.number ? 'selected' : ''} onClick={() => !submittedAccount && setSelectedAccount(a.number)}>
                  <td>
                    <input type="radio" name="account" checked={selectedAccount === a.number} onChange={() => setSelectedAccount(a.number)} disabled={Boolean(submittedAccount)} aria-label={`Select ${a.number}`} />
                  </td>
                  <td>{a.number}</td>
                  <td>{a.branch}</td>
                  <td>{a.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ah-case-actions">
            {submittedAccount ? (
              <span className="ah-muted">Account {submittedAccount} linked to this case.</span>
            ) : (
              <button className="ah-btn ah-btn-primary" disabled={!selectedAccount} onClick={() => setSubmittedAccount(selectedAccount)}>
                Submit
              </button>
            )}
          </div>
          {conv.previousAgents.length > 0 && (
            <div className="ah-history">
              <div className="ah-col-title">Handling history</div>
              <ul>
                {conv.previousAgents.map((p, i) => (
                  <li key={`${p.username}-${i}`}>
                    {p.name} · until {formatTimeWithSeconds(p.until)}
                  </li>
                ))}
                {conv.agentName && <li>{conv.agentName} · current</li>}
              </ul>
            </div>
          )}
        </section>

        <section className="ah-chat-pane" data-testid="agent-chat">
          <div className="ah-chat-head">
            <span className="ah-chat-title">
              <Icon name="chat" /> Web Messaging <span className="ah-icon"><Icon name="user" /></span> <span className="ah-icon"><Icon name="smile" /></span>
            </span>
            <div className="ah-chat-head-right">
              <button className={`ah-chip ${pane === 'transcript' ? 'active' : ''}`} onClick={() => setPane('transcript')}>
                Transcript
              </button>
              <button className={`ah-chip ${pane === 'context' ? 'active' : ''}`} onClick={() => setPane('context')}>
                Context
              </button>
              <div className="ah-menu-wrap" ref={menuRef}>
                <button className="ah-kebab" aria-label="Conversation menu" data-testid="chat-menu" onClick={() => setMenuOpen((o) => !o)}>
                  &#8942;
                </button>
                {menuOpen && (
                  <div className="ah-menu" role="menu" data-testid="chat-menu-items">
                    <button role="menuitem" data-testid="menu-transfer" disabled={!canSend} onClick={() => { setMenuOpen(false); onTransfer() }}>
                      Transfer conversation
                    </button>
                    <button role="menuitem" data-testid="menu-end" disabled={closed} onClick={() => { setMenuOpen(false); setConfirmEnd(true) }}>
                      End conversation
                    </button>
                    <button role="menuitem" disabled>
                      Move to long running
                    </button>
                    <button role="menuitem" data-testid="menu-download" onClick={download}>
                      Download transcript
                    </button>
                    <button role="menuitem" disabled>
                      Initiate phone call
                    </button>
                    <button role="menuitem" disabled>
                      Start co-browse
                    </button>
                    {closed && (
                      <button role="menuitem" data-testid="menu-close-tab" onClick={onClose}>
                        Close tab
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {pane === 'context' ? (
            <div className="ah-context" data-testid="context-pane">
              <dl>
                <dt>Case number</dt>
                <dd>{conv.caseNumber ?? '-'}</dd>
                <dt>Customer</dt>
                <dd>
                  {conv.userName} ({conv.userUsername})
                </dd>
                <dt>Reason for contact</dt>
                <dd>{conv.reason}</dd>
                <dt>Customer language</dt>
                <dd>{languageName(conv.language)}</dd>
                <dt>Priority</dt>
                <dd>{conv.priority ? 'Yes - requeued after agent disconnect' : 'Normal'}</dd>
                <dt>Created</dt>
                <dd>{formatDateTime(conv.createdAt)}</dd>
                {conv.acceptedAt && (
                  <>
                    <dt>Accepted</dt>
                    <dd>{formatDateTime(conv.acceptedAt)}</dd>
                  </>
                )}
                {conv.endedAt && (
                  <>
                    <dt>Ended</dt>
                    <dd>
                      {formatDateTime(conv.endedAt)} by {conv.endedBy === 'agent' ? 'agent' : 'customer'}
                    </dd>
                  </>
                )}
                <dt>Handling agent</dt>
                <dd>{conv.agentName ?? '-'}</dd>
                <dt>Previous agents</dt>
                <dd>{conv.previousAgents.length ? conv.previousAgents.map((p) => p.name).join(', ') : 'None'}</dd>
                <dt>Address</dt>
                <dd>{conv.userAddress}</dd>
              </dl>
            </div>
          ) : (
            <div className="ah-messages" ref={listRef} data-testid="agent-messages">
              {conv.messages.map((m) => (
                <AgentMessage key={m.id} m={m} me={session.name} />
              ))}
              {customerTyping && !closed && (
                <div className="ah-msg ah-msg-customer">
                  <div className="ah-msg-meta">{conv.userName} is typing</div>
                  <div className="ah-bubble ah-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          )}

          {closed ? (
            <div className="ah-closed" data-testid="chat-closed">
              <div>{closedReason ?? 'This conversation has ended.'}</div>
              <div className="ah-closed-actions">
                <button className="ah-btn" data-testid="download-transcript" onClick={download}>
                  Download transcript
                </button>
                <button className="ah-btn ah-btn-primary" onClick={onClose}>
                  Close tab
                </button>
              </div>
            </div>
          ) : (
            <div className="ah-composer">
              {transferring && <div className="ah-transferring" data-testid="chat-transferring">Transfer to {conv.transfer?.toAgentName} pending. Messaging is paused until they accept.</div>}
              <textarea
                data-testid="agent-input"
                placeholder={canSend ? 'Type a message... (Enter to send, Shift+Enter for a new line)' : 'Messaging paused'}
                value={draft}
                onChange={(e) => onDraft(e.target.value)}
                onKeyDown={onKey}
                disabled={!canSend}
                rows={3}
              />
              <div className="ah-composer-row">
                <select
                  className="ah-phrases"
                  aria-label="Phrases"
                  value=""
                  disabled={!canSend}
                  onChange={(e) => {
                    if (e.target.value) onDraft(e.target.value)
                  }}
                >
                  <option value="">Phrases ▾</option>
                  {phrases.map((p) => (
                    <option key={p} value={p}>
                      {p.length > 70 ? `${p.slice(0, 70)}...` : p}
                    </option>
                  ))}
                </select>
                <button className="ah-btn ah-btn-send" data-testid="agent-send" onClick={send} disabled={!canSend || !draft.trim()}>
                  Send
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {confirmEnd && (
        <div className="ah-modal-backdrop" onClick={() => setConfirmEnd(false)}>
          <div className="ah-modal ah-modal-sm" role="dialog" aria-label="End conversation" onClick={(e) => e.stopPropagation()}>
            <div className="ah-modal-head">End conversation</div>
            <div className="ah-modal-body">End the conversation with {conv.userName}? The customer will be notified and can download the transcript.</div>
            <div className="ah-modal-actions">
              <button className="ah-btn" onClick={() => setConfirmEnd(false)}>
                Cancel
              </button>
              <button className="ah-btn ah-btn-danger" data-testid="confirm-end" onClick={endConversation}>
                End conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentMessage({ m, me }: { m: ChatMessage; me: string }) {
  if (m.kind === 'system') {
    return (
      <div className="ah-system" data-testid="system-message">
        <span>
          {formatTimeWithSeconds(m.ts)}: {m.text}
        </span>
      </div>
    )
  }
  const mine = m.kind === 'agent' && m.senderName === me
  const cls = m.kind === 'agent' ? (mine ? 'ah-msg-agent' : 'ah-msg-other-agent') : m.kind === 'bot' ? 'ah-msg-bot' : 'ah-msg-customer'
  return (
    <div className={`ah-msg ${cls}`} data-testid={`msg-${m.kind}`}>
      <div className="ah-msg-meta">
        {m.senderName} · {formatTimeWithSeconds(m.ts)}
      </div>
      <div className="ah-bubble">
        {m.text}
        {m.options && m.options.length > 0 && <div className="ah-bubble-options">Options offered: {m.options.join(' | ')}</div>}
        {m.link && (
          <div>
            <a href={m.link.href} target="_blank" rel="noreferrer">
              {m.link.label}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
