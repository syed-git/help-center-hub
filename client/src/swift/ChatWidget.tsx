import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hub } from '../lib/useHub'
import type { ChatMessage, Conversation, Session } from '../lib/types'
import { formatTime, localId } from '../lib/format'
import { downloadTranscript } from '../lib/transcript'
import { AGENT_OPTIONS, GUIDE_LINK, MAIN_MENU, MAX_REFERENCE_ATTEMPTS, POST_PROMPT_OPTIONS, REFERENCE_PATTERN, RESPONSE_IDS, SUB_MENUS } from './botFlow'
import type { OptionId, ResponseId } from './botFlow'
import { LANGUAGES, STRINGS, detectIntent, englishLabel, localiseSystem } from './i18n'
import type { Lang } from './i18n'

type Stage = 'menu' | 'awaiting_ref' | 'survey_rating' | 'survey_feedback' | 'agent' | 'ended'

interface BotItem {
  text: string
  kind?: 'bot' | 'system'
  options?: string[]
  link?: { label: string; href: string }
}

interface Props {
  hub: Hub
  session: Session
  lang: Lang
  open: boolean
  onClose: () => void
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isResponseId = (id: OptionId): id is ResponseId => (RESPONSE_IDS as OptionId[]).includes(id)

export function ChatWidget({ hub, session, lang, open, onClose }: Props) {
  const t = STRINGS[lang]
  const locale = LANGUAGES.find((l) => l.code === lang)?.locale ?? 'en-US'
  const labels = useCallback((ids: OptionId[]) => ids.map((id) => t.options[id]), [t])
  const idOf = useCallback(
    (label: string): OptionId | null => (Object.keys(t.options) as OptionId[]).find((id) => t.options[id] === label) ?? null,
    [t],
  )
  const [local, setLocal] = useState<ChatMessage[]>([])
  const [stage, setStage] = useState<Stage>('menu')
  const [botTyping, setBotTyping] = useState(false)
  const [agentTyping, setAgentTyping] = useState(false)
  const [conv, setConv] = useState<Conversation | null>(null)
  const [queueMsg, setQueueMsg] = useState<ChatMessage | null>(null)
  const [input, setInput] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const greeted = useRef(false)
  const refAttempts = useRef(0)
  const chain = useRef(Promise.resolve())
  const listRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<number | null>(null)
  const agentTypingTimer = useRef<number | null>(null)
  const stageRef = useRef<Stage>('menu')
  const convRef = useRef<Conversation | null>(null)
  useEffect(() => {
    stageRef.current = stage
    convRef.current = conv
  }, [stage, conv])

  const push = useCallback((msg: Omit<ChatMessage, 'id' | 'ts'> & Partial<Pick<ChatMessage, 'id' | 'ts'>>) => {
    setLocal((prev) => [...prev, { id: localId(), ts: new Date().toISOString(), ...msg }])
  }, [])

  const hideOptions = useCallback(() => {
    setLocal((prev) => prev.map((m) => (m.options && !m.optionsUsed ? { ...m, optionsUsed: true } : m)))
  }, [])

  /** Queue bot replies so they appear one after another with a typing indicator. */
  const botSay = useCallback(
    (items: BotItem[]) => {
      chain.current = chain.current.then(async () => {
        for (const item of items) {
          if (item.kind === 'system') {
            push({ kind: 'system', senderName: 'System', text: item.text })
            continue
          }
          setBotTyping(true)
          await sleep(600 + Math.min(item.text.length * 6, 900))
          setBotTyping(false)
          push({ kind: 'bot', senderName: t.botName, text: item.text, options: item.options, link: item.link })
        }
      })
    },
    [push, t.botName],
  )

  const showToast = useCallback((text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const greet = useCallback(() => {
    botSay([{ text: t.greeting(session.firstName ?? session.name) }, { text: t.mainMenuPrompt, options: labels(MAIN_MENU) }])
  }, [botSay, labels, session, t])

  useEffect(() => {
    if (open && !greeted.current) {
      greeted.current = true
      greet()
    }
  }, [open, greet])

  useEffect(
    () =>
      hub.subscribe((event) => {
        switch (event.type) {
          case 'conversation': {
            const c = event.conversation
            if (convRef.current && convRef.current.id !== c.id && convRef.current.status !== 'ended') return
            setConv(c)
            setStage(c.status === 'ended' ? 'ended' : 'agent')
            if (c.status === 'ended') setAgentTyping(false)
            break
          }
          case 'queue_update':
            setQueueMsg((prev) => ({
              id: prev?.id ?? localId('q'),
              ts: prev?.ts ?? new Date().toISOString(),
              kind: 'bot',
              senderName: t.botName,
              text: t.queuePosition(event.position, event.waitMinutes),
            }))
            break
          case 'no_agents':
            setStage('menu')
            botSay([{ kind: 'system', text: t.noAgents }, { text: t.postPrompt, options: labels(POST_PROMPT_OPTIONS) }])
            break
          case 'typing':
            if (event.from !== 'agent') break
            setAgentTyping(event.isTyping)
            if (agentTypingTimer.current) window.clearTimeout(agentTypingTimer.current)
            if (event.isTyping) agentTypingTimer.current = window.setTimeout(() => setAgentTyping(false), 4000)
            break
          case 'error':
            showToast(event.message)
            break
          default:
            break
        }
      }),
    [hub, botSay, showToast, t, labels],
  )

  const visible = useMemo<ChatMessage[]>(() => {
    if (!conv) return local
    const remote = conv.messages.map((m) => (m.kind === 'system' && m.key ? { ...m, text: localiseSystem(m.text, m.key, m.params, lang) } : m))
    const list = queueMsg ? [...remote, queueMsg] : remote
    return list.sort((a, b) => a.ts.localeCompare(b.ts))
  }, [conv, local, queueMsg, lang])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visible, botTyping, agentTyping, open])

  const requestAgent = useCallback(
    (reason: string, userText: string) => {
      setStage('agent')
      setQueueMsg(null)
      const userMsg: ChatMessage = { id: localId(), kind: 'user', senderName: session.name, text: userText, ts: new Date().toISOString() }
      const history = [...local, userMsg].map(({ kind, senderName, text, ts, link }) => ({
        kind,
        senderName,
        text: link ? `${text} (${link.label}: ${link.href})` : text,
        ts,
      }))
      hub.send({ type: 'request_agent', history, reason, language: lang })
    },
    [hub, local, session.name, lang],
  )

  const respondWithStatic = useCallback(
    (id: ResponseId) => {
      const r = t.responses[id]
      botSay([
        { text: r.text, link: r.linkLabel ? { label: r.linkLabel, href: GUIDE_LINK } : undefined },
        { text: t.postPrompt, options: labels(POST_PROMPT_OPTIONS) },
      ])
    },
    [botSay, labels, t],
  )

  const handleOption = useCallback(
    (label: string) => {
      if (botTyping) return
      hideOptions()
      push({ kind: 'user', senderName: session.name, text: label })

      if (stageRef.current === 'survey_rating') {
        setStage('survey_feedback')
        botSay([{ text: t.surveyFeedback }])
        return
      }
      const id = idOf(label)
      if (id && AGENT_OPTIONS.includes(id)) {
        requestAgent(englishLabel(id), label)
        return
      }
      if (id === 'yes') {
        setStage('menu')
        botSay([{ text: t.mainMenuPrompt, options: labels(MAIN_MENU) }])
        return
      }
      if (id === 'no') {
        setStage('survey_rating')
        botSay([{ text: t.surveyRating, options: t.ratings }])
        return
      }
      if (id === 'existing_payment') {
        refAttempts.current = 0
        setStage('awaiting_ref')
        botSay([{ text: t.existingPaymentPrompt }])
        return
      }
      const sub = id ? SUB_MENUS[id] : undefined
      if (sub) {
        setStage('menu')
        botSay([{ text: t.subMenuPrompt, options: labels(sub) }])
        return
      }
      if (id && isResponseId(id)) {
        setStage('menu')
        respondWithStatic(id)
        return
      }
      botSay([{ text: t.fallback, options: labels(MAIN_MENU) }])
    },
    [botSay, botTyping, hideOptions, idOf, labels, push, requestAgent, respondWithStatic, session.name, t],
  )

  const finishSurvey = useCallback(() => {
    setStage('ended')
    botSay([{ text: t.surveyThanks }, { kind: 'system', text: t.botEnded }])
  }, [botSay, t])

  const handleText = useCallback(
    (text: string) => {
      const current = stageRef.current
      const c = convRef.current
      if (current === 'agent' && c) {
        if (c.status === 'active' || c.status === 'transferring') {
          hub.send({ type: 'send_message', convId: c.id, text })
          hub.send({ type: 'typing', convId: c.id, isTyping: false })
        } else {
          showToast(t.waitForAgent)
        }
        return
      }
      hideOptions()
      push({ kind: 'user', senderName: session.name, text })

      if (current === 'awaiting_ref') {
        if (REFERENCE_PATTERN.test(text)) {
          setStage('menu')
          const date = new Date(Date.now() - 86_400_000).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
          botSay([{ text: t.existingPaymentResponse(text.toUpperCase(), date) }, { text: t.postPrompt, options: labels(POST_PROMPT_OPTIONS) }])
        } else {
          refAttempts.current += 1
          if (refAttempts.current >= MAX_REFERENCE_ATTEMPTS) {
            setStage('menu')
            botSay([{ text: t.referenceGiveUp }, { text: t.postPrompt, options: labels(POST_PROMPT_OPTIONS) }])
          } else {
            botSay([{ text: t.invalidReference }])
          }
        }
        return
      }
      if (current === 'survey_feedback') {
        finishSurvey()
        return
      }
      if (current === 'survey_rating') {
        botSay([{ text: t.pickRating, options: t.ratings }])
        return
      }
      const intent = detectIntent(text, lang)
      const sub = intent ? SUB_MENUS[intent] : undefined
      if (intent && AGENT_OPTIONS.includes(intent)) {
        requestAgent(englishLabel(intent), text)
      } else if (sub) {
        botSay([{ text: t.subMenuPrompt, options: labels(sub) }])
      } else {
        botSay([{ text: t.fallback, options: labels(MAIN_MENU) }])
      }
    },
    [botSay, finishSurvey, hideOptions, hub, labels, lang, locale, push, requestAgent, session.name, showToast, t],
  )

  const submit = () => {
    const text = input.trim()
    if (!text) return
    if (text.length > 2000) {
      showToast(t.tooLong)
      return
    }
    setInput('')
    handleText(text)
  }

  const onInputChange = (value: string) => {
    setInput(value)
    const c = convRef.current
    if (stage === 'agent' && c && c.status === 'active') {
      hub.send({ type: 'typing', convId: c.id, isTyping: true })
      if (typingTimer.current) window.clearTimeout(typingTimer.current)
      typingTimer.current = window.setTimeout(() => hub.send({ type: 'typing', convId: c.id, isTyping: false }), 1500)
    }
  }

  const endConversation = () => {
    setMenuOpen(false)
    if (stage === 'ended') return
    if (conv && conv.status !== 'ended') {
      hub.send({ type: 'end_conversation', convId: conv.id })
      return
    }
    chain.current = Promise.resolve()
    setBotTyping(false)
    hideOptions()
    setStage('ended')
    push({ kind: 'system', senderName: 'System', text: t.userEnded })
  }

  const download = () => {
    setMenuOpen(false)
    downloadTranscript(
      visible,
      {
        title: t.ui.transcriptTitle,
        caseNumber: conv?.caseNumber,
        customerName: session.name,
        agentName: conv?.agentName,
        startedAt: visible[0]?.ts,
        endedAt: conv?.endedAt ?? visible[visible.length - 1]?.ts,
      },
      `swift-payments-transcript-${conv?.caseNumber ?? new Date().toISOString().slice(0, 10)}.txt`,
    )
  }

  const startNewChat = () => {
    chain.current = Promise.resolve()
    setConv(null)
    setQueueMsg(null)
    setLocal([])
    setStage('menu')
    setBotTyping(false)
    setAgentTyping(false)
    refAttempts.current = 0
    greet()
  }

  const waitingForAgent = stage === 'agent' && (!conv || conv.status === 'queued' || conv.status === 'offering')
  const inputDisabled = stage === 'ended' || waitingForAgent || hub.status !== 'open'
  const placeholder = stage === 'ended' ? t.ui.conversationEnded : waitingForAgent ? t.ui.waitingForAgent : t.ui.typeMessage
  const lastOptionsId = [...visible].reverse().find((m) => m.options && !m.optionsUsed)?.id

  return (
    <div className={`cw ${open ? 'cw-open' : ''}`} data-testid="chat-widget" aria-hidden={!open} lang={lang}>
      <div className="cw-header">
        <span className="cw-title">{t.ui.title}</span>
        <div className="cw-header-actions">
          <button className="cw-icon-btn" aria-label={t.ui.chatMenu} data-testid="chat-menu" onClick={() => setMenuOpen((v) => !v)}>
            &#8942;
          </button>
          {menuOpen && (
            <div className="cw-menu" role="menu">
              <button role="menuitem" data-testid="chat-menu-end" disabled={stage === 'ended'} onClick={endConversation}>
                {t.ui.endConversation}
              </button>
              <button
                role="menuitem"
                data-testid="chat-menu-download"
                disabled={stage !== 'ended'}
                title={stage !== 'ended' ? t.ui.availableAfterEnd : undefined}
                onClick={download}
              >
                {t.ui.downloadTranscript}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onClose()
                }}
              >
                {t.ui.minimize}
              </button>
            </div>
          )}
        </div>
      </div>

