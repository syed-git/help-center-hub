export type Role = 'user' | 'agent'

export type MessageKind = 'user' | 'agent' | 'bot' | 'system'

export interface ChatMessage {
  id: string
  kind: MessageKind
  senderName: string
  text: string
  ts: string
  /** Quick-reply buttons shown under a bot message until one is chosen. */
  options?: string[]
  optionsUsed?: boolean
  link?: { label: string; href: string }
  /** Stable identifier for server-generated system messages so clients can localise them. */
  key?: string
  params?: Record<string, string>
}

export type ConversationStatus = 'queued' | 'offering' | 'active' | 'transferring' | 'ended'

export interface Conversation {
  id: string
  caseNumber: string | null
  userUsername: string
  userName: string
  userEmail: string
  userPhone: string
  userAddress: string
  customerId: string
  agentUsername: string | null
  agentName: string | null
  status: ConversationStatus
  priority: boolean
  reason: string
  language: string
  createdAt: string
  queuedAt: string
  acceptedAt?: string
  endedAt: string | null
  endedBy: Role | null
  previousAgents: { username: string; name: string; until: string }[]
  transfer: { toAgentName: string; fromAgentName: string } | null
  offerPending: boolean
  messages: ChatMessage[]
}

export interface Session {
  token: string
  role: Role
  username: string
  name: string
  firstName?: string
  email?: string
  phone?: string
  address?: string
  customerId?: string
}

export type AgentStatus = 'available' | 'away' | 'busy' | 'reconnecting' | 'offline'

export interface AgentInfo {
  username: string
  name: string
  status: AgentStatus
  activeConvId: string | null
  pendingOfferConvId: string | null
}

export interface HubState {
  agents: AgentInfo[]
  queue: { id: string; userName: string; status: ConversationStatus; priority: boolean; queuedAt: string; offeredTo: string | null }[]
  activeCount: number
  endedCount: number
}

export interface Offer {
  convId: string
  customerName: string
  reason: string
  language: string
  canDecline: boolean
  expiresAt: string
  isTransfer: boolean
  fromAgentName: string | null
  priority: boolean
}

export type ServerEvent =
  | { type: 'session'; session: Session }
  | { type: 'login_error'; message: string }
  | { type: 'resume_error'; message: string }
  | { type: 'error'; message: string }
  | { type: 'conversation'; conversation: Conversation }
  | { type: 'conversation_closed'; convId: string; reason: 'transferred' | 'ended'; message: string; conversation: Conversation }
  | { type: 'queue_update'; convId: string; position: number; waitMinutes: number }
  | { type: 'no_agents'; message: string }
  | { type: 'offer'; offer: Offer }
  | { type: 'offer_cancelled'; convId: string; reason: string }
  | { type: 'transfer_result'; convId: string; ok: boolean; message: string }
  | { type: 'hub_state'; state: HubState }
  | { type: 'typing'; convId: string; from: Role; name: string; isTyping: boolean }
  | { type: 'pong' }

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'
