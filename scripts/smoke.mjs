// Protocol-level smoke test against a running server: node scripts/smoke.mjs [ws://localhost:3000/ws]
import WebSocket from 'ws'

const URL = process.argv[2] ?? 'ws://localhost:3000/ws'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

class Client {
  constructor(label) {
    this.label = label
    this.inbox = []
    this.ws = new WebSocket(URL)
    this.ws.on('message', (raw) => this.inbox.push(JSON.parse(raw.toString())))
    this.ready = new Promise((r) => this.ws.on('open', r))
  }
  send(msg) {
    this.ws.send(JSON.stringify(msg))
  }
  async waitFor(pred, timeout = 3000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const idx = this.inbox.findIndex(pred)
      if (idx >= 0) return this.inbox.splice(idx, 1)[0]
      await sleep(25)
    }
    throw new Error(`${this.label}: timed out waiting; inbox=${JSON.stringify(this.inbox.map((m) => m.type + ":" + (m.conversation?.status ?? "")))}`)
  }
  close() {
    this.ws.close()
  }
}

let failures = 0
const check = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
  if (!cond) failures += 1
}

const login = async (c, role, username, password) => {
  await c.ready
  c.send({ type: 'login', role, username, password })
  return c.waitFor((m) => m.type === 'session' || m.type === 'login_error')
}

const bad = new Client('bad')
check((await login(bad, 'user', 'user1', 'nope')).type === 'login_error', 'invalid password rejected')
bad.close()

const user = new Client('user1')
check((await login(user, 'user', 'user1', 'Swift@123')).type === 'session', 'user1 logs in')

const dup = new Client('dup')
check((await login(dup, 'user', 'user1', 'Swift@123')).type === 'login_error', 'duplicate user login rejected')
dup.close()

user.send({ type: 'request_agent', history: [{ kind: 'bot', text: 'Hi' }], reason: 'Help with something else' })
check((await user.waitFor((m) => m.type === 'no_agents')).type === 'no_agents', 'no agents online -> no_agents')

const a1 = new Client('agent1')
const a2 = new Client('agent2')
const a3 = new Client('agent3')
await login(a1, 'agent', 'agent1', 'Avengers@123')
await login(a2, 'agent', 'agent2', 'Avengers@123')
await login(a3, 'agent', 'agent3', 'Avengers@123')
a1.send({ type: 'set_status', status: 'available' })
a2.send({ type: 'set_status', status: 'available' })
await sleep(100)
a1.inbox.length = a2.inbox.length = a3.inbox.length = 0

user.send({ type: 'request_agent', history: [{ kind: 'bot', text: 'Hi' }, { kind: 'user', text: 'Chat With Agent' }], reason: 'Chat with agent' })
const queued = await user.waitFor((m) => m.type === 'queue_update')
check(queued.position === 1 && queued.waitMinutes === 1, 'user is number 1 in queue')
const offer1 = await a1.waitFor((m) => m.type === 'offer')
check(offer1.offer.canDecline === true, 'agent1 receives offer with decline enabled')

a1.send({ type: 'decline_offer', convId: offer1.offer.convId })
const offer2 = await a2.waitFor((m) => m.type === 'offer')
check(offer2.offer.canDecline === false, 'agent2 receives offer with decline disabled after agent1 declined')
a2.send({ type: 'decline_offer', convId: offer2.offer.convId })
check((await a2.waitFor((m) => m.type === 'error')).message.includes('cannot be declined'), 'agent2 cannot decline')

a2.send({ type: 'accept_offer', convId: offer2.offer.convId })
const active = await user.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'active')
check(/^I-\d{6}-CHT\d{6}$/.test(active.conversation.caseNumber), `case number assigned ${active.conversation.caseNumber}`)
check(active.conversation.messages.some((m) => m.kind === 'system' && m.text === "You're connected with Natasha Romanoff. Thanks for your patience."), 'user sees connected system message')
const agentView = await a2.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'active')
check(agentView.conversation.messages.some((m) => m.text === 'Customer has connected.'), 'agent sees customer connected')
check(agentView.conversation.messages.some((m) => m.kind === 'bot' && m.text === 'Hi'), 'bot history carried to agent')

user.send({ type: 'send_message', convId: active.conversation.id, text: 'Hello agent' })
const got = await a2.waitFor((m) => m.type === 'conversation' && m.conversation.messages.some((x) => x.text === 'Hello agent'))
check(Boolean(got), 'agent receives user message')
a2.send({ type: 'send_message', convId: active.conversation.id, text: '   ' })
await sleep(100)
check(!user.inbox.some((m) => m.type === 'conversation' && m.conversation.messages.some((x) => x.text.trim() === '')), 'blank message ignored')

// transfer to agent3 (away) should fail, to agent1 should succeed
a2.send({ type: 'transfer', convId: active.conversation.id, toAgent: 'agent3' })
check((await a2.waitFor((m) => m.type === 'transfer_result')).ok === false, 'transfer to away agent rejected')
a2.send({ type: 'transfer', convId: active.conversation.id, toAgent: 'agent1' })
const tOffer = await a1.waitFor((m) => m.type === 'offer')
check(tOffer.offer.isTransfer && tOffer.offer.fromAgentName === 'Natasha Romanoff', 'agent1 receives transfer offer')
const transferring = await user.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'transferring')
check(transferring.conversation.messages.some((m) => m.text === 'This conversation is being transferred to another agent.'), 'user sees transfer system message')
a1.send({ type: 'accept_offer', convId: tOffer.offer.convId })
const closed = await a2.waitFor((m) => m.type === 'conversation_closed')
check(closed.reason === 'transferred', 'agent2 conversation closed as transferred')
const afterTransfer = await a1.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'active')
check(afterTransfer.conversation.messages.some((x) => x.text === 'Hello agent'), 'history intact after transfer')
check(afterTransfer.conversation.caseNumber === active.conversation.caseNumber, 'same case number after transfer')

// agent1 closes browser -> requeue on priority -> agent2 gets offer
a2.send({ type: 'set_status', status: 'available' })
a1.close()
const requeued = await user.waitFor((m) => m.type === 'conversation' && m.conversation.messages.some((x) => x.text === 'Agent disconnected, this conversation is being requeued on priority.'), 8000)
check(Boolean(requeued), 'user sees agent disconnected message')
const offer3 = await a2.waitFor((m) => m.type === 'offer', 3000)
check(offer3.offer.priority === true, 'agent2 gets priority offer after disconnect')
a2.send({ type: 'accept_offer', convId: offer3.offer.convId })
await a2.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'active')

a2.send({ type: 'end_conversation', convId: active.conversation.id })
const ended = await user.waitFor((m) => m.type === 'conversation' && m.conversation.status === 'ended')
check(ended.conversation.messages.some((m) => m.text.includes('has ended the conversation')), 'user sees end message')

for (const c of [user, a2, a3]) c.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