      {hub.status !== 'open' && <div className="cw-banner">{t.ui.connectionLost}</div>}
      {toast && <div className="cw-toast">{toast}</div>}

      <div className="cw-messages" ref={listRef} data-testid="chat-messages">
        {visible.map((m) => (
          <Message key={m.id} m={m} delivered={t.ui.delivered} showOptions={m.id === lastOptionsId} onOption={handleOption} />
        ))}
        {botTyping && <TypingBubble label={`${t.botName} ${t.ui.isTyping}`} />}
        {agentTyping && conv?.agentName && <TypingBubble label={`${conv.agentName} ${t.ui.isTyping}`} />}
        {stage === 'ended' && (
          <div className="cw-ended">
            <button className="cw-btn cw-btn-primary" data-testid="download-transcript" onClick={download}>
              {t.ui.downloadTranscript}
            </button>
            <button className="cw-btn" data-testid="start-new-chat" onClick={startNewChat}>
              {t.ui.startNewChat}
            </button>
          </div>
        )}
      </div>

      <form
        className="cw-composer"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          data-testid="chat-input"
          value={input}
          disabled={inputDisabled}
          placeholder={placeholder}
          onChange={(e) => onInputChange(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" className="cw-send" aria-label="Send" data-testid="chat-send" disabled={inputDisabled || !input.trim()}>
          &#10148;
        </button>
      </form>
      <div className="cw-footer">
        <a href="#/privacy">{t.ui.privacy}</a>
        <a href="#/terms">{t.ui.terms}</a>
        <span className="cw-release">R: 1.0.0_swiftpay-main_EPF</span>
      </div>
    </div>
  )
}

function Message({
  m,
  delivered,
  showOptions,
  onOption,
}: {
  m: ChatMessage
  delivered: string
  showOptions: boolean
  onOption: (label: string) => void
}) {
  if (m.kind === 'system') {
    return (
      <div className="cw-msg cw-msg-system" data-testid="system-message">
        {formatTime(m.ts)}: {m.text}
      </div>
    )
  }
  if (m.kind === 'user') {
    return (
      <div className="cw-msg cw-msg-user" data-testid="user-message">
        <div className="cw-bubble">{m.text}</div>
        <div className="cw-meta">
          {delivered} {formatTime(m.ts)}
        </div>
      </div>
    )
  }
  const isAgent = m.kind === 'agent'
  return (
    <div className={`cw-msg ${isAgent ? 'cw-msg-agent' : 'cw-msg-bot'}`} data-testid={isAgent ? 'agent-message' : 'bot-message'}>
      {isAgent && <div className="cw-sender">{m.senderName}</div>}
      <div className="cw-bubble">
        <div>
          {m.link ? renderWithLink(m.text, m.link) : m.text}
        </div>
        {m.options && !m.optionsUsed && showOptions && (
          <div className="cw-options" data-testid="bot-options">
            {m.options.map((o) => (
              <button key={o} type="button" className="cw-option" onClick={() => onOption(o)}>
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="cw-meta">{formatTime(m.ts)}</div>
    </div>
  )
}

function renderWithLink(text: string, link: { label: string; href: string }) {
  const idx = text.indexOf(link.label)
  if (idx < 0) {
    return (
      <>
        {text}{' '}
        <a href={link.href} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      </>
    )
  }
  return (
    <>
      {text.slice(0, idx)}
      <a href={link.href} target="_blank" rel="noreferrer">
        {link.label}
      </a>
      {text.slice(idx + link.label.length)}
    </>
  )
}

function TypingBubble({ label }: { label: string }) {
  return (
    <div className="cw-msg cw-msg-bot cw-typing" data-testid="typing-indicator" aria-label={label}>
      <div className="cw-bubble">
        <span className="cw-dot" />
        <span className="cw-dot" />
        <span className="cw-dot" />
      </div>
    </div>
  )
}
