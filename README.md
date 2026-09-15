# help-center-hub

Two front-ends, one deployable service:

| App | Route | Who | What |
| --- | --- | --- | --- |
| **Swift Payments** | `/swift` | Customers | Banking dashboard with a "Chat with Us" chatbot (static flows) that can hand off to a live agent |
| **Avengers Hub** | `/avengers` | Agents | Agent desktop: availability, incoming-request popup (accept/decline), case view, chat, transfer, transcript |

Both apps are served by a tiny Express + WebSocket server (`server/`) that keeps all state in memory — no database. Open the two routes in separate browser windows (or an incognito window) to see a customer and agents talking in real time.

## Demo accounts

| App | Username | Password | Name |
| --- | --- | --- | --- |
| Swift Payments | `user1` | `Swift@123` | Peter Parker |
| Swift Payments | `user2` | `Swift@123` | Wanda Maximoff |
| Avengers Hub | `agent1` | `Avengers@123` | Steve Rogers |
| Avengers Hub | `agent2` | `Avengers@123` | Natasha Romanoff |
| Avengers Hub | `agent3` | `Avengers@123` | Bruce Banner |

Each account can be logged in from one window at a time; a second login for the same account is rejected. Sessions are stored per role in `sessionStorage`, so a customer and an agent can share the same browser as long as they use different tabs/windows.

## Run locally

```bash
npm install
npm run dev        # server on :3000 (with --watch) + Vite client on :5173
```

Open http://localhost:5173/swift and http://localhost:5173/avengers. The Vite dev server proxies `/api` and `/ws` to the Node server.

Production-style run:

```bash
npm run build      # builds client/dist
npm start          # serves client/dist + /ws on PORT (default 3000)
```

Checks:

```bash
npm run typecheck
npm run lint
node scripts/smoke.mjs   # protocol-level end-to-end test against a running server (PORT / BASE_URL)
```

## Deploy to Render

`render.yaml` defines a single Node web service: build `npm install && npm run build`, start `npm start`, health check `/api/health`. Create a new **Blueprint** on Render pointing at this repo and it will pick it up. Because state is in memory, run a single instance (the free plan is fine) — a restart clears conversations.

## Chatbot flow (Swift Payments)

- Language can be chosen (English, Spanish, French, Chinese, German) on the dashboard **before** launching the chat; the selector locks once the chat is opened. Bot prompts, option labels, static responses and system messages are all localised; agents always see the English contact reason plus the customer's language.
- Main menu: Payments · Reports or Statements · User Entitlements or Access · Claims · Help with something else. Free text is also matched to these intents.
- Payments → Existing Payments (asks for a reference number, validates it, 3 attempts) / New Payments (static answer with link).
- Every static answer is followed by "Can I help you with anything else?" → **Yes** (main menu) · **Chat With Agent** (route to agent) · **No** (rating + feedback survey, thank-you, chat ends).
- "Help with something else" / "Chat With Agent": if any agent is online the customer is queued and sees their position and estimated wait; otherwise "No agents are available at the moment".
- Previously shown option buttons are hidden once a choice is made; only the chosen text stays in the history. System messages are rendered centred.
- The customer can end the chat from the ⋮ menu and download a transcript (`.txt`) that includes bot, agent and system messages.

## Agent flow (Avengers Hub)

- Agents toggle **Available / Away** in the top bar. Requests are offered to one available agent at a time (30 s timeout).
- The popup has **Accept** and **Decline**. If an agent declines, the next agent receives the same request with Decline disabled.
- Accepting creates a case number (`I-YYMMDD-CHT000001`, unique per day) and connects both sides; the customer sees "You're connected with *agent*. Thanks for your patience."
- The chat ⋮ menu offers **Transfer conversation** (lists available agents; history is preserved; customer sees "This conversation is being transferred to another agent."), **End conversation** and **Download transcript**.
- If the agent's browser closes/disconnects for more than a few seconds while connected, the customer sees "Agent disconnected, this conversation is being requeued on priority." and the conversation is offered to the next available agent ahead of the queue.

## Project layout

```
server/           Express + ws server (index.js), in-memory hub (hub.js), demo accounts
client/src/lib    shared types, WebSocket client, transcript helper
client/src/swift  Swift Payments (login, dashboard, ChatWidget, botFlow, i18n)
client/src/avengers  Avengers Hub (login, AgentDesktop, OfferPopup, CaseView, TransferModal)
scripts/smoke.mjs protocol smoke test
render.yaml       Render blueprint (one Node web service)
```