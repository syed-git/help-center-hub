import { randomUUID } from 'node:crypto'
import { USERS, AGENTS } from './accounts.js'

export const OFFER_TIMEOUT_MS = Number(process.env.OFFER_TIMEOUT_MS ?? 30_000)
export const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS ?? 4_000)
const WAIT_MINUTES_PER_POSITION = 1

/**
 * In-memory real-time hub shared by Swift Payments (customers) and Avengers Hub (agents).
 *
 * sessions:      token -> { token, role, username, name, socket, disconnectTimer, ...profile }
 * agents:        username -> { username, name, readiness: 'available'|'away', pendingOfferConvId, activeConvId }
 * conversations: id -> conversation (see createConversation)
 */
export class Hub {
  constructor() {
    this.sessions = new Map()
    this.agents = new Map()
    this.conversations = new Map()
    this.caseSeq = 0
    this.msgSeq = 0
  }

  // ---------- helpers ----------

  send(socket, payload) {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(payload))
  }

  sessionOf(role, username) {
    for (const s of this.sessions.values()) if (s.role === role && s.username === username) return s
    return null
  }

  sendToAgent(username, payload) {
    const s = this.sessionOf('agent', username)
    if (s) this.send(s.socket, payload)
  }

  sendToUser(username, payload) {
    const s = this.sessionOf('user', username)
    if (s) this.send(s.socket, payload)
  }

  now() {
    return new Date().toISOString()
  }

  nextCaseNumber() {
    this.caseSeq += 1
    const d = new Date()
    const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    return `I-${yymmdd}-CHT${String(this.caseSeq).padStart(6, '0')}`
  }

  addMessage(conv, { kind, senderName, text, audience = 'all', key, params }) {
    this.msgSeq += 1
    const message = { id: `m${this.msgSeq}`, kind, senderName, text, audience, ts: this.now() }
    if (key) {
      message.key = key
      message.params = params ?? {}
    }
    conv.messages.push(message)
    return message
  }

  effectiveAgentStatus(agent) {
    const session = this.sessionOf('agent', agent.username)
    if (!session) return 'offline'
    if (!session.socket) return 'reconnecting'
    if (agent.activeConvId) return 'busy'
    return agent.readiness
  }

  agentRoster() {
    return [...this.agents.values()].map((a) => ({
      username: a.username,
      name: a.name,
      status: this.effectiveAgentStatus(a),
      activeConvId: a.activeConvId,
      pendingOfferConvId: a.pendingOfferConvId,
    }))
  }

  queuedConversations() {
    return [...this.conversations.values()]
      .filter((c) => c.status === 'queued' || c.status === 'offering')
      .sort((a, b) => Number(b.priority) - Number(a.priority) || a.queuedAt.localeCompare(b.queuedAt))
  }

  hubState() {
    return {
      agents: this.agentRoster(),
      queue: this.queuedConversations().map((c) => ({
        id: c.id,
        userName: c.userName,
        status: c.status,
        priority: c.priority,
        queuedAt: c.queuedAt,
        offeredTo: c.offer?.agentUsername ?? null,
      })),
      activeCount: [...this.conversations.values()].filter((c) => c.status === 'active' || c.status === 'transferring').length,
      endedCount: [...this.conversations.values()].filter((c) => c.status === 'ended').length,
    }
  }

  broadcastHubState() {
    const payload = { type: 'hub_state', state: this.hubState() }
    for (const s of this.sessions.values()) if (s.role === 'agent') this.send(s.socket, payload)
  }

  convView(conv, role) {
    const { offer, transfer, ...rest } = conv
    return {
      ...rest,
      transfer: transfer ? { toAgentName: transfer.toAgentName, fromAgentName: transfer.fromAgentName } : null,
      offerPending: Boolean(offer),
      messages: conv.messages.filter((m) => m.audience === 'all' || m.audience === role),
    }
  }

  pushConversation(conv) {
    this.sendToUser(conv.userUsername, { type: 'conversation', conversation: this.convView(conv, 'user') })
    if (conv.agentUsername) {
      this.sendToAgent(conv.agentUsername, { type: 'conversation', conversation: this.convView(conv, 'agent') })
    }
    this.broadcastHubState()
  }

  pushQueuePositions() {
    const queue = this.queuedConversations()
    queue.forEach((conv, index) => {
      const position = index + 1
      this.sendToUser(conv.userUsername, {
        type: 'queue_update',
        convId: conv.id,
        position,
        waitMinutes: position * WAIT_MINUTES_PER_POSITION,
      })
    })
  }

  // ---------- auth ----------

  login(socket, { role, username, password }) {
    const directory = role === 'agent' ? AGENTS : role === 'user' ? USERS : null
    if (!directory) return { error: 'Unknown role.' }
    const uname = String(username ?? '').trim().toLowerCase()
    const account = directory.find((a) => a.username === uname)
    if (!account || account.password !== password) return { error: 'Invalid username or password.' }

    const existing = this.sessionOf(role, uname)
    if (existing && existing.socket && existing.socket !== socket && existing.socket.readyState === 1) {
      return { error: `${account.name} is already logged in from another window.` }
    }

    let session = existing
    if (session) {
      clearTimeout(session.disconnectTimer)
      session.disconnectTimer = null
    } else {
      const { password: _pw, ...profile } = account
      session = { token: randomUUID(), role, ...profile, socket: null, disconnectTimer: null }
      this.sessions.set(session.token, session)
    }
    this.attach(session, socket)
    return { session }
  }

  resume(socket, { token }) {
    const session = this.sessions.get(token)
    if (!session) return { error: 'Session expired. Please log in again.' }
    if (session.socket && session.socket !== socket && session.socket.readyState === 1) {
      return { error: 'This session is active in another window.' }
    }
    clearTimeout(session.disconnectTimer)
    session.disconnectTimer = null
    this.attach(session, socket)
    return { session }
  }

  attach(session, socket) {
    session.socket = socket
    socket.sessionToken = session.token
    const { socket: _s, disconnectTimer: _t, ...publicSession } = session
    this.send(socket, { type: 'session', session: publicSession })

    if (session.role === 'agent') {
      let agent = this.agents.get(session.username)
      if (!agent) {
        agent = { username: session.username, name: session.name, readiness: 'away', pendingOfferConvId: null, activeConvId: null }
        this.agents.set(session.username, agent)
      }
      if (agent.activeConvId) {
        const conv = this.conversations.get(agent.activeConvId)
        if (conv) this.send(socket, { type: 'conversation', conversation: this.convView(conv, 'agent') })
      }
      if (agent.pendingOfferConvId) {
        const conv = this.conversations.get(agent.pendingOfferConvId)
        if (conv?.offer) this.send(socket, { type: 'offer', offer: this.offerView(conv) })
      }
      this.broadcastHubState()
      this.dispatch()
    } else {
      const conv = this.userConversation(session.username)
      if (conv) {
        this.send(socket, { type: 'conversation', conversation: this.convView(conv, 'user') })
        this.pushQueuePositions()
      }
    }
  }

  logout(socket) {
    const session = this.sessions.get(socket.sessionToken)
    if (!session) return
    session.socket = null
    this.finalizeDisconnect(session)
  }

  socketClosed(socket) {
    const session = this.sessions.get(socket.sessionToken)
    if (!session || session.socket !== socket) return
    session.socket = null

    if (session.role === 'agent') {
      const agent = this.agents.get(session.username)
      // A pending offer cannot be answered by a disconnected agent: move it on right away.
      if (agent?.pendingOfferConvId) {
        const conv = this.conversations.get(agent.pendingOfferConvId)
        if (conv) this.resolveOffer(conv, 'agent_unavailable')
      }
      this.broadcastHubState()
    }
    session.disconnectTimer = setTimeout(() => this.finalizeDisconnect(session), DISCONNECT_GRACE_MS)
  }

  finalizeDisconnect(session) {
    if (session.socket) return // reconnected in the meantime
    this.sessions.delete(session.token)

    if (session.role === 'agent') {
      const agent = this.agents.get(session.username)
      if (agent) {
        if (agent.pendingOfferConvId) {
          const conv = this.conversations.get(agent.pendingOfferConvId)
          if (conv) this.resolveOffer(conv, 'agent_unavailable')
        }
        if (agent.activeConvId) {
          const conv = this.conversations.get(agent.activeConvId)
          if (conv) this.requeueAfterAgentLoss(conv, agent)
        }
        this.agents.delete(session.username)
      }
      this.broadcastHubState()
      this.dispatch()
    } else {
      const conv = this.userConversation(session.username)
      if (conv) this.customerLeft(conv)
    }
  }

  // ---------- agents ----------

  setAgentReadiness(socket, readiness) {
    const session = this.sessions.get(socket.sessionToken)
    const agent = session && this.agents.get(session.username)
    if (!agent) return
    if (readiness !== 'available' && readiness !== 'away') return
    agent.readiness = readiness
    if (readiness === 'away' && agent.pendingOfferConvId) {
      const conv = this.conversations.get(agent.pendingOfferConvId)
      if (conv) this.resolveOffer(conv, 'agent_unavailable')
    }
    this.broadcastHubState()
    this.dispatch()
  }

  // ---------- conversations ----------

  userConversation(userUsername) {
    for (const c of this.conversations.values()) {
      if (c.userUsername === userUsername && c.status !== 'ended') return c
    }
    return null
  }

  requestAgent(socket, { history = [], reason = 'Chat with agent', language = 'en' }) {
    const session = this.sessions.get(socket.sessionToken)
    if (!session || session.role !== 'user') return
    if (this.userConversation(session.username)) {
      this.send(socket, { type: 'error', message: 'You already have a chat in progress.' })
      return
    }

    const conv = {
      id: randomUUID(),
      caseNumber: null,
      userUsername: session.username,
      userName: session.name,
      userEmail: session.email,
      userPhone: session.phone,
      userAddress: session.address,
      customerId: session.customerId,
      agentUsername: null,
      agentName: null,
      status: 'queued',
      priority: false,
      reason,
      language: typeof language === 'string' ? language.slice(0, 5) : 'en',
      createdAt: this.now(),
      queuedAt: this.now(),
      endedAt: null,
      endedBy: null,
      declinedBy: [],
      excludedAgents: [],
      previousAgents: [],
      offer: null,
      transfer: null,
      messages: [],
    }
    for (const m of history) {
      if (!m || typeof m.text !== 'string') continue
      const kind = ['user', 'bot', 'system'].includes(m.kind) ? m.kind : 'bot'
      this.msgSeq += 1
      conv.messages.push({
        id: `h${this.msgSeq}`,
        kind,
        senderName: String(m.senderName ?? (kind === 'user' ? session.name : 'Swift Assistant')),
        text: m.text,
        audience: 'all',
        ts: typeof m.ts === 'string' ? m.ts : this.now(),
      })
    }

    const onlineAgents = [...this.agents.values()].filter((a) => {
      const st = this.effectiveAgentStatus(a)
      return st === 'available' || st === 'busy'
    })
    if (onlineAgents.length === 0) {
      this.send(socket, { type: 'no_agents', message: 'No agents are available at the moment. Please try again later.' })
      return
    }

    this.conversations.set(conv.id, conv)
    this.addMessage(conv, {
      kind: 'system',
      senderName: 'System',
      audience: 'user',
      text: "Let me route you to a live agent who should be able to help. Please note that in some countries, agent support may only be available in English. To request support in your local language, notify the agent and they'll guide you on next steps.",
      key: 'routing_notice',
    })
    this.pushConversation(conv)
    this.dispatch()
    this.pushQueuePositions()
  }

  cancelRequest(socket, { convId }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    if (!session || !conv || conv.userUsername !== session.username) return
    if (conv.status !== 'queued' && conv.status !== 'offering') return
    if (conv.offer) this.resolveOffer(conv, 'cancelled', { silentDispatch: true })
    conv.status = 'ended'
    conv.endedAt = this.now()
    conv.endedBy = 'user'
    this.addMessage(conv, { kind: 'system', senderName: 'System', text: 'You left the queue. The conversation has ended.', key: 'left_queue' })
    this.pushConversation(conv)
    this.pushQueuePositions()
    this.dispatch()
  }

  offerView(conv) {
    return {
      convId: conv.id,
      customerName: conv.userName,
      reason: conv.reason,
      language: conv.language,
      canDecline: conv.offer.canDecline,
      expiresAt: conv.offer.expiresAt,
      isTransfer: Boolean(conv.transfer),
      fromAgentName: conv.transfer?.fromAgentName ?? null,
      priority: conv.priority,
    }
  }

  candidateAgents(conv) {
    return [...this.agents.values()].filter(
      (a) =>
        this.effectiveAgentStatus(a) === 'available' &&
        !a.pendingOfferConvId &&
        !conv.declinedBy.includes(a.username) &&
        !conv.excludedAgents.includes(a.username),
    )
  }

  /** Offer queued conversations to available agents (oldest / priority first). */
  dispatch() {
    for (const conv of this.queuedConversations()) {
      if (conv.status !== 'queued') continue
      let candidates = this.candidateAgents(conv)
      if (candidates.length === 0 && conv.declinedBy.length > 0) {
        // Everyone who is free has already declined: give them another chance rather than starving the customer.
        const freeAgents = [...this.agents.values()].filter(
          (a) => this.effectiveAgentStatus(a) === 'available' && !a.pendingOfferConvId && !conv.excludedAgents.includes(a.username),
        )
        if (freeAgents.length > 0 && freeAgents.every((a) => conv.declinedBy.includes(a.username))) {
          conv.declinedBy = []
          candidates = freeAgents
        }
      }
      if (candidates.length === 0) continue
      this.makeOffer(conv, candidates[0], { canDecline: conv.declinedBy.length === 0 })
    }
    this.broadcastHubState()
  }

  makeOffer(conv, agent, { canDecline }) {
    if (conv.status === 'queued') conv.status = 'offering'
    conv.offer = {
      agentUsername: agent.username,
      canDecline,
      expiresAt: new Date(Date.now() + OFFER_TIMEOUT_MS).toISOString(),
      timer: setTimeout(() => this.resolveOffer(conv, 'timeout'), OFFER_TIMEOUT_MS),
    }
    agent.pendingOfferConvId = conv.id
    this.sendToAgent(agent.username, { type: 'offer', offer: this.offerView(conv) })
  }

  /**
   * Clear the current offer of a conversation.
   * reason: 'declined' | 'timeout' | 'agent_unavailable' | 'cancelled' | 'accepted'
   */
  resolveOffer(conv, reason, { silentDispatch = false } = {}) {
    const offer = conv.offer
    if (!offer) return
    clearTimeout(offer.timer)
    conv.offer = null
    const agent = this.agents.get(offer.agentUsername)
    if (agent && agent.pendingOfferConvId === conv.id) agent.pendingOfferConvId = null
    if (reason !== 'accepted') {
      this.sendToAgent(offer.agentUsername, { type: 'offer_cancelled', convId: conv.id, reason })
    }

    if (reason === 'accepted') return

    if (conv.transfer) {
      // Transfer offer fell through: the conversation stays with the original agent.
      const { fromAgentUsername, toAgentName } = conv.transfer
      conv.transfer = null
      if (conv.status === 'transferring') {
        conv.status = 'active'
        const why = reason === 'declined' ? 'declined the transfer' : 'did not respond to the transfer request'
        this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: `${toAgentName} ${why}. The conversation remains with you.` })
        this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: `The transfer could not be completed. You're still connected with ${conv.agentName}.`, key: 'transfer_failed', params: { agentName: conv.agentName } })
        this.sendToAgent(fromAgentUsername, { type: 'transfer_result', convId: conv.id, ok: false, message: `${toAgentName} ${why}.` })
        this.pushConversation(conv)
      }
      return
    }

    if (reason === 'declined' || reason === 'timeout') conv.declinedBy.push(offer.agentUsername)
    if (conv.status === 'offering') conv.status = 'queued'
    if (!silentDispatch) {
      this.dispatch()
      this.pushQueuePositions()
    }
  }

  acceptOffer(socket, { convId }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    const agent = session && this.agents.get(session.username)
    if (!agent || !conv || !conv.offer || conv.offer.agentUsername !== agent.username) {
      this.send(socket, { type: 'error', message: 'This request is no longer available.' })
      return
    }
    this.resolveOffer(conv, 'accepted')

    if (conv.transfer) {
      const previous = this.agents.get(conv.transfer.fromAgentUsername)
      const previousName = conv.transfer.fromAgentName
      const previousUsername = conv.transfer.fromAgentUsername
      conv.transfer = null
      if (previous && previous.activeConvId === conv.id) previous.activeConvId = null
      conv.previousAgents.push({ username: previousUsername, name: previousName, until: this.now() })
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: `Conversation transferred from ${previousName} to ${agent.name}.` })
      this.sendToAgent(previousUsername, {
        type: 'conversation_closed',
        convId: conv.id,
        reason: 'transferred',
        message: `Conversation ${conv.caseNumber} was transferred to ${agent.name}.`,
        conversation: this.convView(conv, 'agent'),
      })
      this.sendToAgent(previousUsername, { type: 'transfer_result', convId: conv.id, ok: true, message: `Transferred to ${agent.name}.` })
    } else {
      conv.caseNumber = conv.caseNumber ?? this.nextCaseNumber()
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: 'Customer has connected.' })
    }

    conv.status = 'active'
    conv.priority = false
    conv.agentUsername = agent.username
    conv.agentName = agent.name
    conv.acceptedAt = this.now()
    agent.activeConvId = conv.id
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: `You're connected with ${agent.name}. Thanks for your patience.`, key: 'connected', params: { agentName: agent.name } })
    this.pushConversation(conv)
    this.pushQueuePositions()
    this.dispatch()
  }

  declineOffer(socket, { convId }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    const agent = session && this.agents.get(session.username)
    if (!agent || !conv || !conv.offer || conv.offer.agentUsername !== agent.username) return
    if (!conv.offer.canDecline) {
      this.send(socket, { type: 'error', message: 'This request cannot be declined.' })
      return
    }
    this.resolveOffer(conv, 'declined')
  }

  sendMessage(socket, { convId, text }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    const clean = String(text ?? '').trim()
    if (!session || !conv || !clean) return
    if (clean.length > 2000) {
      this.send(socket, { type: 'error', message: 'Message is too long (max 2000 characters).' })
      return
    }
    const isUser = session.role === 'user' && conv.userUsername === session.username
    const isAgent = session.role === 'agent' && conv.agentUsername === session.username
    if (!isUser && !isAgent) return
    if (conv.status === 'ended') {
      this.send(socket, { type: 'error', message: 'This conversation has ended.' })
      return
    }
    if (isUser && conv.status !== 'active' && conv.status !== 'transferring') {
      this.send(socket, { type: 'error', message: 'Please wait until an agent joins the conversation.' })
      return
    }
    this.addMessage(conv, { kind: isUser ? 'user' : 'agent', senderName: session.name, text: clean })
    this.pushConversation(conv)
  }

  typing(socket, { convId, isTyping }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    if (!session || !conv) return
    const payload = { type: 'typing', convId, from: session.role, name: session.name, isTyping: Boolean(isTyping) }
    if (session.role === 'user' && conv.agentUsername) this.sendToAgent(conv.agentUsername, payload)
    if (session.role === 'agent' && conv.agentUsername === session.username) this.sendToUser(conv.userUsername, payload)
  }

  endConversation(socket, { convId }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    if (!session || !conv || conv.status === 'ended') return
    const isUser = session.role === 'user' && conv.userUsername === session.username
    const isAgent = session.role === 'agent' && conv.agentUsername === session.username
    if (!isUser && !isAgent) return
    if (isUser && (conv.status === 'queued' || conv.status === 'offering')) {
      this.cancelRequest(socket, { convId })
      return
    }
    conv.transfer = null
    if (conv.offer) this.resolveOffer(conv, 'cancelled', { silentDispatch: true })
    conv.status = 'ended'
    conv.endedAt = this.now()
    conv.endedBy = session.role
    if (isAgent) {
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: `${session.name} has ended the conversation. Thank you for contacting Swift Payments.`, key: 'ended_by_agent', params: { agentName: session.name } })
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: 'You have ended the conversation.' })
    } else {
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: 'You have ended the conversation. Thank you for contacting Swift Payments.', key: 'ended_by_user' })
      this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: 'Customer has ended the conversation.' })
    }
    this.releaseAgent(conv)
    this.pushConversation(conv)
    this.dispatch()
  }

  releaseAgent(conv) {
    if (!conv.agentUsername) return
    const agent = this.agents.get(conv.agentUsername)
    if (agent && agent.activeConvId === conv.id) agent.activeConvId = null
  }

  requeueAfterAgentLoss(conv, agent) {
    if (conv.status !== 'active' && conv.status !== 'transferring') return
    conv.transfer = null
    if (conv.offer) this.resolveOffer(conv, 'cancelled', { silentDispatch: true })
    conv.previousAgents.push({ username: agent.username, name: agent.name, until: this.now() })
    conv.excludedAgents = [agent.username]
    conv.declinedBy = []
    conv.agentUsername = null
    conv.agentName = null
    conv.status = 'queued'
    conv.priority = true
    conv.queuedAt = this.now()
    agent.activeConvId = null
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: 'Agent disconnected, this conversation is being requeued on priority.', key: 'agent_disconnected' })
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: `${agent.name} disconnected. Conversation requeued on priority.` })
    this.pushConversation(conv)
    this.dispatch()
    this.pushQueuePositions()
  }

  customerLeft(conv) {
    if (conv.status === 'ended') return
    conv.transfer = null
    if (conv.offer) this.resolveOffer(conv, 'cancelled', { silentDispatch: true })
    conv.status = 'ended'
    conv.endedAt = this.now()
    conv.endedBy = 'user'
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: 'Customer has disconnected. The conversation has ended.' })
    this.releaseAgent(conv)
    this.pushConversation(conv)
    this.pushQueuePositions()
    this.dispatch()
  }

  transfer(socket, { convId, toAgent }) {
    const session = this.sessions.get(socket.sessionToken)
    const conv = this.conversations.get(convId)
    const fromAgent = session && this.agents.get(session.username)
    if (!fromAgent || !conv || conv.agentUsername !== fromAgent.username) return
    if (conv.status !== 'active') {
      this.send(socket, { type: 'transfer_result', convId, ok: false, message: 'A transfer is already in progress.' })
      return
    }
    const target = this.agents.get(toAgent)
    if (!target || target.username === fromAgent.username || this.effectiveAgentStatus(target) !== 'available' || target.pendingOfferConvId) {
      this.send(socket, { type: 'transfer_result', convId, ok: false, message: 'That agent is no longer available. Please choose another agent.' })
      return
    }
    conv.status = 'transferring'
    conv.transfer = { fromAgentUsername: fromAgent.username, fromAgentName: fromAgent.name, toAgentUsername: target.username, toAgentName: target.name }
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'user', text: 'This conversation is being transferred to another agent.', key: 'transferring' })
    this.addMessage(conv, { kind: 'system', senderName: 'System', audience: 'agent', text: `Transfer requested to ${target.name}. Waiting for them to accept...` })
    this.makeOffer(conv, target, { canDecline: true })
    this.pushConversation(conv)
  }

  // ---------- dispatcher ----------

  handle(socket, msg) {
    switch (msg.type) {
      case 'login': {
        const result = this.login(socket, msg)
        if (result.error) this.send(socket, { type: 'login_error', message: result.error })
        return
      }
      case 'resume': {
        const result = this.resume(socket, msg)
        if (result.error) this.send(socket, { type: 'resume_error', message: result.error })
        return
      }
      case 'logout':
        return this.logout(socket)
      case 'set_status':
        return this.setAgentReadiness(socket, msg.status)
      case 'request_agent':
        return this.requestAgent(socket, msg)
      case 'cancel_request':
        return this.cancelRequest(socket, msg)
      case 'accept_offer':
        return this.acceptOffer(socket, msg)
      case 'decline_offer':
        return this.declineOffer(socket, msg)
      case 'send_message':
        return this.sendMessage(socket, msg)
      case 'typing':
        return this.typing(socket, msg)
      case 'end_conversation':
        return this.endConversation(socket, msg)
      case 'transfer':
        return this.transfer(socket, msg)
      case 'ping':
        return this.send(socket, { type: 'pong' })
      default:
        this.send(socket, { type: 'error', message: `Unknown message type: ${msg.type}` })
    }
  }
}
